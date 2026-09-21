export interface RouteInfo {
  slug: string;
  anchor: string;
  fullPath: string;
}

/** Globals injected by the static-site prerenderer into every generated page. */
export interface StaticRuntimeContext {
  /** Relative prefix from the current page to site-root assets, e.g. "../..". Empty at the site root. */
  base: string;
  /** Slug of the document the current page was prerendered from. */
  slug: string;
}

export function getStaticRuntimeContext(): StaticRuntimeContext | null {
  if (typeof window === "undefined") return null;
  const runtimeWindow = window as any;
  if (typeof runtimeWindow.__DOCMEDOWN_STATIC_SLUG__ !== "string") return null;
  return {
    base: typeof runtimeWindow.__DOCMEDOWN_STATIC_BASE__ === "string" ? runtimeWindow.__DOCMEDOWN_STATIC_BASE__ : "",
    slug: runtimeWindow.__DOCMEDOWN_STATIC_SLUG__,
  };
}

/** True when the current page was prerendered by the static site build. */
export function isStaticRuntime(): boolean {
  return getStaticRuntimeContext() !== null;
}

/** Creates the router appropriate for the current page: pathname routes for prerendered builds, hash routes otherwise. */
export function createRouter(defaultDoc: string = "README.md"): HashRouter {
  return getStaticRuntimeContext() ? new StaticRouter(defaultDoc) : new HashRouter(defaultDoc);
}

/** Joins a site-root-relative asset prefix with a file name ("../..", "_docs.js" → "../../_docs.js"). */
export function joinStaticBase(base: string, file: string): string {
  const cleanBase = base.replace(/\/+$/, "");
  return cleanBase ? `${cleanBase}/${file}` : file;
}

function normalizePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname).replace(/index\.html?$/i, "");
  } catch {
    return pathname.replace(/index\.html?$/i, "");
  }
}

/**
 * Derives the site base URL from the current pathname and the prerendered slug.
 * A slug directory always maps to `<base>/<slug>/index.html` (README maps to
 * `<base>/`), so removing that suffix yields the site base. Works on GitHub
 * Pages project subpaths because only suffixes are inspected.
 */
function deriveUrlBase(pathname: string, slug: string): string {
  const clean = normalizePathname(pathname);
  const suffix = slug === "README" ? "/" : `/${slug}/`;
  if (clean.endsWith(suffix)) {
    return clean.slice(0, clean.length - suffix.length).replace(/\/+$/, "");
  }
  // Unexpected path (server rewrite, custom home shell): fall back to the
  // nearest directory so relative navigation still stays inside the site.
  const directory = clean.replace(/[^/]*$/, "/");
  return directory.replace(/\/+$/, "");
}

export class HashRouter {
  protected listeners: Set<(route: RouteInfo) => void> = new Set();
  protected defaultDoc: string;

  constructor(defaultDoc: string = "README.md") {
    this.defaultDoc = defaultDoc;
    if (typeof window !== "undefined") {
      window.addEventListener("hashchange", this.handleHashChange);
    }
  }

  public destroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("hashchange", this.handleHashChange);
    }
    this.listeners.clear();
  }

  public setDefaultDoc(defaultDoc: string) {
    this.defaultDoc = defaultDoc;
  }

  public getCurrentRoute(): RouteInfo {
    if (typeof window === "undefined") {
      return this.parseHash("");
    }
    return this.parseHash(window.location.hash);
  }

  public parseHash(rawHash: string): RouteInfo {
    let clean = rawHash.replace(/^#\/?/, "").trim();
    let anchor = "";

    const anchorIndex = clean.indexOf("#");
    if (anchorIndex !== -1) {
      anchor = clean.substring(anchorIndex + 1);
      clean = clean.substring(0, anchorIndex);
    }

    // Clean leading and trailing slashes
    clean = clean.replace(/^\/+|\/+$/g, "");

    // Normalize markdown extensions
    let slug = clean;
    if (!slug || slug === "/" || slug === "index" || slug === "README") {
      slug = this.normalizeDocSlug(this.defaultDoc);
    } else {
      slug = this.normalizeDocSlug(slug);
    }

    return {
      slug,
      anchor,
      fullPath: `#/${slug}${anchor ? `#${anchor}` : ""}`,
    };
  }

  public normalizeDocSlug(pathOrSlug: string): string {
    const normalized = pathOrSlug.replace(/^\.?\//, "").replace(/\.(md|mdx|html)$/i, "");
    if (!normalized || normalized === "index" || normalized === "README") {
      return "README";
    }
    return normalized;
  }

  public navigate(path: string, anchor: string = "") {
    if (typeof window === "undefined") return;

    const targetSlug = this.normalizeDocSlug(path);
    const targetHash = `#/${targetSlug}${anchor ? `#${anchor}` : ""}`;

    if (window.location.hash === targetHash) {
      // Re-trigger scroll to anchor if already on route
      if (anchor) {
        this.scrollToAnchor(anchor);
      }
      return;
    }

    window.location.hash = targetHash;
  }

  public scrollToAnchor(anchorId: string) {
    if (typeof document === "undefined") return;
    const cleanId = decodeURIComponent(anchorId).toLowerCase().replace(/^[#]/, "");
    const element = document.getElementById(cleanId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  public subscribe(callback: (route: RouteInfo) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  protected emitRoute(route: RouteInfo) {
    this.listeners.forEach((listener) => listener(route));
  }

  private handleHashChange = () => {
    const route = this.getCurrentRoute();
    this.emitRoute(route);
    if (route.anchor) {
      setTimeout(() => {
        this.scrollToAnchor(route.anchor);
      }, 100);
    }
  };

  /**
   * Resolves a relative markdown link into a hash navigation target
   */
  public resolveLink(href: string, currentSlug: string): string {
    if (!href) return "#/";

    // External link or anchor-only
    if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) {
      return href;
    }

    if (href.startsWith("#")) {
      return `#/${currentSlug}${href}`;
    }

    // Relative path resolving
    let anchor = "";
    const anchorIdx = href.indexOf("#");
    if (anchorIdx !== -1) {
      anchor = href.substring(anchorIdx);
      href = href.substring(0, anchorIdx);
    }

    let targetParts: string[] = [];
    if (href.startsWith("/")) {
      targetParts = href.replace(/^\//, "").split("/");
    } else {
      const currentParts = currentSlug.includes("/") ? currentSlug.split("/").slice(0, -1) : [];
      const relParts = href.split("/");

      for (const p of [...currentParts, ...relParts]) {
        if (!p || p === ".") continue;
        if (p === "..") {
          targetParts.pop();
        } else {
          targetParts.push(p);
        }
      }
    }

    const resolvedPath = targetParts.join("/");
    const targetSlug = this.normalizeDocSlug(resolvedPath);
    return `#/${targetSlug}${anchor}`;
  }
}

/**
 * Path router used by prerendered static builds. The public URL scheme is
 * `<base>/<slug>/` (README → `<base>/`); heading anchors stay in the URL
 * hash. The engine API (navigate/subscribe/resolveLink) is identical to
 * HashRouter, so application code never needs to know which one is active.
 */
export class StaticRouter extends HashRouter {
  private urlBase: string;

  constructor(defaultDoc: string = "README.md") {
    super(defaultDoc);
    const context = getStaticRuntimeContext();
    this.urlBase =
      typeof window === "undefined"
        ? ""
        : deriveUrlBase(window.location.pathname, context?.slug ?? this.normalizeDocSlug(defaultDoc));
    if (typeof window !== "undefined") {
      window.addEventListener("popstate", this.handlePopState);
    }
  }

  public destroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("popstate", this.handlePopState);
    }
    super.destroy();
  }

  public getCurrentRoute(): RouteInfo {
    if (typeof window === "undefined") {
      return this.parseStaticPath("/", "");
    }
    return this.parseStaticPath(window.location.pathname, window.location.hash);
  }

  /** Maps a static page pathname + hash onto a route. */
  public parseStaticPath(pathname: string, rawHash: string): RouteInfo {
    let path = normalizePathname(pathname);
    if (this.urlBase) {
      const baseWithSlash = `${this.urlBase}/`;
      if (path === this.urlBase) {
        path = "/";
      } else if (path.startsWith(baseWithSlash)) {
        path = path.slice(baseWithSlash.length - 1);
      }
    }
    const cleaned = path.replace(/^\/+|\/+$/g, "");
    const slug = cleaned ? this.normalizeDocSlug(cleaned) : this.normalizeDocSlug(this.defaultDoc);
    const anchor = this.parseStaticAnchor(rawHash);
    return {
      slug,
      anchor,
      fullPath: `${this.urlForSlug(slug)}${anchor ? `#${anchor}` : ""}`,
    };
  }

  /** Builds the canonical URL for a document slug, including the site base when present. */
  public urlForSlug(slug: string, anchor: string = ""): string {
    const normalized = this.normalizeDocSlug(slug);
    const suffix = normalized === "README" ? "/" : `/${normalized}/`;
    const url = `${this.urlBase}${suffix}`;
    return anchor ? `${url}#${anchor}` : url;
  }

  public navigate(path: string, anchor: string = "") {
    if (typeof window === "undefined") return;

    const targetSlug = this.normalizeDocSlug(path);
    const pageUrl = this.urlForSlug(targetSlug);
    const targetUrl = anchor ? `${pageUrl}#${anchor}` : pageUrl;

    if (
      normalizePathname(window.location.pathname) === pageUrl &&
      window.location.hash === (anchor ? `#${anchor}` : "")
    ) {
      // Re-trigger scroll to anchor if already on route
      if (anchor) {
        this.scrollToAnchor(anchor);
      }
      return;
    }

    window.history.pushState({}, "", targetUrl);
    this.emitRoute(this.getCurrentRoute());
    if (anchor) {
      setTimeout(() => this.scrollToAnchor(anchor), 100);
    }
  }

  public scrollToAnchor(anchorId: string) {
    if (typeof document === "undefined") return;
    const cleanId = decodeURIComponent(anchorId).toLowerCase().replace(/^[#]/, "");
    const element = document.getElementById(cleanId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /** Resolves relative markdown links onto canonical page URLs instead of hash routes. */
  public resolveLink(href: string, currentSlug: string): string {
    const resolved = super.resolveLink(href, currentSlug);
    if (!resolved.startsWith("#/")) return resolved;

    let rest = resolved.slice(2);
    let anchor = "";
    const hashIndex = rest.indexOf("#");
    if (hashIndex !== -1) {
      anchor = rest.slice(hashIndex + 1);
      rest = rest.slice(0, hashIndex);
    }
    return this.urlForSlug(this.normalizeDocSlug(rest), anchor);
  }

  private parseStaticAnchor(rawHash: string): string {
    let anchor = rawHash.replace(/^#/, "").trim();
    if (anchor.startsWith("/")) {
      // Legacy hash-route form emitted by markdown heading anchors: "/slug#heading-id"
      const legacy = anchor.slice(1);
      const hashIndex = legacy.indexOf("#");
      anchor = hashIndex >= 0 ? legacy.slice(hashIndex + 1) : "";
    }
    return anchor;
  }

  private handlePopState = () => {
    const route = this.getCurrentRoute();
    this.emitRoute(route);
    if (route.anchor) {
      setTimeout(() => this.scrollToAnchor(route.anchor), 100);
    }
  };
}
