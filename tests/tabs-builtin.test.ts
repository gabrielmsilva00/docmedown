import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const tabsSrc = fs.readFileSync(path.resolve(__dirname, "../src/ui/builtins/Tabs.ts"), "utf-8");
const tabSrc = fs.readFileSync(path.resolve(__dirname, "../src/ui/builtins/Tab.ts"), "utf-8");
const itemSrc = fs.readFileSync(path.resolve(__dirname, "../src/ui/builtins/Item.ts"), "utf-8");
const mainCss = fs.readFileSync(path.resolve(__dirname, "../src/runtime/styles/main.css"), "utf-8");

test("DmdTab exposes label, value and icon properties", () => {
  assert.match(tabSrc, /label:\s*\{\s*type:\s*String\s*\}/);
  assert.match(tabSrc, /value:\s*\{\s*type:\s*String\s*\}/);
  assert.match(tabSrc, /icon:\s*\{\s*type:\s*String\s*\}/);
});

test("tab buttons render the icon element before the label", () => {
  assert.match(tabsSrc, /dmd-tab-icon/);
  assert.match(tabsSrc, /aria-hidden="true">\$\{icon\}/);
});

test("tab discovery includes universal <Item> children, not just <Tab>", () => {
  assert.match(tabsSrc, /tag\s*===\s*"dmd-tab"\s*\|\|\s*tag\s*===\s*"dmd-item"/);
});

test("DmdItem exposes label/value so it can act as a tab inside <Tabs>", () => {
  assert.match(itemSrc, /label:\s*\{\s*type:\s*String\s*\}/);
  assert.match(itemSrc, /value:\s*\{\s*type:\s*String\s*\}/);
});

test("tab visibility uses inline display, never the hidden attribute", () => {
  assert.match(tabsSrc, /tab\.style\.display\s*=\s*"none"/);
  assert.match(tabsSrc, /tab\.removeAttribute\("hidden"\)/);
  assert.doesNotMatch(tabsSrc, /\.hidden\s*=/);
});

test("postit tabs are pastel folder tabs cycling six hues on a neutral pad", () => {
  // Each tab is its own colored note: six pastel hues cycle per tab.
  assert.match(mainCss, /\.dmd-tabs-postit \.dmd-tab-btn:nth-of-type\(6n\+1\)/);
  assert.match(mainCss, /\.dmd-tabs-postit \.dmd-tab-btn:nth-of-type\(6n\+2\)/);
  assert.match(mainCss, /\.dmd-tabs-postit \.dmd-tab-btn:nth-of-type\(6n\+3\)/);
  assert.match(mainCss, /\.dmd-tabs-postit \.dmd-tab-btn:nth-of-type\(6n\+4\)/);
  assert.match(mainCss, /\.dmd-tabs-postit \.dmd-tab-btn:nth-of-type\(6n\+5\)/);
  assert.match(mainCss, /\.dmd-tabs-postit \.dmd-tab-btn:nth-of-type\(6n\+6\)/);
  // Paper surfaces use the per-tab --dmd-postit hue, mixed opaque into card
  // (alpha washes disappear on dark themes).
  assert.match(mainCss, /color-mix\(in srgb, var\(--dmd-postit, #fbbf24\) 26%, var\(--dmd-bg-card\)\)/);
  // The pad itself is NEUTRAL — the header block must not carry the amber wash.
  const headerBlock = /\.dmd-tabs-postit \.dmd-tabs-header\s*\{[^}]*\}/.exec(mainCss)?.[0] ?? "";
  assert.ok(headerBlock.length > 0, "postit header rule exists");
  assert.doesNotMatch(headerBlock, /#fbbf24/);
  // Folder-tab docking: overlap the header rule and share the panel surface.
  assert.match(mainCss, /margin:\s*0 0\.1rem -1px/);
  assert.match(mainCss, /\.dmd-tabs-postit \.dmd-tab-btn\.active/);
  // Static tilts are disabled for reduced-motion users.
  assert.match(mainCss, /prefers-reduced-motion/);
});

test("underline tabs are chromeless uppercase micro-labels over a hairline", () => {
  // The wrapper drops its card chrome entirely — flat editorial silhouette.
  assert.match(mainCss, /\.dmd-tabs-underline\s*\{[^}]*border:\s*none/);
  assert.match(mainCss, /\.dmd-tabs-underline \.dmd-tab-btn\s*\{[^}]*text-transform:\s*uppercase/);
  assert.match(mainCss, /\.dmd-tabs-underline \.dmd-tab-btn:hover/);
  assert.match(mainCss, /inset 0 -2\.5px 0 var\(--dmd-border-color\)/);
});

test("pills tabs are a centered floating bar with a solid accent pill", () => {
  // Centering is flex-start + ::before/::after auto-margin spacers (NOT
  // justify-content:center — a centered flex row also centers the absolute
  // indicator's static position, double-counting the slack and parking the
  // pill in empty space).
  assert.match(mainCss, /\.dmd-tabs-pills \.dmd-tabs-header\s*\{[^}]*justify-content:\s*flex-start/);
  assert.match(mainCss, /\.dmd-tabs-pills \.dmd-tabs-header::before/);
  assert.match(mainCss, /\.dmd-tabs-pills \.dmd-tabs-header\s*\{[^}]*border-radius:\s*var\(--dmd-radius-full\)/);
  // The indicator must NOT carry align-self: an absolutely positioned flex
  // child with a non-stretch align-self computes its cross size as auto and
  // collapses the pill to 0 height.
  assert.doesNotMatch(mainCss, /\.dmd-tabs-pills \.dmd-tab-indicator\s*\{[^}]*align-self\s*:/);
  // The indicator is filled with the accent; labels flip to on-accent text.
  assert.match(mainCss, /\.dmd-tabs-pills \.dmd-tab-indicator\s*\{[^}]*background:\s*var\(--dmd-accent\)/);
  assert.match(mainCss, /\.dmd-tabs-pills \.dmd-tab-btn\.active\s*\{[^}]*color:\s*var\(--dmd-bg-card\)/);
});

test("recessed tabs are a pressed well with a raised chip", () => {
  // The whole header is inset from the wrapper edges — the "well" read.
  assert.match(mainCss, /\.dmd-tabs-recessed \.dmd-tabs-header\s*\{[^}]*margin:\s*0\.55rem/);
  assert.match(mainCss, /inset 0 2px 8px -3px/);
});
