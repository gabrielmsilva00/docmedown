import type { DocConfig } from "./types";

/** Configured deployment root, including any project subpath. */
export function getSiteBaseUrl(config: Pick<DocConfig, "url">): string | null {
  return config.url ? config.url.replace(/\/+$/, "") : null;
}

/**
 * Public URL for a logical (not URL-encoded) document slug. README is the
 * existing static root route; localized README variants keep their own routes.
 * Encode segments independently so reserved filename characters cannot become
 * query strings or fragments, while nested categories remain path separators.
 */
export function getDocumentUrl(config: Pick<DocConfig, "url">, slug: string): string {
  const route = slug === "README" ? "" : `${slug.split("/").map(encodeURIComponent).join("/")}/`;
  return `${getSiteBaseUrl(config) ?? ""}/${route}`;
}

/** Canonical metadata requires a configured absolute deployment URL. */
export function getCanonicalDocumentUrl(config: Pick<DocConfig, "url">, slug: string): string | null {
  return getSiteBaseUrl(config) ? getDocumentUrl(config, slug) : null;
}
