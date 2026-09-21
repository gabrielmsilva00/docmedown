import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

/**
 * Builds the on-demand engine bundles the served runtime injects as classic
 * <script> tags (see `src/runtime/markdown/mermaid-loader.ts`). They publish a
 * global instead of being code-split so they work over `file://`, where ESM
 * module scripts are blocked.
 *
 * Mermaid is the only engine for now: it is ~800 KB gzipped and unused by most
 * pages, so keeping it out of the initial payload is the single biggest
 * load-time win for the served documentation site.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "dist");
mkdirSync(outDir, { recursive: true });

const engines = [
  {
    entry: "src/runtime/markdown/mermaid-engine.ts",
    outfile: "docmedown-mermaid.js",
    globalName: "DocMeDownMermaid",
  },
];

for (const engine of engines) {
  buildSync({
    entryPoints: [path.join(root, engine.entry)],
    outfile: path.join(outDir, engine.outfile),
    bundle: true,
    format: "iife",
    globalName: engine.globalName,
    platform: "browser",
    target: "es2022",
    minify: true,
    treeShaking: true,
    legalComments: "none",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    logLevel: "warning",
  });
  console.log(`  ✔ Built on-demand engine: dist/${engine.outfile}`);
}
