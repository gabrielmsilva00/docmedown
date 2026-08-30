/**
 * Documentation home resolution.
 *
 * Resolution order for the Home action:
 * 1. Explicit `home` setting (document path/slug, or a link escape hatch).
 * 2. Root-level README.md, PROJECT.md, ABOUT.md, INDEX.md — case-sensitive pass.
 * 3. The same candidates again case-insensitively.
 * 4. The alphabetically first Markdown document in the corpus.
 *
 * Documentation inside documentation: when an ancestor documentation manifest is
 * reachable, Home links to the original (outermost) documentation home instead.
 */

export const HOME_CANDIDATE_FILES = ["README.md", "PROJECT.md", "ABOUT.md", "INDEX.md"] as const;

/** How many directory levels upward to probe for an enclosing documentation root. */
export const ORIGINAL_HOME_MAX_ANCESTORS = 3;

export interface HomeDocumentInput {
  slug?: string;
  path?: string;
}

export interface HomeConfigInput {
  home?: string;
}

export interface ResolvedHome {
  kind: "route" | "href";
  slug?: string;
  href?: string;
  /** Set when the home was resolved from an enclosing documentation root. */
  via?: "ancestor";
}

export interface MinimalFetchResponse {
  ok: boolean;
  json: () => Promise<unknown>;
}

export type MinimalFetch = (input: string) => Promise<MinimalFetchResponse>;

function stripDocExtension(value: string): string {
  return value
    .replace(/^\.?\//, "")
    .replace(/\.(md|mdx|html)$/i, "")
    .replace(/\/+$/, "");
}

function homeSlugOf(doc: HomeDocumentInput): string {
  return doc.slug ?? stripDocExtension(doc.path ?? "");
}

function routeHome(doc: HomeDocumentInput): ResolvedHome | null {
  const slug = homeSlugOf(doc);
  return slug ? { kind: "route", slug } : null;
}

function looksLikeLink(value: string): boolean {
  return (
    /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ||
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.includes("#") ||
    /\.html?$/i.test(value)
  );
}

/**
 * Resolves the documentation home from a corpus of documents. `docs` accepts
 * manifest items, sidebar nodes, or bare file paths.
 */
export function resolveDocumentationHome(
  docs: HomeDocumentInput[] | null | undefined,
  config?: HomeConfigInput | null,
): ResolvedHome | null {
  const docList = (Array.isArray(docs) ? docs : []).filter((doc) => doc && (doc.slug || doc.path));
  if (docList.length === 0) return null;

  const homeSetting = config?.home?.trim();
  if (homeSetting) {
    const wanted = stripDocExtension(homeSetting);
    const match = docList.find((doc) => {
      const slug = doc.slug ?? stripDocExtension(doc.path ?? "");
      const path = stripDocExtension(doc.path ?? doc.slug ?? "");
      return slug === wanted || path === wanted;
    });
    if (match) return routeHome(match);
    // Unmatched settings may intentionally point outside this corpus (nested
    // documentation linking back to its original site). Document-looking
    // settings that match nothing fall through to the automatic defaults.
    if (looksLikeLink(homeSetting)) return { kind: "href", href: homeSetting };
  }

  const rootDocs = docList.filter((doc) => !(doc.path ?? doc.slug ?? "").includes("/"));

  for (const candidate of HOME_CANDIDATE_FILES) {
    const hit = rootDocs.find((doc) => (doc.path ?? "") === candidate);
    if (hit) return routeHome(hit);
  }

  for (const candidate of HOME_CANDIDATE_FILES) {
    const lowered = candidate.toLowerCase();
    const hit = rootDocs.find((doc) => (doc.path ?? "").toLowerCase() === lowered);
    if (hit) return routeHome(hit);
  }

  const alphabeticallyFirst = [...docList].sort((left, right) => {
    const leftPath = (left.path ?? left.slug ?? "").toLowerCase();
    const rightPath = (right.path ?? right.slug ?? "").toLowerCase();
    if (leftPath !== rightPath) return leftPath < rightPath ? -1 : 1;
    const leftRaw = left.path ?? left.slug ?? "";
    const rightRaw = right.path ?? right.slug ?? "";
    return leftRaw < rightRaw ? -1 : leftRaw > rightRaw ? 1 : 0;
  })[0];

  return alphabeticallyFirst ? routeHome(alphabeticallyFirst) : null;
}

/**
 * Detects documentation inside documentation by probing ancestor directories
 * for an enclosing DocMeDown manifest. Returns the original documentation home
 * as a page-relative link, or null when no ancestor documentation exists.
 */
export async function findOriginalDocumentationHome(
  fetchImpl: MinimalFetch,
  options: { levels?: number } = {},
): Promise<ResolvedHome | null> {
  const levels = Math.max(1, options.levels ?? ORIGINAL_HOME_MAX_ANCESTORS);

  for (let level = 1; level <= levels; level += 1) {
    const prefix = "../".repeat(level);
    try {
      const response = await fetchImpl(`${prefix}_manifest.json`);
      if (!response.ok) continue;

      const manifest = (await response.json()) as { docs?: unknown; config?: unknown } | null;
      if (!manifest || !Array.isArray(manifest.docs) || manifest.docs.length === 0) continue;

      const resolved = resolveDocumentationHome(
        manifest.docs as HomeDocumentInput[],
        (manifest.config ?? {}) as HomeConfigInput,
      );
      if (resolved?.kind === "route" && resolved.slug) {
        return { kind: "href", href: `${prefix}index.html#/${resolved.slug}`, via: "ancestor" };
      }
    } catch {
      // Missing file, SPA-fallback HTML, or malformed JSON: keep probing upward.
    }
  }

  return null;
}
