import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const tabsSrc = fs.readFileSync(path.resolve(__dirname, "../src/ui/builtins/Tabs.svelte"), "utf-8");
const tabSrc = fs.readFileSync(path.resolve(__dirname, "../src/ui/builtins/Tab.svelte"), "utf-8");
const itemSrc = fs.readFileSync(path.resolve(__dirname, "../src/ui/builtins/Item.svelte"), "utf-8");
const mainCss = fs.readFileSync(path.resolve(__dirname, "../src/runtime/styles/main.css"), "utf-8");

test("Tabs component contract: label, value, icon, tab discovery, and state synchronization", () => {
  // Tab and Item expose label, value, and icon props
  assert.ok(tabSrc.includes('label = ""') && tabSrc.includes('value = ""') && tabSrc.includes('icon = ""'));
  assert.ok(itemSrc.includes('label = ""') && itemSrc.includes('value = ""'));

  // Tabs discovers both <dmd-tab> and <dmd-item> children
  assert.match(tabsSrc, /dmd-tab/);
  assert.match(tabsSrc, /dmd-item/);

  // Active tab uses inline display toggling, not hidden attribute
  assert.match(tabsSrc, /tab\.style\.display = "none"/);
  assert.match(tabsSrc, /tab\.removeAttribute\("hidden"\)/);

  // Tab buttons render the icon element when present
  assert.match(tabsSrc, /dmd-tab-icon/);
  assert.match(tabsSrc, /tab\.icon/);

  // Group synchronization handles cross-tab updates
  assert.match(tabsSrc, /dmd-tabs-change/);
  assert.match(tabsSrc, /groupid/);
});

test("Tabs visual styling contracts across variants (postit, underline, pills, recessed)", () => {
  // 1. Post-it variant: 6 pastel hues on a neutral desk pad with folder-tab docking
  assert.match(mainCss, /\.dmd-tabs-postit \.dmd-tab-btn:nth-of-type\(6n\+1\)/);
  assert.match(mainCss, /\.dmd-tabs-postit \.dmd-tab-btn:nth-of-type\(6n\+6\)/);
  assert.match(mainCss, /color-mix\(in srgb, var\(--dmd-postit, #fbbf24\) 26%, var\(--dmd-bg-card\)\)/);
  const headerBlock = /\.dmd-tabs-postit \.dmd-tabs-header\s*\{[^}]*\}/.exec(mainCss)?.[0] ?? "";
  assert.ok(headerBlock.length > 0, "postit header rule exists");
  assert.doesNotMatch(headerBlock, /#fbbf24/);
  assert.match(mainCss, /margin:\s*0 0\.1rem -1px/);
  assert.match(mainCss, /prefers-reduced-motion/);

  // 2. Underline variant: flat editorial silhouette with uppercase tracking
  assert.match(mainCss, /\.dmd-tabs-underline\s*\{[^}]*border:\s*none/);
  assert.match(mainCss, /\.dmd-tabs-underline \.dmd-tab-btn\s*\{[^}]*text-transform:\s*uppercase/);
  assert.match(mainCss, /inset 0 -2\.5px 0 var\(--dmd-border-color\)/);

  // 3. Pills variant: centered floating bar with solid accent pill
  assert.match(mainCss, /\.dmd-tabs-pills \.dmd-tabs-header\s*\{[^}]*justify-content:\s*flex-start/);
  assert.match(mainCss, /\.dmd-tabs-pills \.dmd-tabs-header::before/);
  assert.match(mainCss, /\.dmd-tabs-pills \.dmd-tab-indicator\s*\{[^}]*background:\s*var\(--dmd-accent\)/);
  assert.match(mainCss, /\.dmd-tabs-pills \.dmd-tab-btn\.active\s*\{[^}]*color:\s*var\(--dmd-bg-card\)/);

  // 4. Recessed variant: pressed well with raised chip
  assert.match(mainCss, /\.dmd-tabs-recessed \.dmd-tabs-header\s*\{[^}]*margin:\s*0\.55rem/);
  assert.match(mainCss, /inset 0 2px 8px -3px/);
});
