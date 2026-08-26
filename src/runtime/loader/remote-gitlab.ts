import type { GitlabSourceConfig } from "../types";

export class RemoteGitlabLoader {
  private config: GitlabSourceConfig;
  private cache: Map<string, string> = new Map();

  constructor(config: GitlabSourceConfig) {
    this.config = config;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {};
    if (this.config.token) {
      headers["PRIVATE-TOKEN"] = this.config.token;
    }
    return headers;
  }

  public async discoverFiles(): Promise<string[]> {
    if (!this.config.repo) return [];
    const branch = this.config.branch || "main";
    const docsDir = (this.config.docsDir || "").replace(/^\/+|\/+$/g, "");
    const encodedRepo = encodeURIComponent(this.config.repo);

    try {
      const apiUrl = `https://gitlab.com/api/v4/projects/${encodedRepo}/repository/tree?ref=${branch}&recursive=true&per_page=100`;
      const res = await fetch(apiUrl, { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const files: string[] = [];
          for (const item of data) {
            if (item.type === "blob" && /\.(md|mdx)$/i.test(item.path)) {
              if (!docsDir || item.path.startsWith(`${docsDir}/`)) {
                const relPath = docsDir ? item.path.substring(docsDir.length + 1) : item.path;
                files.push(relPath);
              }
            }
          }
          return files;
        }
      }
    } catch (err) {
      console.warn("[DocMeDown] Failed to fetch GitLab repository tree:", err);
    }

    return ["README.md", "index.md"];
  }

  public async fetchDocContent(slug: string): Promise<string | null> {
    const normalized = slug.replace(/^\.?\//, "").replace(/\.(md|mdx|html)$/i, "");
    if (this.cache.has(normalized)) {
      return this.cache.get(normalized)!;
    }

    const branch = this.config.branch || "main";
    const docsDir = (this.config.docsDir || "").replace(/^\/+|\/+$/g, "");
    const encodedRepo = encodeURIComponent(this.config.repo || "");

    const candidates = [
      `${normalized}.md`,
      `${normalized}.mdx`,
      `${normalized}/README.md`,
      `${normalized}/index.md`,
      normalized === "README" ? "README.md" : null,
    ].filter(Boolean) as string[];

    for (const file of candidates) {
      const fullPath = docsDir ? `${docsDir}/${file}` : file;
      const rawUrl = `https://gitlab.com/api/v4/projects/${encodedRepo}/repository/files/${encodeURIComponent(
        fullPath,
      )}/raw?ref=${branch}`;

      try {
        const res = await fetch(rawUrl, { headers: this.getHeaders() });
        if (res.ok) {
          const content = await res.text();
          this.cache.set(normalized, content);
          return content;
        }
      } catch {
        // try next
      }
    }

    return null;
  }
}
