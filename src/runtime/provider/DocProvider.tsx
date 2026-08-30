import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  findOriginalDocumentationHome,
  type HomeDocumentInput,
  type ResolvedHome,
  resolveDocumentationHome,
} from "../home";
import { buildSidebarTree } from "../loader/auto-indexer";
import { LocalDocLoader } from "../loader/local-loader";
import { RemoteGithubLoader } from "../loader/remote-github";
import { RemoteGitlabLoader } from "../loader/remote-gitlab";
import { type ParsedMarkdown, parseMarkdown } from "../markdown/parser";
import { HashRouter, type RouteInfo } from "../router";
import { DocSearchIndex } from "../search/search-index";
import type { DocConfig, SidebarTreeNode } from "../types";

export interface ActiveDocData extends ParsedMarkdown {
  slug: string;
  title: string;
}

export interface NavDocItem {
  slug: string;
  title: string;
}

interface DocContextType {
  config: DocConfig;
  router: HashRouter;
  currentSlug: string;
  currentDoc: ActiveDocData | null;
  tree: SidebarTreeNode[];
  searchIndex: DocSearchIndex;
  isLoading: boolean;
  error: string | null;
  prevDoc: NavDocItem | null;
  nextDoc: NavDocItem | null;
  home: ResolvedHome | null;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  navigate: (slug: string, anchor?: string) => void;
}

const DocContext = createContext<DocContextType | null>(null);

export const useDoc = () => {
  const ctx = useContext(DocContext);
  if (!ctx) throw new Error("useDoc must be used within DocProvider");
  return ctx;
};

interface DocProviderProps {
  initialConfig: DocConfig;
  basePath?: string;
  children: React.ReactNode;
}

export const DocProvider: React.FC<DocProviderProps> = ({ initialConfig, basePath = "", children }) => {
  const [config, setConfig] = useState<DocConfig>(initialConfig);
  const [currentSlug, setCurrentSlug] = useState<string>("");
  const [currentDoc, setCurrentDoc] = useState<ActiveDocData | null>(null);
  const [tree, setTree] = useState<SidebarTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [docPaths, setDocPaths] = useState<HomeDocumentInput[]>([]);
  const [originalHome, setOriginalHome] = useState<ResolvedHome | null>(null);

  const router = useMemo(() => new HashRouter(config.rootDoc || "README.md"), [config.rootDoc]);
  const searchIndex = useMemo(() => new DocSearchIndex(), []);
  const localLoader = useMemo(() => new LocalDocLoader(), []);
  const remoteGithub = useMemo(
    () => (config.source?.type === "github" ? new RemoteGithubLoader(config.source) : null),
    [config.source],
  );
  const remoteGitlab = useMemo(
    () => (config.source?.type === "gitlab" ? new RemoteGitlabLoader(config.source) : null),
    [config.source],
  );

  // Handle route changes
  useEffect(() => {
    const handleRoute = (route: RouteInfo) => {
      setCurrentSlug(route.slug);
      setIsMobileSidebarOpen(false);
    };

    const initial = router.getCurrentRoute();
    setCurrentSlug(initial.slug);

    const unsub = router.subscribe(handleRoute);
    return () => unsub();
  }, [router]);

  // Discover / index files
  useEffect(() => {
    let isCancelled = false;

    async function initTree() {
      try {
        // 1. Check if manifest is available
        const manifest = await localLoader.fetchManifest(basePath);
        if (isCancelled) return;

        if (manifest && !remoteGithub && !remoteGitlab) {
          if (manifest.config) setConfig((prev) => ({ ...prev, ...manifest.config }));
          if (manifest.tree) setTree(manifest.tree);
          if (manifest.docs) {
            searchIndex.addDocs(manifest.docs);
            setDocPaths(manifest.docs.map((doc) => ({ slug: doc.slug, path: doc.path })));
          }
          return;
        }

        // 2. Remote GitHub repository mode
        if (remoteGithub) {
          const files = await remoteGithub.discoverFiles();
          if (isCancelled) return;
          setTree(buildSidebarTree(files, {}, config.sidebar));
          setDocPaths(files.map((file) => ({ path: file })));
          return;
        }

        // 3. Remote GitLab repository mode
        if (remoteGitlab) {
          const files = await remoteGitlab.discoverFiles();
          if (isCancelled) return;
          setTree(buildSidebarTree(files, {}, config.sidebar));
          setDocPaths(files.map((file) => ({ path: file })));
          return;
        }

        // 4. Default fallback tree for local zero-config mode
        setTree(buildSidebarTree(["README.md"], {}, config.sidebar));
        setDocPaths([{ path: "README.md" }]);
      } catch {
        if (!isCancelled) {
          setTree(buildSidebarTree(["README.md"], {}, config.sidebar));
          setDocPaths([{ path: "README.md" }]);
        }
      }
    }

    initTree();

    return () => {
      isCancelled = true;
    };
  }, [config.sidebar, basePath, localLoader, remoteGithub, remoteGitlab, searchIndex]);

  // Documentation inside documentation: when an enclosing DocMeDown manifest is
  // reachable over HTTP, the Home action links to the original documentation.
  useEffect(() => {
    if (config.home) return;
    if (remoteGithub || remoteGitlab) return;
    if (typeof window === "undefined") return;
    if (window.location.protocol !== "http:" && window.location.protocol !== "https:") return;

    let cancelled = false;
    findOriginalDocumentationHome((input) => fetch(input))
      .then((resolved) => {
        if (!cancelled && resolved) setOriginalHome(resolved);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [config.home, remoteGithub, remoteGitlab]);

  // Load document content whenever currentSlug changes
  useEffect(() => {
    if (!currentSlug) return;
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    async function fetchDoc() {
      try {
        let rawContent: string | null = null;

        if (remoteGithub) {
          rawContent = await remoteGithub.fetchDocContent(currentSlug);
        } else if (remoteGitlab) {
          rawContent = await remoteGitlab.fetchDocContent(currentSlug);
        } else {
          rawContent = await localLoader.fetchDocContent(currentSlug, basePath);
        }

        if (isCancelled) return;

        if (rawContent !== null) {
          const parsed = parseMarkdown(rawContent, currentSlug);
          const title = parsed.frontmatter.title || parsed.headings[0]?.text || currentSlug;

          const docData: ActiveDocData = {
            ...parsed,
            slug: currentSlug,
            title,
          };

          setCurrentDoc(docData);
          searchIndex.addDoc({
            slug: currentSlug,
            path: `${currentSlug}.md`,
            title,
            frontmatter: parsed.frontmatter,
            headings: parsed.headings,
            content: rawContent,
          });
          setIsLoading(false);

          // Scroll to top or anchor
          const route = router.getCurrentRoute();
          if (route.anchor) {
            setTimeout(() => router.scrollToAnchor(route.anchor), 100);
          } else {
            window.scrollTo({ top: 0, behavior: "instant" as any });
          }
        } else {
          const sourceName = remoteGithub ? "GitHub" : remoteGitlab ? "GitLab" : "this documentation site";
          setError(`Could not load “${currentSlug}” from ${sourceName}.`);
          setIsLoading(false);
        }
      } catch {
        if (!isCancelled) {
          setError("The document source did not respond. Check the connection or try again.");
          setIsLoading(false);
        }
      }
    }

    fetchDoc();

    return () => {
      isCancelled = true;
    };
  }, [currentSlug, remoteGithub, remoteGitlab, localLoader, basePath, router, searchIndex]);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // The Home action targets the original documentation home when one exists,
  // otherwise the resolved home of this documentation corpus.
  const home = useMemo<ResolvedHome | null>(
    () => originalHome ?? resolveDocumentationHome(docPaths, config),
    [originalHome, docPaths, config],
  );

  // Compute linear list of docs for previous/next navigation
  const flatDocs = useMemo(() => {
    const list: NavDocItem[] = [];
    function traverse(nodes: SidebarTreeNode[]) {
      for (const node of nodes) {
        if (!node.isCategory && node.slug) {
          list.push({ slug: node.slug, title: node.title });
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    }
    traverse(tree);
    return list;
  }, [tree]);

  const { prevDoc, nextDoc } = useMemo(() => {
    const currentIndex = flatDocs.findIndex((d) => d.slug === currentSlug);
    if (currentIndex === -1) return { prevDoc: null, nextDoc: null };
    return {
      prevDoc: currentIndex > 0 ? flatDocs[currentIndex - 1] : null,
      nextDoc: currentIndex < flatDocs.length - 1 ? flatDocs[currentIndex + 1] : null,
    };
  }, [flatDocs, currentSlug]);

  const navigate = (slug: string, anchor: string = "") => {
    router.navigate(slug, anchor);
  };

  return (
    <DocContext.Provider
      value={{
        config,
        router,
        currentSlug,
        currentDoc,
        tree,
        searchIndex,
        isLoading,
        error,
        prevDoc,
        nextDoc,
        home,
        isSearchOpen,
        setIsSearchOpen,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        navigate,
      }}
    >
      {children}
    </DocContext.Provider>
  );
};
