import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import { dmdSvelte, pruneLegacyKatexFonts } from "./vite.shared.mts";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

/**
 * Served-runtime build (the bundle the static site and dev server ship).
 *
 * It is intentionally separate from `vite.config.mts`:
 *
 * - Heavier engines (Mermaid, ~800 KB gzipped) are **externalized** via the
 *   `__DMD_EXTERNAL_HEAVY__` flag so the runtime loads `docmedown-mermaid.js`
 *   on demand from a classic <script> tag (works over `file://`, unlike ESM).
 *   A page without a diagram never downloads Mermaid.
 * - The self-contained IIFE built by `vite.config.mts` is left untouched; it
 *   stays the artifact embedded in offline single-file copies and served from
 *   the CDN, where everything must be inlined.
 */
export default defineConfig({
  plugins: [pruneLegacyKatexFonts(), ...dmdSvelte(), cssInjectedByJsPlugin()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __DMD_EXTERNAL_HEAVY__: "true",
  },
  esbuild: {
    legalComments: "none",
    treeShaking: true,
  },
  build: {
    target: "es2022",
    outDir: "dist",
    // Never wipe: the runtime/ESM/CJS build already populated dist/.
    emptyOutDir: false,
    lib: {
      entry: path.resolve(rootDirectory, "src/ui/index.ts"),
      name: "DocMeDown",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        format: "iife",
        name: "DocMeDown",
        extend: true,
        entryFileNames: "docmedown.web.js",
      },
    },
  },
});
