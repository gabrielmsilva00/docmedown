import type { DocFrontmatter } from "./types";

export type DocumentDiscoveryTarget = "sidebar" | "search" | "sitemap" | "seo" | "ai" | "mcp-search";

/**
 * Existing discovery policy, shared by browser and build outputs.
 * These flags are not access controls: pages, offline content, and direct MCP
 * reads remain available. In particular, noindex does not opt out of AI export.
 */
export function isDocumentDiscoverable(
  frontmatter: DocFrontmatter | undefined,
  target: DocumentDiscoveryTarget,
): boolean {
  // Preserve historical truthiness for navigation, browser search, and sitemap.
  // Other outputs have always required literal boolean flags.
  switch (target) {
    case "sidebar":
      return !frontmatter?.hidden;
    case "search":
    case "sitemap":
      return !frontmatter?.hidden && !frontmatter?.noindex;
    case "seo":
      return frontmatter?.hidden !== true && frontmatter?.noindex !== true;
    case "ai":
    case "mcp-search":
      return frontmatter?.hidden !== true;
  }
}
