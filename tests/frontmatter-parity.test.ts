import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import { buildSync } from "esbuild";
import matter from "gray-matter";
import { validateCommand } from "../src/cli/commands/validate";
import { generateManifest } from "../src/cli/utils/scanner";
import { normalizeConfig } from "../src/runtime/config";
import { buildSidebarTree } from "../src/runtime/loader/auto-indexer";
import { extractFrontmatter, parseMarkdown } from "../src/runtime/markdown/parser";
import { isDocumentDiscoverable } from "../src/runtime/publication";
import { makeTempDir, writeFiles } from "./helpers/temp";

const fixtures = {
  "comments and quoted scalars": `title: "Guide: #1"
description: 'It''s a guide'
order: 2 # navigation position
hidden: false # visible
noindex: true
tags: ["comma, inside", 'hash # inside', plain]`,
  "block scalars and lists": `title: Multiline guide
description: >-
  A folded description
  across two lines.
tags:
  - architecture
  - "core: engine"
custom:
  nested: true
  lines: |
    first
    second`,
  "quoted escapes and YAML values": String.raw`title: "Quoted \"text\""
description: "First\nSecond"
tags: []
order: 0x10
custom_null: null
custom_boolean: TRUE`,
  "anchors and aliases": `title: Aliases
tags: &tags [alpha, beta]
custom_tags: *tags
hidden: true`,
  "empty metadata": "",
  "comments only": "# metadata is optional",
};

for (const [name, yaml] of Object.entries(fixtures)) {
  test(`browser and CLI frontmatter agree: ${name}`, async () => {
    const raw = `---\n${yaml}\n---\n# Content\n\nBody text.`;
    const expected = matter(raw);
    const parsed = extractFrontmatter(raw);
    assert.deepEqual(parsed, { frontmatter: expected.data, content: expected.content });
    assert.deepEqual(parseMarkdown(raw).frontmatter, expected.data);
    const root = makeTempDir("dmd-frontmatter-parity");
    writeFiles(root, { "guide.md": raw });
    const manifest = generateManifest(root, normalizeConfig());
    const document = manifest.docs[0];
    assert.deepEqual(document.frontmatter, parsed.frontmatter);
    assert.equal(document.content, parsed.content);
    const browserTree = buildSidebarTree(["guide.md"], { "guide.md": parsed.frontmatter });
    assert.deepEqual(
      browserTree.map((node) => node.title),
      manifest.tree.map((node) => node.title),
    );
    for (const target of ["search", "sidebar", "sitemap", "ai", "mcp-search"] as const) {
      assert.equal(
        isDocumentDiscoverable(parsed.frontmatter, target),
        isDocumentDiscoverable(document.frontmatter, target),
      );
    }
    assert.equal((await validateCommand(root, { silent: true })).valid, true);
  });
}

test("frontmatter handles BOM, CRLF, empty blocks and closing delimiters at EOF", () => {
  for (const raw of [
    "\uFEFF---\ntitle: Guide\n---\n# Content",
    "---\r\ntitle: Guide\r\ntags:\r\n  - alpha\r\n---\r\n# Content",
    "---\n---\n# Content",
    "---\ntitle: Guide\n---",
    "---yaml\ntitle: Guide\n---\n# Content",
  ]) {
    const expected = matter(raw);
    assert.deepEqual(extractFrontmatter(raw), { frontmatter: expected.data, content: expected.content });
  }
});

test("frontmatter is only recognized at the start and requires a complete closing delimiter", () => {
  for (const raw of [
    "# Intro\n\n---\ntitle: Example\n---\nBody",
    "---\ntitle: Unfinished",
    "---\ntitle: Example\n---not-a-delimiter\nBody",
    "---\n\nA thematic break, not metadata.",
  ]) {
    assert.deepEqual(extractFrontmatter(raw), { frontmatter: {}, content: raw });
  }
});

test("invalid YAML is safe during browser editing and still rejected by CLI validation", async () => {
  for (const yaml of ["tags: [", "title: one\ntitle: two", 'custom: !!js/function "function () { return 1; }"']) {
    const raw = `---\n${yaml}\n---\n# Body`;
    assert.deepEqual(extractFrontmatter(raw), { frontmatter: {}, content: "# Body" });
    assert.equal(parseMarkdown(raw).headings[0].text, "Body");
    const root = makeTempDir("dmd-frontmatter-invalid");
    writeFiles(root, { "guide.md": raw });
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await validateCommand(root, { silent: true });
      assert.ok(result.errors.some((error) => error.type === "frontmatter"));
      assert.throws(() => generateManifest(root, normalizeConfig()));
    }
  }
});

test("parity fixtures preserve authored string escapes and folded text", () => {
  const escaped = extractFrontmatter(`---\n${fixtures["quoted escapes and YAML values"]}\n---`).frontmatter;
  assert.equal(escaped.title, 'Quoted "text"');
  assert.equal(escaped.description, "First\nSecond");
  assert.equal(
    extractFrontmatter(`---\n${fixtures["block scalars and lists"]}\n---`).frontmatter.description,
    "A folded description across two lines.",
  );
});

test("frontmatter parser runs in a browser bundle without Node globals", () => {
  const result = buildSync({
    entryPoints: [path.resolve(__dirname, "../src/runtime/markdown/frontmatter.ts")],
    bundle: true,
    platform: "browser",
    format: "iife",
    globalName: "Markdown",
    write: false,
    define: { __DMD_EXTERNAL_HEAVY__: "true" },
  });
  const context = vm.createContext({ console, setTimeout, clearTimeout });
  vm.runInContext(result.outputFiles[0].text, context);
  for (const yaml of Object.values(fixtures)) {
    const raw = `---\n${yaml}\n---\n# Content`;
    const actual = context.Markdown.extractFrontmatter(raw);
    const expected = extractFrontmatter(raw);
    // Compare serialized values across VM realms (whose prototypes differ).
    assert.equal(JSON.stringify(actual), JSON.stringify(expected));
  }
});
