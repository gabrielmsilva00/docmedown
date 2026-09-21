import type { MermaidConfig } from "mermaid";

/**
 * Mermaid is by far the heaviest optional dependency (~800 KB gzipped). How it
 * is obtained depends on the build:
 *
 * - **ESM/CJS** (npm consumers): `import("mermaid")` resolves to the code-split
 *   Mermaid chunk Vite emits next to the entry.
 * - **Served runtime** (`docmedown.web.js`): `__DMD_EXTERNAL_HEAVY__` is true,
 *   so the module injects the sibling `docmedown-mermaid.js` as a classic
 *   <script> on the first diagram render. Pages without a diagram never fetch
 *   it. A classic script (not `import()`) is required for `file://` support.
 * - **Self-contained IIFE** (offline copies, CDN): the flag is false and Vite
 *   inlines Mermaid, so the file stands alone.
 */

declare const __DMD_EXTERNAL_HEAVY__: boolean;

/** Minimal surface of the Mermaid API DocMeDown calls. */
export interface MermaidEngine {
  initialize(config: MermaidConfig): void;
  parse(source: string): Promise<unknown>;
  render(id: string, source: string): Promise<{ svg: string }>;
}

const MERMAID_GLOBAL = "__DOCMEDOWN_MERMAID__";
const MERMAID_FILE = "docmedown-mermaid.js";

let engineBase = "";
let enginePromise: Promise<MermaidEngine> | null = null;

/**
 * `__DMD_EXTERNAL_HEAVY__` is replaced at build time. The `typeof` guard keeps
 * this module safe when the source is evaluated directly (tests, tsx) and the
 * flag was never defined.
 */
const EXTERNAL_HEAVY = typeof __DMD_EXTERNAL_HEAVY__ === "boolean" ? __DMD_EXTERNAL_HEAVY__ : false;

/** Sets the asset prefix the served `docmedown-mermaid.js` is fetched from. */
export function configureMermaidEngine(basePath: string = ""): void {
  engineBase = basePath ? `${basePath.replace(/\/+$/, "")}/` : "";
}

function globalEngine(): MermaidEngine | undefined {
  return (globalThis as Record<string, unknown>)[MERMAID_GLOBAL] as MermaidEngine | undefined;
}

/**
 * Injects the served `docmedown-mermaid.js` as a classic <script> and resolves
 * with the global it publishes. Exported so the resolution logic is unit
 * testable without a real browser.
 */
export function loadExternalMermaidEngine(): Promise<MermaidEngine> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("DocMeDown: the Mermaid engine can only be loaded in a browser."));
      return;
    }

    const url = `${engineBase}${MERMAID_FILE}`;

    // Another viewer may already be fetching the engine; reuse its tag.
    const existing = document.querySelector<HTMLScriptElement>('script[data-dmd-engine="mermaid"]');
    if (existing) {
      existing.addEventListener("load", () => {
        const engine = globalEngine();
        if (engine) resolve(engine);
        else reject(new Error(`DocMeDown: ${url} did not expose ${MERMAID_GLOBAL}.`));
      });
      existing.addEventListener("error", () => reject(new Error(`DocMeDown: could not load ${url}`)));
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.dataset.dmdEngine = "mermaid";
    script.addEventListener("load", () => {
      const engine = globalEngine();
      if (engine) resolve(engine);
      else reject(new Error(`DocMeDown: ${url} did not expose ${MERMAID_GLOBAL}.`));
    });
    script.addEventListener("error", () => reject(new Error(`DocMeDown: could not load ${url}`)));
    document.head.appendChild(script);
  });
}

/** Resolves the Mermaid engine once, from the external bundle or a dynamic chunk. */
export function loadMermaidEngine(): Promise<MermaidEngine> {
  if (enginePromise) return enginePromise;

  enginePromise = (async () => {
    const inlined = globalEngine();
    if (inlined) return inlined;

    if (EXTERNAL_HEAVY) {
      return loadExternalMermaidEngine();
    }

    const module = (await import("mermaid")) as unknown as { default?: MermaidEngine } & MermaidEngine;
    return module.default ?? module;
  })();

  // A failed load must not poison the cache — allow a later retry.
  enginePromise.catch(() => {
    enginePromise = null;
  });

  return enginePromise;
}
