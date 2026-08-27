import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  bundleCustomComponents,
  createOfflineDataBootstrap,
  DEFAULT_OFFLINE_OUTPUT_DIRECTORY,
  encodeOfflinePayload,
  escapeInlineScriptContent,
  findNestedDocumentationRoots,
  getBuildOutputPaths,
  shouldWatchDocumentationSource,
} from "../src/cli/commands/build";
import { extractHeadings, generateManifest, scanDirectory } from "../src/cli/utils/scanner";
import { DEFAULT_CONFIG } from "../src/runtime/config";

test("Extract headings from markdown content", () => {
  const content = `
# Title
Intro

## Setup
Step 1

### Configuration
Option details
`;
  const headings = extractHeadings(content);
  assert.equal(headings.length, 3);
  assert.equal(headings[0].level, 1);
  assert.equal(headings[0].id, "title");
  assert.equal(headings[1].level, 2);
  assert.equal(headings[1].id, "setup");
  assert.equal(headings[2].level, 3);
  assert.equal(headings[2].id, "configuration");
});

test("Scan templates directory and generate manifest", () => {
  const templatesDir = path.resolve(__dirname, "../templates");
  const files = scanDirectory(templatesDir);

  assert.ok(files.length > 0);
  assert.ok(files.includes("README.md") || files.includes("getting-started.md"));

  const manifest = generateManifest(templatesDir, DEFAULT_CONFIG);
  assert.ok(manifest.docs.length > 0);
  assert.ok(manifest.tree.length > 0);
  assert.equal(manifest.config.name, "DocMeDown");
});

test("Hidden directories are excluded and offline output defaults to .dist", () => {
  const docsDir = path.resolve(__dirname, "../docs");
  const files = scanDirectory(docsDir);
  const output = getBuildOutputPaths(docsDir);

  assert.ok(!files.some((file) => file.startsWith(".dist/")));
  assert.equal(DEFAULT_OFFLINE_OUTPUT_DIRECTORY, ".dist");
  assert.equal(output.onlineDir, docsDir);
  assert.equal(output.offlineDir, path.join(docsDir, ".dist"));
});

test("Build and serve watchers rebuild source files but ignore generated outputs", () => {
  const docsDir = path.resolve(__dirname, "../docs");

  assert.equal(shouldWatchDocumentationSource(docsDir, path.join(docsDir, "README.md")), true);
  assert.equal(shouldWatchDocumentationSource(docsDir, path.join(docsDir, "guides", "offline-mode.md")), true);
  assert.equal(shouldWatchDocumentationSource(docsDir, path.join(docsDir, ".dist", "index.html")), false);
  assert.equal(shouldWatchDocumentationSource(docsDir, path.join(docsDir, "_manifest.json")), false);
  assert.equal(shouldWatchDocumentationSource(docsDir, path.join(docsDir, "docmedown.iife.js")), false);
  assert.equal(shouldWatchDocumentationSource(docsDir, path.join(docsDir, ".dmd", "components.js")), true);
  assert.equal(shouldWatchDocumentationSource(docsDir, path.join(docsDir, ".dmd", "components.jsx")), false);
});

test("Nested documentation roots are isolated from the parent manifest", () => {
  const docsDir = path.resolve(__dirname, "../docs");
  const files = scanDirectory(docsDir);
  const nestedRoots = findNestedDocumentationRoots(docsDir).map((root) =>
    path.relative(docsDir, root).replace(/\\/g, "/"),
  );

  assert.ok(nestedRoots.includes("examples/local-docs"));
  assert.ok(nestedRoots.includes("examples/remote-github"));
  assert.ok(nestedRoots.includes("examples/single-file-offline"));
  assert.ok(!files.some((file) => file.startsWith("examples/local-docs/")));
  assert.ok(!files.some((file) => file.startsWith("examples/remote-github/")));
  assert.ok(!files.some((file) => file.startsWith("examples/single-file-offline/")));
});

test("Offline payload and inlined runtime are safe around script closing sequences", () => {
  const payload = {
    markdown: '<script src="docmedown.iife.js"></script>',
    componentsSource: "export default { Example: () => null };",
    separator: "\u2028",
  };
  const encoded = encodeOfflinePayload(payload);
  const decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
  const escapedRuntime = escapeInlineScriptContent('const example = "</script>";');

  assert.ok(!encoded.toLowerCase().includes("</script"));
  assert.deepEqual(decoded, payload);
  assert.equal(escapedRuntime, 'const example = "<\\/script>";');
});

test("Offline custom component bundles resolve relative imports and defer module evaluation to the runtime", () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "docmedown-components-"));
  const componentsPath = path.join(temporaryDirectory, "components.js");

  try {
    fs.writeFileSync(path.join(temporaryDirectory, "shared.js"), "export const label = 'Bundled component';", "utf-8");
    fs.writeFileSync(
      componentsPath,
      'import { label } from "./shared.js"; export function OfflineWidget() { return window.React.createElement("span", null, label); } export default { OfflineWidget };',
      "utf-8",
    );

    const bundledSource = bundleCustomComponents(componentsPath);
    const bootstrap = createOfflineDataBootstrap(
      encodeOfflinePayload({ manifest: { config: {} }, docs: {}, componentsSource: bundledSource }),
    );

    assert.ok(bundledSource?.includes("Bundled component"));
    assert.ok(!bundledSource?.includes("./shared.js"));
    assert.ok(bootstrap.includes("window.__DOCMEDOWN_DATA__ = data"));
    assert.ok(!bootstrap.includes("__DOCMEDOWN_COMPONENTS_READY__"));
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
