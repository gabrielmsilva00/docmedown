import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import { dmdSvelte, pruneLegacyKatexFonts } from "./vite.shared.mts";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const legacyRuntimeFiles = ["dist/docmedown.cjs.js", "dist/docmedown.esm.js"];

for (const runtimeFile of legacyRuntimeFiles) {
  fs.rmSync(path.resolve(rootDirectory, runtimeFile), { force: true });
}

/**
 * Self-contained runtime build: the ESM/CJS entries for npm consumers and the
 * inlined IIFE embedded in offline single-file copies and served from the CDN.
 * The served documentation site uses the smaller `vite.config.web.mts` output
 * instead — see that file for why heavy engines are externalized there.
 */
export default defineConfig({
  plugins: [pruneLegacyKatexFonts(), ...dmdSvelte(), cssInjectedByJsPlugin()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __DMD_EXTERNAL_HEAVY__: "false",
  },
  esbuild: {
    legalComments: "none",
    treeShaking: true,
  },
  build: {
    target: "es2022",
    outDir: "dist",
    // `npm run build` regenerates CLI and declaration output after Vite completes.
    // Start from a clean runtime directory so the ESM/CJS Mermaid chunks always
    // match their entry files; the IIFE remains self-contained for docs output.
    // IIFE forbids code splitting: everything is inlined, which the offline
    // single-file bundle requires anyway (Mermaid/KaTeX/Prism included).
    emptyOutDir: true,
    lib: {
      entry: path.resolve(rootDirectory, "src/ui/index.ts"),
      name: "DocMeDown",
    },
    rollupOptions: {
      output: [
        {
          // IIFE: no code splitting (everything inlined). Dynamic import()
          // still works in the browser but mermaid/prism stay bundled.
          format: "iife",
          name: "DocMeDown",
          extend: true,
          entryFileNames: "docmedown.iife.js",
        },
        {
          // ESM: code splitting enabled. Mermaid and prism are split into
          // separate chunks and loaded on demand via dynamic import().
          format: "es",
          entryFileNames: "docmedown.mjs",
          manualChunks: (id: string) => {
            if (id.includes("node_modules/mermaid")) return "mermaid";
            if (id.includes("node_modules/prismjs")) return "prism";
            return undefined;
          },
        },
        {
          // CJS: same chunks as ESM for Node.js / bundler usage.
          format: "cjs",
          entryFileNames: "docmedown.cjs",
          manualChunks: (id: string) => {
            if (id.includes("node_modules/mermaid")) return "mermaid";
            if (id.includes("node_modules/prismjs")) return "prism";
            return undefined;
          },
        },
      ],
    },
  },
});
