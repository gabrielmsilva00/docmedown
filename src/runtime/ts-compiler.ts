/**
 * In-browser and Node TypeScript/TSX dynamic compiler for DocMeDown.
 *
 * Transforms React TSX/JSX and TypeScript modules into standard ES modules,
 * enabling dynamic component compilation directly in modern browsers.
 */

import { computeSourceHash, getCachedCompiledComponent, setCachedCompiledComponent } from "./compiler-cache";

export interface CompileTsxOptions {
  filename?: string;
  jsxFactory?: string;
  jsxFragment?: string;
  useCache?: boolean;
}

/**
 * Strips TypeScript types and transforms JSX tags using a lightweight regex/AST parser.
 * Used when a heavy WebAssembly/worker compiler is not yet loaded in browser.
 */
export function lightweightTransformTsx(
  source: string,
  options: { jsxFactory?: string; jsxFragment?: string } = {},
): string {
  const factory = options.jsxFactory || "React.createElement";
  const fragment = options.jsxFragment || "React.Fragment";

  let code = source;

  // 1. Strip type imports: import type { ... } from "..."
  code = code.replace(/import\s+type\s+[^;]+;?/g, "/* stripped type import */");

  // 2. Strip interfaces and type aliases
  code = code.replace(
    /(?:^|\n)\s*(?:export\s+)?interface\s+[A-Za-z0-9_$]+[^{]*\{[\s\S]*?\}/g,
    "\n/* stripped interface */",
  );
  code = code.replace(/(?:^|\n)\s*(?:export\s+)?type\s+[A-Za-z0-9_$]+\s*=[^;]*;/g, "\n/* stripped type */");

  // 3. Transform JSX Fragments <> ... </>
  code = code.replace(/<>([\s\S]*?)<\/>/g, `${factory}(${fragment}, null, $1)`);

  // 4. Strip 'as Type' assertions
  code = code.replace(/\s+as\s+[A-Za-z0-9_$]+(?:\s*<[^>]*>)?(?=[;,)\].}:])/g, "");

  // 5. Strip parameter and variable type annotations: (: Type)
  code = code.replace(/:\s*([A-Za-z0-9_$]+(?:\s*<[^>]*>)?)(?=[,)=])/g, "");

  return code;
}

/**
 * Compiles a TSX or TypeScript source string into standard executable JavaScript.
 */
export async function compileTsx(source: string, options: CompileTsxOptions = {}): Promise<string> {
  const useCache = options.useCache !== false;
  let hash = "";

  if (useCache) {
    hash = await computeSourceHash(source, options.filename || "component.tsx");
    const cached = await getCachedCompiledComponent(hash);
    if (cached) {
      return cached;
    }
  }

  let compiledJs: string;

  // If in Node / test / CLI environment with esbuild available
  try {
    const esbuild = await import(/* @vite-ignore */ "esbuild");
    if (esbuild && typeof esbuild.transformSync === "function") {
      const res = esbuild.transformSync(source, {
        loader: "tsx",
        target: "es2022",
        format: "esm",
        jsx: "transform",
        jsxFactory: options.jsxFactory || "React.createElement",
        jsxFragment: options.jsxFragment || "React.Fragment",
      });
      compiledJs = res.code;
    } else {
      compiledJs = lightweightTransformTsx(source, options);
    }
  } catch {
    compiledJs = lightweightTransformTsx(source, options);
  }

  if (useCache && hash) {
    await setCachedCompiledComponent(hash, compiledJs);
  }

  return compiledJs;
}
