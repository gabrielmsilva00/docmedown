import assert from "node:assert/strict";
import { test } from "node:test";
import { processAlerts } from "../src/runtime/markdown/callouts";
import { renderMath } from "../src/runtime/markdown/katex";
import { extractFrontmatter, parseMarkdown, slugifyHeading } from "../src/runtime/markdown/parser";
import { HashRouter } from "../src/runtime/router";

test("Frontmatter extraction", () => {
  const md = `---
title: "My Doc"
order: 5
tags: ['alpha', 'beta']
---
# Content Title
This is body text.`;

  const { frontmatter, content } = extractFrontmatter(md);
  assert.equal(frontmatter.title, "My Doc");
  assert.equal(frontmatter.order, 5);
  assert.deepEqual(frontmatter.tags, ["alpha", "beta"]);
  assert.ok(content.includes("# Content Title"));
});

test("Heading slugification", () => {
  assert.equal(slugifyHeading("Hello World!"), "hello-world");
  assert.equal(slugifyHeading("Getting Started (v2.0)"), "getting-started-v20");
  assert.equal(slugifyHeading("Custom Components & Hooks"), "custom-components-hooks");
});

test("GitHub Alerts / Callouts processing", () => {
  const raw = `> [!NOTE]
> This is a note alert.

> [!WARNING] Danger Zone
> Be careful here.`;

  const processed = processAlerts(raw);
  assert.ok(processed.includes("dmd-callout-note"));
  assert.ok(processed.includes("dmd-callout-warning"));
  assert.ok(processed.includes("Danger Zone"));
});

test("LaTeX Math rendering", () => {
  const raw = "The formula is $E=mc^2$ and $$\\sum_{i=1}^n i$$.";
  const rendered = renderMath(raw);
  assert.ok(rendered.includes("katex"));
});

test("Full markdown parsing with headings", () => {
  const md = `---
title: Guide Title
---
# Main Header
Paragraph text.

## Sub Header 1
More info.

## Sub Header 2
Even more info.`;

  const parsed = parseMarkdown(md, "guide/intro");
  assert.equal(parsed.headings.length, 3);
  assert.equal(parsed.headings[0].text, "Main Header");
  assert.equal(parsed.headings[1].text, "Sub Header 1");
  assert.equal(parsed.readingTimeMinutes, 1);
  assert.ok(parsed.html.includes('id="main-header"'));
});

test("Nested documentation index links remain document links instead of hash routes", () => {
  const parsed = parseMarkdown("[Open the example](examples/local-docs/index.html)", "README");

  assert.ok(parsed.html.includes('href="examples/local-docs/index.html"'));
  assert.ok(!parsed.html.includes("#/examples/local-docs/index"));
});

test("HashRouter link resolution", () => {
  const router = new HashRouter("README.md");

  assert.equal(router.resolveLink("./guide.md", "README"), "#/guide");
  assert.equal(router.resolveLink("../getting-started.md", "guides/components"), "#/getting-started");
  assert.equal(router.resolveLink("https://google.com", "README"), "https://google.com");
  assert.equal(router.resolveLink("#anchor", "guide"), "#/guide#anchor");
});
