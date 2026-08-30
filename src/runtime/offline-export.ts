import type { DocManifest } from "./types";

export const OFFLINE_FORMAT_VERSION = 1;
export const OFFLINE_RUNTIME_SCRIPT_ATTRIBUTE = "data-docmedown-runtime";

export interface OfflineDocumentationData {
  manifest: DocManifest;
  docs: Record<string, string>;
  componentsSource?: string;
  nestedSites?: Record<string, OfflineNestedSiteData>;
}

/** A nested documentation root embedded inside a parent offline bundle. */
export interface OfflineNestedSiteData {
  name: string;
  manifest: DocManifest;
  docs: Record<string, string>;
  componentsSource?: string;
}

/** Emitted when a reader selects a file link a self-contained copy cannot fulfill. */
export const OFFLINE_LINK_EVENT = "docmedown:offline-link-unavailable";

export interface OfflineEnvelope {
  version: number;
  data: OfflineDocumentationData;
  runtime: string;
}

export function sanitizeDownloadName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "documentation"}-offline.html`;
}

export function isOfflineDocumentation(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "file:" || Boolean((window as any).__DOCMEDOWN_OFFLINE__);
}

/** True only for self-contained single-file copies, not the serveable site under file://. */
export function isSelfContainedOffline(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).__DOCMEDOWN_OFFLINE__);
}

export function notifyUnavailableOfflineLink(message = "That link is unavailable in offline documentation."): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OFFLINE_LINK_EVENT, { detail: message }));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Generates the tiny self-extracting HTML shell shared by CLI and browser
 * exporters. The payload is a base64-encoded gzip stream containing compact
 * JSON with documentation data and the minified IIFE runtime.
 */
export function createCompressedOfflineHtml(encodedGzip: string, title: string): string {
  const bootstrap = `(async()=>{try{const b=Uint8Array.from(atob(document.getElementById("d").textContent.trim()),c=>c.charCodeAt(0)),s=await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"))).text(),e=JSON.parse(s);if(e.version!==${OFFLINE_FORMAT_VERSION})throw new Error("Unsupported offline format");window.__DOCMEDOWN_OFFLINE__=true;window.__DOCMEDOWN_DATA__=e.data;window.__DOCMEDOWN_CONFIG__=e.data.manifest.config;const u=URL.createObjectURL(new Blob([e.runtime],{type:"text/javascript"}));window.__DOCMEDOWN_RUNTIME_URL__=u;const j=document.createElement("script");j.src=u;j.onerror=()=>{URL.revokeObjectURL(u);throw new Error("Runtime bootstrap failed")};document.head.appendChild(j)}catch(e){document.getElementById("dmd-app").textContent="Could not open this offline documentation copy: "+e.message}})();`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>${escapeHtml(title)}</title></head><body><div id="dmd-app">Opening offline documentation…</div><script id="d" type="application/octet-stream">${encodedGzip}</script><script>${bootstrap}</script></body></html>`;
}

async function compressGzip(value: string): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined") {
    throw new Error("This browser does not support local gzip compression.");
  }
  const stream = new Blob([value]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findRuntimeScript(): HTMLScriptElement | null {
  const marked = document.querySelector<HTMLScriptElement>(`script[${OFFLINE_RUNTIME_SCRIPT_ATTRIBUTE}]`);
  if (marked) return marked;
  return [...document.scripts].find((script) => /docmedown(?:\.iife)?\.js(?:[?#].*)?$/i.test(script.src)) ?? null;
}

async function readRuntimeSource(): Promise<string> {
  const runtimeScript = findRuntimeScript();
  if (!runtimeScript?.src) {
    throw new Error("The current DocMeDown runtime script could not be located.");
  }
  const response = await fetch(runtimeScript.src, { credentials: "same-origin", cache: "force-cache" });
  if (!response.ok) throw new Error(`Could not read the current DocMeDown runtime (${response.status}).`);
  return response.text();
}

export async function createOfflineDownload(): Promise<{ blob: Blob; filename: string }> {
  if (isOfflineDocumentation()) throw new Error("This documentation is already an offline copy.");
  const data = (window as any).__DOCMEDOWN_DATA__ as OfflineDocumentationData | undefined;
  if (!data?.manifest || !data.docs) {
    throw new Error("This site has no embedded documentation corpus to export. Run a DocMeDown build first.");
  }

  const runtime = await readRuntimeSource();
  const envelope: OfflineEnvelope = { version: OFFLINE_FORMAT_VERSION, data, runtime };
  const compressed = await compressGzip(JSON.stringify(envelope));
  const html = createCompressedOfflineHtml(bytesToBase64(compressed), data.manifest.config.name || "Documentation");
  return {
    blob: new Blob([html], { type: "text/html;charset=utf-8" }),
    filename: sanitizeDownloadName(data.manifest.config.name || "Documentation"),
  };
}

export async function downloadOfflineCopy(): Promise<void> {
  const { blob, filename } = await createOfflineDownload();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getEmbeddedNestedSites(): Record<string, OfflineNestedSiteData> | null {
  if (typeof window === "undefined") return null;
  const data = (window as any).__DOCMEDOWN_DATA__ as OfflineDocumentationData | undefined;
  return data?.nestedSites && typeof data.nestedSites === "object" ? data.nestedSites : null;
}

/** True for relative links to other HTML files; hash routes and remote URLs are excluded. */
export function isRelativeHtmlLink(href: string): boolean {
  if (!href) return false;
  const lowered = href.trim().toLowerCase();
  if (
    lowered.startsWith("#") ||
    lowered.startsWith("http://") ||
    lowered.startsWith("https://") ||
    lowered.startsWith("mailto:") ||
    lowered.startsWith("blob:") ||
    lowered.startsWith("data:") ||
    lowered.startsWith("javascript:")
  ) {
    return false;
  }
  return lowered.split("#")[0].split("?")[0].endsWith(".html");
}

/** Maps a clicked file link onto an embedded nested documentation site, if any. */
export function matchEmbeddedNestedSite(
  href: string,
  sites: Record<string, OfflineNestedSiteData> | null | undefined,
): string | null {
  if (!sites) return null;
  const path = href
    .trim()
    .replace(/^\.?\//, "")
    .split("#")[0]
    .split("?")[0]
    .replace(/\/index\.html?$/i, "")
    .replace(/\.html?$/i, "")
    .replace(/\/+$/, "");
  if (!path) return null;
  if (sites[path]) return path;
  return Object.keys(sites).find((key) => path.endsWith(`/${key}`)) ?? null;
}

const nestedSiteBlobUrls = new Map<string, string>();

/**
 * Opens an embedded nested documentation site from inside a self-contained
 * offline copy. The nested site is rebuilt in memory as its own
 * self-extracting page and opened from a blob URL, so no external file or
 * relative link is ever required.
 */
export async function openEmbeddedNestedSite(siteKey: string, href?: string): Promise<void> {
  const site = getEmbeddedNestedSites()?.[siteKey];
  if (!site) throw new Error(`This offline copy does not embed the documentation site "${siteKey}".`);

  let blobUrl = nestedSiteBlobUrls.get(siteKey);
  if (!blobUrl) {
    const runtimeUrl = (window as any).__DOCMEDOWN_RUNTIME_URL__ as string | undefined;
    if (!runtimeUrl) {
      throw new Error(
        "This offline copy predates nested site embedding. Rebuild it with the current DocMeDown version.",
      );
    }
    const runtime = await (await fetch(runtimeUrl)).text();
    const envelope: OfflineEnvelope = {
      version: OFFLINE_FORMAT_VERSION,
      data: { manifest: site.manifest, docs: site.docs, componentsSource: site.componentsSource },
      runtime,
    };
    const compressed = await compressGzip(JSON.stringify(envelope));
    const html = createCompressedOfflineHtml(bytesToBase64(compressed), site.name || "Documentation");
    blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    nestedSiteBlobUrls.set(siteKey, blobUrl);
  }

  const hashIndex = href ? href.indexOf("#") : -1;
  window.location.href = hashIndex >= 0 ? `${blobUrl}${href!.substring(hashIndex)}` : blobUrl;
}
