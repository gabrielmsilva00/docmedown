/**
 * Built-in favicon presets and helpers for DocMeDown.
 *
 * Each preset is a crisp, self-contained SVG optimized for tiny browser tab
 * resolutions (16x16, 32x32) as well as retina and pinned tabs.
 *
 * All presets are embedded as data URIs so documentation sites and offline
 * distributables work 100% self-contained without extra asset files or network calls.
 */

export const FAVICON_PRESET_NAMES = ["default", "markdown", "terminal", "book", "minimal"] as const;

export type FaviconPreset = (typeof FAVICON_PRESET_NAMES)[number];

export const FAVICON_SVGS: Record<FaviconPreset, string> = {
  default:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="dmd-fav-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#dmd-fav-bg)"/><path d="M9 5h8.5l6.5 6.5V25a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="#ffffff" fill-opacity="0.16" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/><path d="M17.5 5v5a1.5 1.5 0 0 0 1.5 1.5h5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M16 12.5v9.5m-3.5-3.5 3.5 3.5 3.5-3.5" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  markdown:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="dmd-fav-md" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#dmd-fav-md)" stroke="#38bdf8" stroke-width="1.2" stroke-opacity="0.35"/><path d="M6.5 21V11h3l3 4.5 3-4.5h3v10" fill="none" stroke="#f8fafc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22.5 11v10m-3-3 3 3 3-3" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  terminal:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="dmd-fav-term" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#020617"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#dmd-fav-term)" stroke="#10b981" stroke-width="1.2" stroke-opacity="0.4"/><circle cx="8" cy="8" r="1.5" fill="#ef4444" opacity="0.85"/><circle cx="12.5" cy="8" r="1.5" fill="#f59e0b" opacity="0.85"/><circle cx="17" cy="8" r="1.5" fill="#10b981" opacity="0.85"/><path d="M8.5 15.5l5 4-5 4" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><line x1="16.5" y1="23.5" x2="23.5" y2="23.5" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/></svg>',

  book: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="dmd-fav-book" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2563eb"/><stop offset="100%" stop-color="#1d4ed8"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#dmd-fav-book)"/><path d="M16 11.5c-2.8-1.8-6.5-1.8-9.5 0v11c3-1.4 6.7-1.4 9.5 0m0-11c2.8-1.8 6.5-1.8 9.5 0v11c-3-1.4-6.7-1.4-9.5 0M16 11.5v11" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 7.5v2.5" stroke="#93c5fd" stroke-width="2" stroke-linecap="round"/></svg>',

  minimal:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="dmd-fav-min-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#18181b"/><stop offset="100%" stop-color="#09090b"/></linearGradient><linearGradient id="dmd-fav-min-accent" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#818cf8"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#dmd-fav-min-bg)" stroke="#27272a" stroke-width="1.2"/><polygon points="16,6 25,11.2 25,20.8 16,26 7,20.8 7,11.2" fill="none" stroke="url(#dmd-fav-min-accent)" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="16" r="3.5" fill="url(#dmd-fav-min-accent)"/></svg>',
};

/**
 * Converts raw SVG markup into an immutable base64 data URI.
 * Works in both Node.js (Buffer) and browser (btoa) environments.
 */
export function svgToDataUri(svg: string): string {
  const cleaned = svg.replace(/\s+/g, " ").trim();
  if (typeof Buffer !== "undefined") {
    return `data:image/svg+xml;base64,${Buffer.from(cleaned, "utf-8").toString("base64")}`;
  }
  if (typeof btoa !== "undefined") {
    return `data:image/svg+xml;base64,${btoa(cleaned)}`;
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(cleaned)}`;
}

export const FAVICON_DATA_URIS: Record<FaviconPreset, string> = {
  default: svgToDataUri(FAVICON_SVGS.default),
  markdown: svgToDataUri(FAVICON_SVGS.markdown),
  terminal: svgToDataUri(FAVICON_SVGS.terminal),
  book: svgToDataUri(FAVICON_SVGS.book),
  minimal: svgToDataUri(FAVICON_SVGS.minimal),
};

export const DEFAULT_FAVICON_PRESET: FaviconPreset = "default";
export const DEFAULT_FAVICON_DATA_URI = FAVICON_DATA_URIS.default;

export function isFaviconPreset(name: unknown): name is FaviconPreset {
  return typeof name === "string" && (FAVICON_PRESET_NAMES as readonly string[]).includes(name);
}

/**
 * Resolves a configured favicon value to a browser-ready URI.
 * - Missing or empty values fallback to the default preset data URI.
 * - Preset names ("default", "markdown", "terminal", "book", "minimal") resolve to embedded SVG data URIs.
 * - Custom paths or URLs are returned directly.
 */
export function resolveFavicon(favicon?: string | null): string {
  if (!favicon || favicon === "data:,") {
    return DEFAULT_FAVICON_DATA_URI;
  }
  const trimmed = favicon.trim();
  if (isFaviconPreset(trimmed)) {
    return FAVICON_DATA_URIS[trimmed];
  }
  return trimmed;
}
