import {
  findOriginalDocumentationHome,
  type HomeDocumentInput,
  type ResolvedHome,
  resolveDocumentationHome,
} from "../runtime/home";
import { buildSidebarTree } from "../runtime/loader/auto-indexer";
import { LocalDocLoader } from "../runtime/loader/local-loader";
import { RemoteGithubLoader } from "../runtime/loader/remote-github";
import { RemoteGitlabLoader } from "../runtime/loader/remote-gitlab";
import { type ParsedMarkdown, parseMarkdown } from "../runtime/markdown/parser";
import { createRouter, type HashRouter } from "../runtime/router";
import { DocSearchIndex } from "../runtime/search/search-index";
import type { DocConfig, SidebarTreeNode } from "../runtime/types";

export interface ActiveDocData extends ParsedMarkdown {
  slug: string;
  title: string;
}

export interface NavDocItem {
  slug: string;
  title: string;
}

/** Runs `callback` on the next idle frame, falling back to a macrotask. */
function scheduleIdle(callback: () => void): void {
  const requestIdle = (
    globalThis as { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number }
  ).requestIdleCallback;
  if (typeof requestIdle === "function") requestIdle(callback, { timeout: 2000 });
  else window.setTimeout(callback, 1);
}

/**
 * Runes-based port of the React DocProvider. A single store instance drives
 * the whole reader: configuration, routing, document loading, the sidebar
 * tree, search, and prev/next navigation.
 */
export class DocStore {
  config = $state<DocConfig | null>(null);
  currentSlug = $state("");
  currentDoc = $state<ActiveDocData | null>(null);
  tree = $state<SidebarTreeNode[]>([]);
  isLoading = $state(true);
  /** True while a network navigation is in flight; the current article stays visible. */
  isNavigating = $state(false);
  error = $state<string | null>(null);
  isSearchOpen = $state(false);
  isMobileSidebarOpen = $state(false);

  originalHome = $state<ResolvedHome | null>(null);
  docPaths = $state<HomeDocumentInput[]>([]);
  basePath = "";

  router: HashRouter | null = null;
  readonly searchIndex = new DocSearchIndex();

  private localLoader = new LocalDocLoader();
  private remoteGithub: RemoteGithubLoader | null = null;
  private remoteGitlab: RemoteGitlabLoader | null = null;
  private unsubscribeRouter: (() => void) | null = null;
  private homeCancelled = false;
  private epoch = 0;

  /**
   * Parsed-markdown cache keyed by slug. Rendering a page runs the whole
   * markdown pipeline (marked + Prism + KaTeX + component bodies), which is the
   * most expensive work per navigation. Revisiting a slug — back/forward,
   * sidebar hops, or a same-page anchor change — reuses the parsed result. The
   * raw source is stored alongside so a content change (e.g. a dev rebuild)
   * invalidates the entry instead of serving stale HTML.
   */
  private parseCacheLimit = 50;
  private parseCache = new Map<string, { source: string; parsed: ParsedMarkdown }>();
  /** Remote documents fetched this session, so revisits resolve synchronously. */
  private remoteCache = new Map<string, string>();

  flatDocs = $derived.by<NavDocItem[]>(() => {
    const list: NavDocItem[] = [];
    const traverse = (nodes: SidebarTreeNode[]) => {
      for (const node of nodes) {
        if (!node.isCategory && node.slug) {
          list.push({ slug: node.slug, title: node.title });
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(this.tree);
    return list;
  });

  prevDoc = $derived.by<NavDocItem | null>(() => {
    const index = this.flatDocs.findIndex((d) => d.slug === this.currentSlug);
    if (index <= 0) return null;
    return this.flatDocs[index - 1];
  });

  nextDoc = $derived.by<NavDocItem | null>(() => {
    const index = this.flatDocs.findIndex((d) => d.slug === this.currentSlug);
    if (index === -1 || index >= this.flatDocs.length - 1) return null;
    return this.flatDocs[index + 1];
  });

  home = $derived.by<ResolvedHome | null>(
    () => this.originalHome ?? (this.config ? resolveDocumentationHome(this.docPaths, this.config) : null),
  );

  public navigate(slug: string, anchor: string = "") {
    this.router?.navigate(slug, anchor);
  }

  public destroy() {
    this.unsubscribeRouter?.();
    this.unsubscribeRouter = null;
    this.router?.destroy();
    this.router = null;
    this.homeCancelled = true;
  }

  /** Bootstraps the store. Safe to call again after destroy() (SPA re-mount). */
  public async init(initialConfig: DocConfig, basePath: string = "") {
    const epoch = ++this.epoch;
    this.destroy();

    this.config = initialConfig;
    this.basePath = basePath;
    this.currentDoc = null;
    this.tree = [];
    this.isLoading = true;
    this.isNavigating = false;
    this.error = null;
    this.isSearchOpen = false;
    this.isMobileSidebarOpen = false;
    this.originalHome = null;
    this.docPaths = [];
    this.homeCancelled = false;
    this.parseCache.clear();
    this.parseCacheLimit = 50;
    this.remoteCache.clear();

    this.remoteGithub = initialConfig.source?.type === "github" ? new RemoteGithubLoader(initialConfig.source) : null;
    this.remoteGitlab = initialConfig.source?.type === "gitlab" ? new RemoteGitlabLoader(initialConfig.source) : null;

    this.router = createRouter(initialConfig.rootDoc || "README.md");
    const initial = this.router.getCurrentRoute();
    this.currentSlug = initial.slug;
    this.unsubscribeRouter = this.router.subscribe((route) => {
      if (epoch !== this.epoch) return;
      const slugChanged = route.slug !== this.currentSlug;
      this.currentSlug = route.slug;
      this.isMobileSidebarOpen = false;
      if (slugChanged || !this.currentDoc) {
        // Instant when the target is already in memory; only a real network
        // fetch (remote source, or local HTTP without a prebuilt corpus) falls
        // through to the awaited path.
        if (!this.renderDocNow(route.slug, epoch)) void this.loadDoc(route.slug, epoch);
      } else if (route.anchor) {
        setTimeout(() => this.router?.scrollToAnchor(route.anchor), 100);
      }
    });

    if (!this.renderDocNow(initial.slug, epoch)) {
      await this.loadDoc(initial.slug, epoch);
    }
    void this.initTree(epoch);
    this.initHome(epoch);
    this.warmParseCache(epoch);
  }

  private async initTree(epoch: number) {
    const sidebar = this.config?.sidebar;
    try {
      // 1. Check if a manifest is available
      const manifest = await this.localLoader.fetchManifest(this.basePath);
      if (epoch !== this.epoch) return;

      if (manifest && !this.remoteGithub && !this.remoteGitlab) {
        if (manifest.config) {
          this.config = { ...(this.config as DocConfig), ...manifest.config };
        }
        if (manifest.tree) this.tree = manifest.tree;
        if (manifest.docs) {
          this.searchIndex.addDocs(manifest.docs);
          this.docPaths = manifest.docs.map((doc) => ({ slug: doc.slug, path: doc.path }));
        }
        return;
      }

      // 2. Remote GitHub repository mode
      if (this.remoteGithub) {
        const files = await this.remoteGithub.discoverFiles();
        if (epoch !== this.epoch) return;
        this.tree = buildSidebarTree(files, {}, sidebar);
        this.docPaths = files.map((file) => ({ path: file }));
        return;
      }

      // 3. Remote GitLab repository mode
      if (this.remoteGitlab) {
        const files = await this.remoteGitlab.discoverFiles();
        if (epoch !== this.epoch) return;
        this.tree = buildSidebarTree(files, {}, sidebar);
        this.docPaths = files.map((file) => ({ path: file }));
        return;
      }

      // 4. Default fallback tree for local zero-config mode
      this.tree = buildSidebarTree(["README.md"], {}, sidebar);
      this.docPaths = [{ path: "README.md" }];
    } catch {
      if (epoch !== this.epoch) return;
      this.tree = buildSidebarTree(["README.md"], {}, sidebar);
      this.docPaths = [{ path: "README.md" }];
    }
  }

  /** Returns the parsed document for a slug, reusing a recent parse when the source is unchanged. */
  private parseMarkdownCached(rawContent: string, slug: string): ParsedMarkdown {
    const cached = this.parseCache.get(slug);
    if (cached && cached.source === rawContent) {
      // Refresh LRU position so frequently revisited docs survive eviction.
      this.parseCache.delete(slug);
      this.parseCache.set(slug, cached);
      return cached.parsed;
    }

    const parsed = parseMarkdown(rawContent, slug);
    this.parseCache.set(slug, { source: rawContent, parsed });
    if (this.parseCache.size > this.parseCacheLimit) {
      const oldestSlug = this.parseCache.keys().next().value;
      if (oldestSlug !== undefined) this.parseCache.delete(oldestSlug);
    }
    return parsed;
  }

  /** Applies a resolved document — the synchronous tail shared by both load paths. */
  private renderDoc(rawContent: string, slug: string): void {
    const parsed = this.parseMarkdownCached(rawContent, slug);
    const title = parsed.frontmatter.title || parsed.headings[0]?.text || slug;

    this.currentDoc = { ...parsed, slug, title };
    this.error = null;
    this.isLoading = false;
    this.isNavigating = false;
    this.searchIndex.addDoc({
      slug,
      path: `${slug}.md`,
      title,
      frontmatter: parsed.frontmatter,
      headings: parsed.headings,
      content: rawContent,
    });
    this.resetScroll();
  }

  private resetScroll(): void {
    const route = this.router?.getCurrentRoute();
    if (route?.anchor) {
      setTimeout(() => this.router?.scrollToAnchor(route.anchor), 100);
    } else if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }

  /**
   * Renders a page without awaiting anything when its content is already in
   * memory — the embedded static/offline corpus or a document fetched earlier
   * this session. Returns false when a network request is required so the caller
   * can fall back to `loadDoc`.
   *
   * This is what removes the click-to-paint delay: no `isLoading` flip, no
   * skeleton, no awaited microtask. The page swaps within the same frame.
   */
  private renderDocNow(slug: string, epoch: number): boolean {
    if (epoch !== this.epoch) return true;

    const cachedRemote = this.remoteCache.get(slug);
    if (cachedRemote !== undefined) {
      this.renderDoc(cachedRemote, slug);
      return true;
    }

    if (this.remoteGithub || this.remoteGitlab) return false;

    const rawContent = this.localLoader.peekDocContent(slug);
    if (rawContent === undefined) return false;

    this.renderDoc(rawContent, slug);
    return true;
  }

  private async loadDoc(slug: string, epoch: number) {
    // Only the very first paint shows the skeleton; later network navigations
    // keep the current article on screen behind a slim progress bar.
    if (this.currentDoc) this.isNavigating = true;
    else this.isLoading = true;
    this.error = null;

    try {
      let rawContent: string | null = null;

      if (this.remoteGithub) {
        rawContent = await this.remoteGithub.fetchDocContent(slug);
      } else if (this.remoteGitlab) {
        rawContent = await this.remoteGitlab.fetchDocContent(slug);
      } else {
        rawContent = await this.localLoader.fetchDocContent(slug, this.basePath);
      }

      if (epoch !== this.epoch) return;

      if (rawContent !== null) {
        this.remoteCache.set(slug, rawContent);
        this.renderDoc(rawContent, slug);
      } else {
        const sourceName = this.remoteGithub ? "GitHub" : this.remoteGitlab ? "GitLab" : "this documentation site";
        this.error = `Could not load “${slug}” from ${sourceName}.`;
        this.isLoading = false;
        this.isNavigating = false;
      }
    } catch {
      if (epoch !== this.epoch) return;
      this.error = "The document source did not respond. Check the connection or try again.";
      this.isLoading = false;
      this.isNavigating = false;
    }
  }

  /**
   * Pre-parses the embedded corpus during idle time so the first visit to any
   * page is a synchronous cache hit — this is what makes navigation feel
   * instant, most of all in offline and static builds where the whole corpus is
   * already in memory. Work is time-sliced across idle callbacks so it never
   * competes with interaction, and it aborts as soon as the store re-initialises.
   */
  private warmParseCache(epoch: number) {
    if (this.remoteGithub || this.remoteGitlab || typeof window === "undefined") return;

    const sources = this.localLoader.embeddedDocSources();
    if (!sources) return;
    const entries = Object.entries(sources);
    if (entries.length < 2) return;

    // Fit the (bounded) corpus so a warmed entry is never immediately evicted.
    this.parseCacheLimit = Math.min(Math.max(entries.length, 50), 200);

    let index = 0;
    const runSlice = () => {
      if (epoch !== this.epoch) return;
      const deadline = performance.now() + 6;
      while (index < entries.length && performance.now() < deadline) {
        const [slug, source] = entries[index++];
        this.parseMarkdownCached(source, slug);
      }
      if (index < entries.length) scheduleIdle(runSlice);
    };

    scheduleIdle(runSlice);
  }

  // Documentation inside documentation: when an enclosing DocMeDown manifest is
  // reachable over HTTP, the Home action links to the original documentation.
  private initHome(epoch: number) {
    if (this.config?.home) return;
    if (this.remoteGithub || this.remoteGitlab) return;
    if (typeof window === "undefined") return;
    if (window.location.protocol !== "http:" && window.location.protocol !== "https:") return;

    findOriginalDocumentationHome((input) => fetch(input))
      .then((resolved) => {
        if (epoch === this.epoch && !this.homeCancelled && resolved) {
          this.originalHome = resolved;
        }
      })
      .catch(() => undefined);
  }
}

export const doc = new DocStore();
