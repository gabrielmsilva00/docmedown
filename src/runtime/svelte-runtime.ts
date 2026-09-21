/**
 * In-browser Svelte 5 runtime compiler and dynamic module linker.
 *
 * Compiles raw `.svelte` components in the browser and registers them as
 * custom elements, linking against the active Svelte 5 runtime primitives.
 */
import { loadCompilerEngine } from "./svelte-compiler-loader";
import { dmdTag, ensureCustomElementTag } from "./svelte-tag";

export { ensureCustomElementTag };

export interface CompiledSvelteResult {
  js: string;
  css?: string;
  tag: string;
}

/**
 * Rewrites bare `svelte` and `svelte/internal/client` ESM imports to use the
 * globally exposed Svelte 5 runtime primitives when evaluated as a Blob module.
 */
export function linkSveltePrimitives(jsCode: string): string {
  let linked = jsCode;

  // Strip disclose-version import
  linked = linked.replace(/import\s*['"]svelte\/internal\/disclose-version['"];?/g, "// svelte disclose-version");

  // Rewrite import * as $ from 'svelte/internal/client'
  linked = linked.replace(
    /import\s*\*\s*as\s+(\w+)\s*from\s*['"]svelte\/internal\/client['"];?/g,
    "const $1 = ((typeof window !== 'undefined' && window.__DOCMEDOWN_SVELTE__?.client) || (typeof globalThis !== 'undefined' && globalThis.__DOCMEDOWN_SVELTE__?.client));",
  );

  // Rewrite named imports from 'svelte/internal/client'
  linked = linked.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]svelte\/internal\/client['"];?/g,
    "const { $1 } = ((typeof window !== 'undefined' && window.__DOCMEDOWN_SVELTE__?.client) || (typeof globalThis !== 'undefined' && globalThis.__DOCMEDOWN_SVELTE__?.client));",
  );

  // Rewrite named imports from 'svelte'
  linked = linked.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]svelte['"];?/g,
    "const { $1 } = ((typeof window !== 'undefined' && window.__DOCMEDOWN_SVELTE__) || (typeof globalThis !== 'undefined' && globalThis.__DOCMEDOWN_SVELTE__));",
  );

  // Rewrite import * as X from 'svelte'
  linked = linked.replace(
    /import\s*\*\s*as\s+(\w+)\s*from\s*['"]svelte['"];?/g,
    "const $1 = ((typeof window !== 'undefined' && window.__DOCMEDOWN_SVELTE__) || (typeof globalThis !== 'undefined' && globalThis.__DOCMEDOWN_SVELTE__));",
  );

  return linked;
}

/**
 * Compiles a raw `.svelte` source string into client JavaScript with custom element registration.
 */
export async function compileSvelteComponent(
  source: string,
  options: { name: string; tag?: string; filename?: string },
): Promise<CompiledSvelteResult> {
  const compiler = await loadCompilerEngine();
  const tag = options.tag || dmdTag(options.name);
  const taggedSource = ensureCustomElementTag(source, tag);

  const compiled = compiler.compile(taggedSource, {
    filename: options.filename || `${options.name}.svelte`,
  });

  return {
    js: compiled.js.code,
    css: compiled.css?.code,
    tag,
  };
}

/**
 * Evaluates compiled Svelte 5 component JavaScript in the browser as a Blob module.
 * The module automatically invokes `customElements.define()` upon execution.
 */
export async function evaluateCompiledSvelte(jsCode: string): Promise<unknown> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const linkedJs = linkSveltePrimitives(jsCode);
  const blob = new Blob([linkedJs], { type: "text/javascript" });
  const blobUrl = URL.createObjectURL(blob);

  try {
    return await import(/* @vite-ignore */ blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Fetches, compiles, and registers a remote or local `.svelte` component on the fly.
 */
export async function loadAndRegisterSvelteComponent(url: string, name: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch component from ${url}: ${response.statusText}`);
  }

  const source = await response.text();
  const compiled = await compileSvelteComponent(source, { name, filename: url });
  await evaluateCompiledSvelte(compiled.js);
  return compiled.tag;
}
