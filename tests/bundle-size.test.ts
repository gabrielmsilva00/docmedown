import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { gzipSync } from "node:zlib";

/**
 * Bundle-size regression guard. Runs after `npm run build` in the release
 * pipeline (see package.json `test:release`); `npm test` intentionally omits it
 * because it reads the compiled `dist/` artifacts rather than sources.
 *
 * The thresholds sit ~15% above the current output so ordinary growth passes
 * while accidental re-inlining of a heavy dependency (e.g. dropping the KaTeX
 * font pruning or losing the Mermaid code split) fails loudly.
 */
const packageRoot = path.resolve(__dirname, "..");
const distDir = path.join(packageRoot, "dist");
const KB = 1024;

function readArtifact(name: string): string {
  return fs.readFileSync(path.join(distDir, name), "utf-8");
}

test("runtime bundles stay within the agreed size budget", () => {
  assert.ok(fs.existsSync(distDir), "dist/ must exist — run `npm run build` first");

  const iife = readArtifact("docmedown.iife.js");
  const esm = readArtifact("docmedown.mjs");
  const cjs = readArtifact("docmedown.cjs");

  // IIFE is served verbatim (and embedded in offline copies), so it is the
  // large one — font pruning and es2022 keep it well under 4.5 MB raw.
  assert.ok(iife.length < 4.5 * 1024 * KB, `IIFE raw ${(iife.length / KB) | 0} KB exceeds 4.5 MB`);
  assert.ok(gzipSync(iife).length < 1.4 * 1024 * KB, "IIFE gzip exceeds 1.4 MB");

  assert.ok(esm.length < 1.4 * 1024 * KB, `ESM raw ${(esm.length / KB) | 0} KB exceeds 1.4 MB`);
  assert.ok(gzipSync(esm).length < 0.48 * 1024 * KB, "ESM gzip exceeds 480 KB");

  assert.ok(cjs.length < 1.2 * 1024 * KB, `CJS raw ${(cjs.length / KB) | 0} KB exceeds 1.2 MB`);
  assert.ok(gzipSync(cjs).length < 0.48 * 1024 * KB, "CJS gzip exceeds 480 KB");

  // The served runtime externalizes Mermaid and prunes decorative fonts, keeping the initial download lean.
  const web = readArtifact("docmedown.web.js");
  assert.ok(web.length < 1.3 * 1024 * KB, `served runtime raw ${(web.length / KB) | 0} KB exceeds 1.3 MB`);
  assert.ok(gzipSync(web).length < 0.48 * 1024 * KB, "served runtime gzip exceeds 480 KB");

  // CLI binary is minified to keep package install footprint small.
  const cli = readArtifact("cli.js");
  assert.ok(cli.length < 550 * KB, `CLI binary raw ${(cli.length / KB) | 0} KB exceeds 550 KB`);
});

test("the served runtime externalizes Mermaid into an on-demand engine bundle", () => {
  const web = readArtifact("docmedown.web.js");
  const engine = readArtifact("docmedown-mermaid.js");
  const iife = readArtifact("docmedown.iife.js");

  assert.ok(web.includes("docmedown-mermaid.js"), "served runtime should reference its engine bundle");
  assert.ok(!web.includes("sequenceDiagram"), "served runtime must not inline Mermaid internals");
  assert.ok(engine.includes("__DOCMEDOWN_MERMAID__"), "engine bundle should publish its global");
  // The self-contained IIFE keeps Mermaid inlined for offline/CDN use.
  assert.ok(iife.includes("sequenceDiagram"), "self-contained IIFE should still inline Mermaid");
});

test("Mermaid and Prism stay split out of the ESM/CJS entry bundles", () => {
  const esm = readArtifact("docmedown.mjs");
  const chunks = fs.readdirSync(distDir);

  assert.ok(
    chunks.some((file) => /^mermaid-.+\.mjs$/.test(file)),
    "Mermaid must remain a dynamic chunk for ESM consumers",
  );
  assert.ok(
    chunks.some((file) => /^prism-.+\.mjs$/.test(file)),
    "Prism must remain a dynamic chunk for ESM consumers",
  );
  // The ESM entry defers Mermaid to a dynamic import rather than inlining it.
  assert.ok(esm.includes("mermaid-"), "ESM entry should reference the Mermaid chunk");
});

test("legacy KaTeX font sources (woff/ttf) are pruned from every bundle", () => {
  for (const name of ["docmedown.iife.js", "docmedown.mjs", "docmedown.cjs"]) {
    const code = readArtifact(name);
    assert.ok(!code.includes("data:font/woff;base64"), `${name} still inlines legacy woff fonts`);
    assert.ok(!code.includes("data:font/ttf;base64"), `${name} still inlines TrueType fonts`);
    // woff2 remains so math renders identically.
    assert.ok(code.includes("data:font/woff2;base64"), `${name} is missing the woff2 font sources`);
  }
});
