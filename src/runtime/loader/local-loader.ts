import type { DocManifest } from "../types";

export class LocalDocLoader {
  private embeddedManifest: DocManifest | null = null;
  private cache: Map<string, string> = new Map();

  constructor() {
    this.checkEmbeddedData();
  }

  private checkEmbeddedData() {
    if (typeof window === "undefined") return;

    // 1. Check window.__DOCMEDOWN_DATA__ (set by _docs.js for 100% offline file:/// usage)
    const globalData = (window as any).__DOCMEDOWN_DATA__;
    if (globalData && typeof globalData === "object") {
      if (globalData.manifest) {
        this.embeddedManifest = globalData.manifest;
      }
      if (globalData.docs && typeof globalData.docs === "object") {
        for (const [key, content] of Object.entries(globalData.docs)) {
          this.cache.set(this.normalizeKey(key), content as string);
        }
      }
    }

    // 2. Check window global manifest
    if ((window as any).__DOCMEDOWN_MANIFEST__) {
      this.embeddedManifest = (window as any).__DOCMEDOWN_MANIFEST__;
    }

    // 3. Check window global docs
    if ((window as any).__DOCMEDOWN_DOCS__) {
      for (const [key, content] of Object.entries((window as any).__DOCMEDOWN_DOCS__)) {
        this.cache.set(this.normalizeKey(key), content as string);
      }
    }

    // 4. Check script tag containing manifest
    const manifestEl = document.getElementById("dmd-manifest");
    if (manifestEl?.textContent) {
      try {
        this.embeddedManifest = JSON.parse(manifestEl.textContent);
      } catch (err) {
        console.warn("[DocMeDown] Failed to parse embedded manifest:", err);
      }
    }

    // 5. Check script tag containing docs map
    const docsEl = document.getElementById("dmd-docs");
    if (docsEl?.textContent) {
      try {
        const docsMap = JSON.parse(docsEl.textContent);
        for (const [key, content] of Object.entries(docsMap)) {
          this.cache.set(this.normalizeKey(key), content as string);
        }
      } catch (err) {
        console.warn("[DocMeDown] Failed to parse embedded docs:", err);
      }
    }
  }

  public getEmbeddedManifest(): DocManifest | null {
    return this.embeddedManifest;
  }

  public async fetchManifest(basePath: string = ""): Promise<DocManifest | null> {
    if (this.embeddedManifest) {
      return this.embeddedManifest;
    }

    // If running under file:/// and no embedded manifest, return null to avoid console CORS errors
    if (typeof window !== "undefined" && window.location.protocol === "file:") {
      return null;
    }

    try {
      const url = basePath ? `${basePath.replace(/\/$/, "")}/_manifest.json` : "_manifest.json";
      const res = await fetch(url);
      if (res.ok) {
        const manifest = await res.json();
        this.embeddedManifest = manifest;
        return manifest;
      }
    } catch {
      // Manifest not found (zero-config mode or offline)
    }

    return null;
  }

  public async fetchDocContent(slug: string, basePath: string = ""): Promise<string | null> {
    const normalized = this.normalizeKey(slug);

    // 1. Check in-memory cache / embedded docs / _docs.js
    if (this.cache.has(normalized)) {
      return this.cache.get(normalized)!;
    }

    // 2. Check embedded manifest docs if available
    if (this.embeddedManifest?.docs) {
      const item = this.embeddedManifest.docs.find(
        (d) => this.normalizeKey(d.slug) === normalized || this.normalizeKey(d.path) === normalized,
      );
      if (item?.content) {
        this.cache.set(normalized, item.content);
        return item.content;
      }
    }

    // If running under file:/// and not in cache, avoid failing fetch
    if (typeof window !== "undefined" && window.location.protocol === "file:") {
      return null;
    }

    // 3. Try fetching file candidates over HTTP
    const candidates = [
      `${normalized}.md`,
      `${normalized}.mdx`,
      `${normalized}/README.md`,
      `${normalized}/index.md`,
      normalized === "README" ? "README.md" : null,
      normalized === "README" ? "index.md" : null,
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      try {
        const url = basePath ? `${basePath.replace(/\/$/, "")}/${candidate}` : candidate;
        const res = await fetch(url);
        if (res.ok) {
          const text = await res.text();
          this.cache.set(normalized, text);
          return text;
        }
      } catch {
        // Continue to next candidate
      }
    }

    return null;
  }

  private normalizeKey(key: string): string {
    return key.replace(/^\.?\//, "").replace(/\.(md|mdx|html)$/i, "");
  }
}
