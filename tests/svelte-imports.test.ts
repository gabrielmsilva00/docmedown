import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const uiRoot = path.resolve(__dirname, "../src/ui");

/**
 * Every DocMeDown custom element must have `display: contents` in main.css
 * so the host element disappears from the layout tree and the component's own
 * template provides the visual structure — matching the original non-CE
 * renderer where there was no extra wrapper.
 */
test("every .dmd custom element has display:contents in the CSS", () => {
  const mainCss = fs.readFileSync(path.resolve(__dirname, "../src/runtime/styles/main.css"), "utf-8");

  const tags = new Set<string>([
    "dmd-alert",
    "dmd-accordion",
    "dmd-accordion-item",
    "dmd-badge",
    "dmd-button",
    "dmd-callout",
    "dmd-card",
    "dmd-card-grid",
    "dmd-columns",
    "dmd-column",
    "dmd-details",
    "dmd-item",
    "dmd-kbd",
    "dmd-mermaid",
    "dmd-step",
    "dmd-steps",
    "dmd-tab",
    "dmd-tabs",
    "dmd-timeline",
    "dmd-timeline-item",
  ]);

  const missing: string[] = [];
  for (const tag of tags) {
    if (!mainCss.includes(tag)) {
      missing.push(tag);
    }
  }
  assert.deepEqual(
    missing,
    [],
    "Every builtin custom element tag must appear in the display:contents rule in main.css",
  );
});

/**
 * Svelte compiles unimported capitalized tags into runtime variable
 * references instead of failing at build time — the offline bundle crashed
 * with "SidebarNode is not defined" for exactly this reason. Every PascalCase
 * tag in component markup must resolve to an import (or the file's own
 * self-import for recursive components).
 */
test("every capitalized tag in .svelte markup is imported", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".svelte")) files.push(full);
    }
  };
  walk(uiRoot);

  const offenders: string[] = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf-8");
    const parts = source.split("</script>");
    if (parts.length < 2) continue;
    const markup = (parts[parts.length - 1] || "").replace(/<!--[\s\S]*?-->/g, "");

    for (const match of markup.matchAll(/<([A-Z][A-Za-z]+)(?=[\s/>])/g)) {
      const name = match[1];
      const imported = new RegExp(`import[\\s\\S]*?\\b${name}\\b`, "i").test(source);
      if (!imported) {
        offenders.push(`${path.relative(uiRoot, file)}: <${name}>`);
      }
    }
  }

  assert.deepEqual(offenders, [], "Unimported capitalized tags in .svelte markup");
});
