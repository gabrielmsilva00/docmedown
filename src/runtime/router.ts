export interface RouteInfo {
  slug: string;
  anchor: string;
  fullPath: string;
}

export class HashRouter {
  private listeners: Set<(route: RouteInfo) => void> = new Set();
  private defaultDoc: string;

  constructor(defaultDoc: string = 'README.md') {
    this.defaultDoc = defaultDoc;
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', this.handleHashChange);
    }
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('hashchange', this.handleHashChange);
    }
    this.listeners.clear();
  }

  public setDefaultDoc(defaultDoc: string) {
    this.defaultDoc = defaultDoc;
  }

  public getCurrentRoute(): RouteInfo {
    if (typeof window === 'undefined') {
      return this.parseHash('');
    }
    return this.parseHash(window.location.hash);
  }

  public parseHash(rawHash: string): RouteInfo {
    let clean = rawHash.replace(/^#\/?/, '').trim();
    let anchor = '';

    const anchorIndex = clean.indexOf('#');
    if (anchorIndex !== -1) {
      anchor = clean.substring(anchorIndex + 1);
      clean = clean.substring(0, anchorIndex);
    }

    // Clean leading and trailing slashes
    clean = clean.replace(/^\/+|\/+$/g, '');

    // Normalize markdown extensions
    let slug = clean;
    if (!slug || slug === '/' || slug === 'index' || slug === 'README') {
      slug = this.normalizeDocSlug(this.defaultDoc);
    } else {
      slug = this.normalizeDocSlug(slug);
    }

    return {
      slug,
      anchor,
      fullPath: `#/${slug}${anchor ? '#' + anchor : ''}`,
    };
  }

  public normalizeDocSlug(pathOrSlug: string): string {
    let normalized = pathOrSlug.replace(/^\.?\//, '').replace(/\.(md|mdx|html)$/i, '');
    if (!normalized || normalized === 'index' || normalized === 'README') {
      return 'README';
    }
    return normalized;
  }

  public navigate(path: string, anchor: string = '') {
    if (typeof window === 'undefined') return;

    let targetSlug = this.normalizeDocSlug(path);
    let targetHash = `#/${targetSlug}${anchor ? '#' + anchor : ''}`;

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
    if (typeof document === 'undefined') return;
    const cleanId = decodeURIComponent(anchorId).toLowerCase().replace(/^[#]/, '');
    const element = document.getElementById(cleanId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  public subscribe(callback: (route: RouteInfo) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private handleHashChange = () => {
    const route = this.getCurrentRoute();
    this.listeners.forEach((listener) => listener(route));
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
    if (!href) return '#/';

    // External link or anchor-only
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
      return href;
    }

    if (href.startsWith('#')) {
      return `#/${currentSlug}${href}`;
    }

    // Relative path resolving
    let anchor = '';
    const anchorIdx = href.indexOf('#');
    if (anchorIdx !== -1) {
      anchor = href.substring(anchorIdx);
      href = href.substring(0, anchorIdx);
    }

    let targetParts: string[] = [];
    if (href.startsWith('/')) {
      targetParts = href.replace(/^\//, '').split('/');
    } else {
      const currentParts = currentSlug.includes('/') ? currentSlug.split('/').slice(0, -1) : [];
      const relParts = href.split('/');
      
      for (const p of [...currentParts, ...relParts]) {
        if (!p || p === '.') continue;
        if (p === '..') {
          targetParts.pop();
        } else {
          targetParts.push(p);
        }
      }
    }

    const resolvedPath = targetParts.join('/');
    const targetSlug = this.normalizeDocSlug(resolvedPath);
    return `#/${targetSlug}${anchor}`;
  }
}
