import type { DocManifest } from "./types";

export const OFFLINE_FORMAT_VERSION = 1;
export const OFFLINE_RUNTIME_SCRIPT_ATTRIBUTE = "data-docmedown-runtime";

export interface OfflineDocumentationData {
  manifest: DocManifest;
  docs: Record<string, string>;
  componentsSource?: string;
}

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
  const bootstrap = `(async()=>{try{const b=Uint8Array.from(atob(document.getElementById("d").textContent.trim()),c=>c.charCodeAt(0)),s=await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"))).text(),e=JSON.parse(s);if(e.version!==${OFFLINE_FORMAT_VERSION})throw new Error("Unsupported offline format");window.__DOCMEDOWN_OFFLINE__=true;window.__DOCMEDOWN_DATA__=e.data;window.__DOCMEDOWN_CONFIG__=e.data.manifest.config;const u=URL.createObjectURL(new Blob([e.runtime],{type:"text/javascript"})),j=document.createElement("script");j.src=u;j.onload=()=>URL.revokeObjectURL(u);j.onerror=()=>{URL.revokeObjectURL(u);throw new Error("Runtime bootstrap failed")};document.head.appendChild(j)}catch(e){document.getElementById("dmd-app").textContent="Could not open this offline documentation copy: "+e.message}})();`;
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
