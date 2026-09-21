/**
 * On-demand loader for the Svelte compiler engine (`docmedown-compiler.js`).
 *
 * Like Mermaid, the Svelte compiler (~800 KB minified) is externalized into an
 * on-demand engine bundle and loaded only when dynamic in-browser `.svelte`
 * compilation is required.
 */
export interface SvelteCompilerEngine {
  compile: typeof import("svelte/compiler").compile;
}

const COMPILER_GLOBAL = "__DOCMEDOWN_COMPILER__";
const COMPILER_FILE = "docmedown-compiler.js";

let compilerBase = "";
let compilerPromise: Promise<SvelteCompilerEngine> | null = null;

export function configureCompilerEngine(basePath: string = ""): void {
  compilerBase = basePath ? `${basePath.replace(/\/+$/, "")}/` : "";
}

function globalCompiler(): SvelteCompilerEngine | undefined {
  return (globalThis as Record<string, unknown>)[COMPILER_GLOBAL] as SvelteCompilerEngine | undefined;
}

export function loadExternalCompilerEngine(): Promise<SvelteCompilerEngine> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("DocMeDown: the Svelte compiler engine can only be loaded in a browser."));
      return;
    }

    const url = `${compilerBase}${COMPILER_FILE}`;

    const existing = document.querySelector<HTMLScriptElement>('script[data-dmd-engine="compiler"]');
    if (existing) {
      existing.addEventListener("load", () => {
        const engine = globalCompiler();
        if (engine) resolve(engine);
        else reject(new Error(`DocMeDown: ${url} did not expose ${COMPILER_GLOBAL}.`));
      });
      existing.addEventListener("error", () => reject(new Error(`DocMeDown: could not load ${url}`)));
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.dataset.dmdEngine = "compiler";
    script.addEventListener("load", () => {
      const engine = globalCompiler();
      if (engine) resolve(engine);
      else reject(new Error(`DocMeDown: ${url} did not expose ${COMPILER_GLOBAL}.`));
    });
    script.addEventListener("error", () => reject(new Error(`DocMeDown: could not load ${url}`)));
    document.head.appendChild(script);
  });
}

declare const __DMD_EXTERNAL_HEAVY__: boolean;
const EXTERNAL_HEAVY = typeof __DMD_EXTERNAL_HEAVY__ !== "undefined" && Boolean(__DMD_EXTERNAL_HEAVY__);

/** Resolves the Svelte compiler engine once, from the external bundle or a dynamic import. */
export function loadCompilerEngine(): Promise<SvelteCompilerEngine> {
  if (compilerPromise) return compilerPromise;

  compilerPromise = (async () => {
    const inlined = globalCompiler();
    if (inlined) return inlined;

    if (EXTERNAL_HEAVY || typeof document !== "undefined") {
      return loadExternalCompilerEngine();
    }

    // In Node environments (tests) or ESM bundlers, import svelte/compiler directly
    const svelteCompilerPkg = "svelte/compiler";
    const mod = (await import(/* @vite-ignore */ svelteCompilerPkg)) as unknown as {
      compile: typeof import("svelte/compiler").compile;
    };
    return { compile: mod.compile };
  })();

  compilerPromise.catch(() => {
    compilerPromise = null;
  });

  return compilerPromise;
}
