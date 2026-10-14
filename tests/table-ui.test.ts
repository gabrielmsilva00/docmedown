import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { renderTableBlock } from "../src/runtime/markdown/tables";

test("table toolbar describes its data and provides accessible export options", () => {
  const html = renderTableBlock({
    header: [{ html: "Name" }, { html: "Value" }],
    rows: [[{ html: "Coverage" }, { html: "95%" }]],
  });
  assert.match(html, /1 row · 2 columns/);
  assert.match(html, /dmd-table-copy-label dmd-sr-only">Copy table</);
  assert.match(html, /class="copy-icon"/);
  assert.match(html, /class="check-icon"/);
  assert.match(html, /dmd-table-copy-btn-text">Copy</);
  assert.match(html, /dmd-table-copy-name">Markdown</);
  assert.match(html, /aria-haspopup="menu" aria-expanded="false"/);
  assert.match(html, /role="menu" aria-label="Copy table as" hidden/);
  assert.equal((html.match(/role="menuitem" tabindex="-1"/g) ?? []).length, 3);
  assert.match(html, /For spreadsheets/);
  assert.match(html, /data-dmd-table-status role="status" aria-live="polite"/);
});

test("tables use clean block chrome and modern cell grid with row hover effects", () => {
  const html = renderTableBlock({ header: [{ html: "Feature" }], rows: [[{ html: "Supported" }]] });
  assert.doesNotMatch(html, /dmd-table-caption-text">Table</);
  const css = fs.readFileSync(path.resolve(__dirname, "../src/runtime/styles/main.css"), "utf8");
  const section = css.slice(css.indexOf("   TABLES"), css.indexOf("   BUILTIN INTERACTIVE COMPONENTS"));
  assert.match(section, /border-right: 1px solid var\(--dmd-border-color\)/);
  assert.match(section, /\.dmd-table tbody tr:nth-child\(even\) td\s*\{\s*background: var\(--dmd-bg-secondary\)/);
  assert.doesNotMatch(section, /linear-gradient|\.dmd-table-block:hover|radius-full/);
  assert.match(section, /\.dmd-table tbody tr:hover td/);
  assert.match(section, /\.dmd-table-dimensions\s*\{[^}]*font-size: 0.68rem/);
});

test("table captions remain escaped and headerless or empty tables have accurate summaries", () => {
  const captioned = renderTableBlock({ header: null, rows: [], caption: "<Report> & results" });
  assert.match(captioned, /&lt;Report&gt; &amp; results/);
  const empty = renderTableBlock({ header: null, rows: [] });
  assert.match(empty, /0 rows · 0 columns/);
  const headerless = renderTableBlock({ header: null, rows: [[{ html: "One" }], [{ html: "Two" }]] });
  assert.match(headerless, /2 rows · 1 column/);
});

test("table menu supports keyboard navigation and resets feedback to a stable label", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../src/ui/components/MarkdownBody.svelte"), "utf8");
  assert.match(source, /\["ArrowDown", "ArrowUp", "Home", "End"\]/);
  assert.match(source, /toggle\?\.focus\(\)/);
  assert.match(source, /items\[next\]\?\.focus\(\)/);
  assert.match(source, /label\.textContent = "Copy table"/);
  assert.match(source, /\.dmd-table-toolbar/);
  assert.match(source, /\.dmd-table-copy-btn/);
  assert.match(source, /data-dmd-table-toggle/);
  assert.doesNotMatch(source, /label\.textContent = prevText/);
});

test("table styling preserves horizontal scrolling, focus indicators and reduced motion", () => {
  const css = fs.readFileSync(path.resolve(__dirname, "../src/runtime/styles/main.css"), "utf8");
  assert.match(css, /\.dmd-table-wrapper\s*\{[^}]*overflow-x: auto/);
  assert.match(css, /\.dmd-table-copy-item:focus-visible\s*\{[^}]*outline: 2px solid/);
  assert.match(css, /font-variant-numeric: tabular-nums/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.dmd-table-copy-menu \{ animation: none/);
  assert.match(css, /\.dmd-table-dimensions/);
  assert.match(css, /\.dmd-table-copy-format/);
  assert.match(css, /\.dmd-table-caption-text/);
});
