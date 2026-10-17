import { embeddedDmdVariant, getEmbeddedDmdDoc } from "../runtime/embedded-dmd";
import {
  findOriginalDocumentationHome,
  type HomeDocumentInput,
  type ResolvedHome,
  resolveDocumentationHome,
} from "../runtime/home";
import {
  collectVariants,
  defaultLocale,
  documentVariant,
  localeConfig,
  localizedDocs,
  localizedSlug,
  localizeTree,
  projectLocales,
  resolveVariant,
  translate,
} from "../runtime/i18n";
import { buildSidebarTree } from "../runtime/loader/auto-indexer";
import { LocalDocLoader } from "../runtime/loader/local-loader";
import { RemoteGithubLoader } from "../runtime/loader/remote-github";
import { RemoteGitlabLoader } from "../runtime/loader/remote-gitlab";
import { type ParsedMarkdown, parseMarkdown } from "../runtime/markdown/parser";
import { createRouter, type HashRouter } from "../runtime/router";
import { DocSearchIndex } from "../runtime/search/search-index";
import type { DocConfig, DocFileItem, SidebarTreeNode } from "../runtime/types";

export interface ActiveDocData extends ParsedMarkdown {
  slug: string;
  title: string;
  rawContent: string;
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
  locale = $state("en");
  contentLocale = $state("en");
  sourcePath = $state("");
  private corpus: DocFileItem[] = [];
  private sourceTree: SidebarTreeNode[] = [];
  private knownFiles: string[] = [];
  get viewConfig(): DocConfig | null {
    return this.config ? localeConfig(this.config, this.locale) : null;
  }

  t(key: Parameters<typeof translate>[1]): string {
    return translate(this.locale, key);
  }

  private get preferenceKey(): string {
    return `dmd-locale:${this.basePath}:${this.config?.name ?? ""}`;
  }

  hasTranslation(locale: string): boolean {
    if (embeddedDmdVariant(this.currentSlug, this.config))
      return ["en", "pt-BR", "es", "fr", "de", "zh-CN"].includes(locale);
    const id = documentVariant(this.currentSlug, this.config).docId;
    return collectVariants(this.knownFiles, this.config).some((item) => item.docId === id && item.locale === locale);
  }

  selectLocale(locale: string) {
    if (!projectLocales(this.config).some((item) => item.code === locale)) return;
    this.locale = locale;
    try {
      localStorage.setItem(this.preferenceKey, locale);
    } catch {}
    this.refreshLocaleView();
    const embedded = embeddedDmdVariant(this.currentSlug, this.config);
    this.router?.navigate(
      embedded
        ? `${embedded.docId}.${locale.toLowerCase()}`
        : localizedSlug(documentVariant(this.currentSlug, this.config).docId, locale, this.config),
    );
  }

  private refreshLocaleView() {
    if (!this.config) return;
    if (this.router) {
      this.router.locale = this.locale;
      this.router.i18nConfig = this.config;
    }
    const docs = localizedDocs(this.corpus, this.locale, this.config);
    this.allDocs = docs;
    this.searchIndex.clear();
    this.searchIndex.addDocs(docs);
    const view = localeConfig(this.config, this.locale);
    const tree = view.sidebar ? buildSidebarTree([], {}, view.sidebar) : this.sourceTree;
    this.tree = localizeTree(tree, docs, this.locale, this.config);
  }

  private physicalSource(slug: string): string | undefined {
    const embedded = embeddedDmdVariant(slug, this.config);
    if (embedded) return embedded.path;
    const variant = resolveVariant(this.knownFiles, slug, this.config);
    return variant?.path;
  }
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
  isEditorOpen = $state(false);
  /**
   * True only when the dev server explicitly grants editor access
   * (`window.__DOCMEDOWN_DEV__.editor`). Built static sites and offline
   * bundles never set this, so the editor stays unavailable there even when
   * `editor.enabled` is true in docs.json.
   */
  editorAllowedByServer = $state(false);
  /** Effective editor availability: config flag AND dev-server grant. */
  get editorAvailable(): boolean {
    return (this.config?.editor?.enabled ?? true) && this.editorAllowedByServer;
  }
  serverMode = $state<"production" | "preview">("production");
  hasPreviewChanges = $state(false);

  isScrolled = $state(false);
  activeTagModal = $state<string | null>(null);
  allDocs = $state<DocFileItem[]>([]);

  openTagModal(tag: string) {
    this.activeTagModal = tag.replace(/^#/, "").trim();
  }

  closeTagModal() {
    this.activeTagModal = null;
  }

  getDocsWithTag(tag: string): DocFileItem[] {
    const cleanTag = tag.replace(/^#/, "").toLowerCase().trim();
    if (!cleanTag) return [];
    return this.allDocs.filter((d) => d.frontmatter?.tags?.some((t) => t.toLowerCase().trim() === cleanTag));
  }

  getAllTags(): Array<{ tag: string; count: number }> {
    const counts = new Map<string, number>();
    for (const d of this.allDocs) {
      if (Array.isArray(d.frontmatter?.tags)) {
        for (const t of d.frontmatter.tags) {
          const clean = t.toLowerCase().trim();
          if (clean) counts.set(clean, (counts.get(clean) || 0) + 1);
        }
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  getPossiblePaths(
    crumbIndex: number,
    _crumbSegment?: string,
  ): Array<{ slug: string; title: string; category?: string; readingTimeMinutes?: number }> {
    const results: Array<{ slug: string; title: string; category?: string; readingTimeMinutes?: number }> = [];
    const seen = new Set<string>();

    const addDoc = (slug: string, title: string, category?: string, readingTimeMinutes?: number) => {
      if (!seen.has(slug)) {
        seen.add(slug);
        results.push({ slug, title, category, readingTimeMinutes });
      }
    };

    // If index 0 (Root "Docs"): return all root docs and first doc of sections
    if (crumbIndex === 0) {
      for (const d of this.allDocs) {
        addDoc(d.slug, d.title || d.slug, d.category || d.frontmatter?.category, d.readingTimeMinutes);
      }
      for (const d of this.flatDocs) {
        addDoc(d.slug, d.title);
      }
      return results;
    }

    // Crumb > 0: find docs matching the directory / section prefix
    const slugParts = this.currentSlug.split("/").filter(Boolean);
    const prefixParts = slugParts.slice(0, crumbIndex);
    const prefix = prefixParts.join("/");

    if (prefix) {
      for (const d of this.allDocs) {
        if (d.slug.startsWith(`${prefix}/`) || d.slug === prefix) {
          addDoc(d.slug, d.title || d.slug, d.category || d.frontmatter?.category, d.readingTimeMinutes);
        }
      }
      for (const d of this.flatDocs) {
        if (d.slug.startsWith(`${prefix}/`) || d.slug === prefix) {
          addDoc(d.slug, d.title);
        }
      }
    }

    // If only 1 result or fewer (e.g. leaf doc like showcase or custom-components),
    // fallback to sibling docs under the parent directory/section so hovering always
    // shows navigable destinations in the current context.
    if (results.length <= 1) {
      const parentParts = slugParts.slice(0, Math.max(0, crumbIndex - 1));
      const parentPrefix = parentParts.join("/");
      if (parentPrefix) {
        for (const d of this.allDocs) {
          if (d.slug.startsWith(`${parentPrefix}/`) || d.slug === parentPrefix) {
            addDoc(d.slug, d.title || d.slug, d.category || d.frontmatter?.category, d.readingTimeMinutes);
          }
        }
        for (const d of this.flatDocs) {
          if (d.slug.startsWith(`${parentPrefix}/`) || d.slug === parentPrefix) {
            addDoc(d.slug, d.title);
          }
        }
      } else {
        // Root siblings (e.g. README, showcase)
        for (const d of this.allDocs) {
          if (!d.slug.includes("/")) {
            addDoc(d.slug, d.title || d.slug, d.category || d.frontmatter?.category, d.readingTimeMinutes);
          }
        }
        for (const d of this.flatDocs) {
          if (!d.slug.includes("/")) {
            addDoc(d.slug, d.title);
          }
        }
        // If still fewer than 2, offer all top docs
        if (results.length <= 1) {
          for (const d of this.allDocs) {
            addDoc(d.slug, d.title || d.slug, d.category || d.frontmatter?.category, d.readingTimeMinutes);
          }
          for (const d of this.flatDocs) {
            addDoc(d.slug, d.title);
          }
        }
      }
    }

    return results;
  }

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
    if (embeddedDmdVariant(slug, this.config)) {
      const explicit = /\.[^./]+$/.test(slug);
      if (!explicit) slug = `${slug}.${this.locale.toLowerCase()}`;
    }
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
    this.locale = defaultLocale(initialConfig);
    this.contentLocale = this.locale;
    this.knownFiles = [];
    this.corpus = [];
    this.sourceTree = [];
    this.searchIndex.clear();
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
    this.router.i18nConfig = initialConfig;
    const initial = this.router.getCurrentRoute();
    const initialVariant = documentVariant(initial.slug, initialConfig);
    this.locale = initialVariant.locale;
    if (
      typeof window !== "undefined" &&
      initialVariant.docId === documentVariant(initialConfig.rootDoc || "README.md", initialConfig).docId &&
      !initialVariant.explicit &&
      !window.location.hash &&
      !window.location.pathname.match(/\.[a-z]{2}(?:-|\/|$)/i)
    ) {
      try {
        const saved = localStorage.getItem(this.preferenceKey);
        if (saved && projectLocales(initialConfig).some((item) => item.code === saved)) this.locale = saved;
      } catch {}
    }
    initial.slug = localizedSlug(initialVariant.docId, this.locale, initialConfig);
    this.router.locale = this.locale;
    this.currentSlug = initial.slug;
    if (typeof window !== "undefined" && initial.slug !== this.router.getCurrentRoute().slug) {
      this.router.navigate(initial.slug);
    }
    this.unsubscribeRouter = this.router.subscribe((route) => {
      if (epoch !== this.epoch) return;
      const slugChanged = route.slug !== this.currentSlug;
      this.locale = documentVariant(route.slug, this.config).locale;
      this.refreshLocaleView();
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

    await this.initTree(epoch);
    if (epoch !== this.epoch) return;
    if (!this.renderDocNow(initial.slug, epoch)) {
      await this.loadDoc(initial.slug, epoch);
    }
    if (typeof window !== "undefined") {
      (window as any).__DOCMEDOWN_STORE__ = this;
    }
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
        if (manifest.tree) this.sourceTree = manifest.tree;
        if (manifest.docs) {
          this.corpus = manifest.docs;
          this.knownFiles = manifest.docs.map((doc) => doc.path);
          this.docPaths = manifest.docs.map((doc) => ({ slug: doc.slug, path: doc.path }));
        }
        this.refreshLocaleView();
        return;
      }

      // 2. Remote GitHub repository mode
      if (this.remoteGithub) {
        const files = await this.remoteGithub.discoverFiles();
        if (epoch !== this.epoch) return;
        this.initRemoteVariants(files, sidebar);
        this.docPaths = files.map((file) => ({ path: file }));
        return;
      }

      // 3. Remote GitLab repository mode
      if (this.remoteGitlab) {
        const files = await this.remoteGitlab.discoverFiles();
        if (epoch !== this.epoch) return;
        this.initRemoteVariants(files, sidebar);
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

  private initRemoteVariants(files: string[], sidebar?: DocConfig["sidebar"]) {
    this.knownFiles = files;
    const variants = collectVariants(files, this.config);
    this.corpus = variants.map((item) => ({ ...item, title: item.docId, frontmatter: {}, headings: [] }));
    const logicalFiles = [...new Set(variants.map((item) => `${item.docId}.md`))];
    this.sourceTree = buildSidebarTree(logicalFiles, {}, sidebar);
    this.refreshLocaleView();
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

    const parsed = parseMarkdown(rawContent, slug, this.config ?? undefined);
    this.parseCache.set(slug, { source: rawContent, parsed });
    if (this.parseCache.size > this.parseCacheLimit) {
      const oldestSlug = this.parseCache.keys().next().value;
      if (oldestSlug !== undefined) this.parseCache.delete(oldestSlug);
    }
    return parsed;
  }

  /** Applies a resolved document — the synchronous tail shared by both load paths. */
  private renderDoc(rawContent: string, slug: string, resetScroll: boolean = true): void {
    this.sourcePath = this.physicalSource(slug) ?? `${slug}.md`;
    this.contentLocale =
      embeddedDmdVariant(slug, this.config)?.locale ?? documentVariant(this.sourcePath, this.config).locale;
    const parsed = this.parseMarkdownCached(rawContent, slug);
    const title = parsed.frontmatter.title || parsed.headings[0]?.text || slug;

    this.currentDoc = { ...parsed, slug, title, rawContent };
    const corpusDoc = this.corpus.find((item) => item.path === this.sourcePath);
    if (corpusDoc)
      Object.assign(corpusDoc, {
        content: rawContent,
        frontmatter: parsed.frontmatter,
        headings: parsed.headings,
        title,
      });
    this.error = null;
    this.isLoading = false;
    this.isNavigating = false;
    this.searchIndex.addDoc({
      slug,
      path: this.sourcePath,
      title,
      frontmatter: parsed.frontmatter,
      headings: parsed.headings,
      content: rawContent,
    });
    if (!this.allDocs.some((d) => d.slug === slug)) {
      this.allDocs.push({
        slug,
        path: `${slug}.md`,
        title,
        frontmatter: parsed.frontmatter,
        headings: parsed.headings,
        readingTimeMinutes: parsed.readingTimeMinutes,
      });
    }
    // Navigation resets scroll; in-place HMR/editor updates must preserve it.
    if (resetScroll) {
      this.resetScroll();
    }
  }

  public toggleEditor(open?: boolean): void {
    this.isEditorOpen = open !== undefined ? open : !this.isEditorOpen;
  }

  public updateDocContent(content: string, slug: string = this.currentSlug, resetScroll: boolean = false): void {
    const physical = this.physicalSource(slug) ?? slug;
    this.localLoader.setDocContent(physical, content);
    this.remoteCache.delete(slug);
    const entry = this.corpus.find(
      (item) =>
        item.path === physical || item.path.replace(/\.(md|mdx)$/i, "") === physical.replace(/\.(md|mdx)$/i, ""),
    );
    if (entry) entry.content = content;
    for (const cached of this.remoteCache.keys()) {
      if (this.physicalSource(cached) === entry?.path) this.remoteCache.delete(cached);
    }
    this.localLoader.setDocContent(slug, content);
    this.parseCache.delete(slug);
    this.refreshLocaleView();

    if (this.currentSlug === slug) {
      const parsed = parseMarkdown(content, slug, this.config ?? undefined);
      const title = parsed.frontmatter.title || parsed.headings[0]?.text || slug;
      this.currentDoc = { ...parsed, slug, title, rawContent: content };
      this.searchIndex.addDoc({
        slug,
        path: `${slug}.md`,
        title,
        frontmatter: parsed.frontmatter,
        headings: parsed.headings,
        content,
      });
      if (resetScroll) {
        this.resetScroll();
      }
    }
  }

  public applyHmrUpdate(slug: string, content: string): void {
    this.updateDocContent(content, slug, false);
    const physical = this.physicalSource(this.currentSlug);
    if (physical && physical.replace(/\.(md|mdx)$/i, "") === slug.replace(/\.(md|mdx)$/i, "")) {
      // Preserve scroll across the in-place re-render: the article DOM is
      // rebuilt, which can collapse scrollHeight and yank the reader to top.
      const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
      this.renderDoc(content, this.currentSlug, false);
      if (typeof window !== "undefined") {
        const raf =
          typeof requestAnimationFrame === "function"
            ? requestAnimationFrame
            : (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
        raf(() => {
          try {
            const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            window.scrollTo(0, Math.min(scrollY, max));
          } catch {
            // never break HMR on scroll restore
          }
        });
      }
    }
    if (typeof console !== "undefined") {
      console.log(`[DocMeDown HMR] In-place update applied for ${slug}`);
    }
  }

  public updateConfig(newConfig: Partial<DocConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...newConfig };
      this.parseCache.clear();
      this.refreshLocaleView();
    }
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

    const embedded = embeddedDmdVariant(slug, this.config);
    if (embedded) {
      this.renderDoc(getEmbeddedDmdDoc(embedded.docId, embedded.locale)!, slug);
      return true;
    }

    const cachedRemote = this.remoteCache.get(slug);
    if (cachedRemote !== undefined) {
      this.renderDoc(cachedRemote, slug);
      return true;
    }

    if (this.remoteGithub || this.remoteGitlab) return false;

    const physical = this.physicalSource(slug);
    if (this.knownFiles.length && !physical && !slug.startsWith("DMD")) return false;
    const rawContent = this.localLoader.peekDocContent(physical ?? slug);
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
      const physical = this.physicalSource(slug);
      if (this.knownFiles.length && !physical && !slug.startsWith("DMD")) {
        this.error = this.t("unavailable");
        this.currentDoc = null;
        this.isLoading = false;
        this.isNavigating = false;
        return;
      }
      const source = physical ?? slug;

      if (this.remoteGithub) {
        rawContent = await this.remoteGithub.fetchDocContent(source);
      } else if (this.remoteGitlab) {
        rawContent = await this.remoteGitlab.fetchDocContent(source);
      } else {
        rawContent = await this.localLoader.fetchDocContent(source, this.basePath);
      }

      if (epoch !== this.epoch || slug !== this.currentSlug) return;

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
