import { RemoteSourceConfig, DocFileItem, SidebarTreeNode } from '../types';

export class RemoteGithubLoader {
  private config: RemoteSourceConfig;
  private cache: Map<string, string> = new Map();
  private treeCache: { files: string[]; timestamp: number } | null = null;

  constructor(config: RemoteSourceConfig) {
    this.config = config;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json, text/plain',
    };
    if (this.config.token) {
      headers['Authorization'] = `token ${this.config.token}`;
    }
    return headers;
  }

  public async discoverFiles(): Promise<string[]> {
    if (!this.config.repo) return [];

    // Cache discovery for 5 minutes
    if (this.treeCache && Date.now() - this.treeCache.timestamp < 5 * 60 * 1000) {
      return this.treeCache.files;
    }

    const branch = this.config.branch || 'main';
    const docsDir = (this.config.docsDir || '').replace(/^\/+|\/+$/g, '');

    try {
      // 1. Try GitHub Tree API
      const apiUrl = `https://api.github.com/repos/${this.config.repo}/git/trees/${branch}?recursive=1`;
      const res = await fetch(apiUrl, { headers: this.getHeaders() });
      
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tree)) {
          const files: string[] = [];
          for (const item of data.tree) {
            if (item.type === 'blob' && /\.(md|mdx)$/i.test(item.path)) {
              if (!docsDir || item.path.startsWith(docsDir + '/')) {
                const relPath = docsDir ? item.path.substring(docsDir.length + 1) : item.path;
                files.push(relPath);
              }
            }
          }
          this.treeCache = { files, timestamp: Date.now() };
          return files;
        }
      }
    } catch (err) {
      console.warn('[DocMeDown] Failed to fetch GitHub tree API, using fallback files:', err);
    }

    // Fallback: standard candidate files
    const fallbackFiles = ['README.md', 'index.md', 'getting-started.md'];
    return fallbackFiles;
  }

  public async fetchDocContent(slug: string): Promise<string | null> {
    const normalized = slug.replace(/^\.?\//, '').replace(/\.(md|mdx|html)$/i, '');
    if (this.cache.has(normalized)) {
      return this.cache.get(normalized)!;
    }

    const branch = this.config.branch || 'main';
    const docsDir = (this.config.docsDir || '').replace(/^\/+|\/+$/g, '');

    const candidates = [
      `${normalized}.md`,
      `${normalized}.mdx`,
      `${normalized}/README.md`,
      `${normalized}/index.md`,
      normalized === 'README' ? 'README.md' : null,
    ].filter(Boolean) as string[];

    for (const file of candidates) {
      const fullPath = docsDir ? `${docsDir}/${file}` : file;
      const rawUrl = `https://raw.githubusercontent.com/${this.config.repo}/${branch}/${fullPath}`;

      try {
        const res = await fetch(rawUrl, { headers: this.getHeaders() });
        if (res.ok) {
          const content = await res.text();
          this.cache.set(normalized, content);
          return content;
        }
      } catch (err) {
        // try next candidate
      }
    }

    return null;
  }
}
