import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { type CardOutlineNode, headingLevel, inferCardOutline } from "../src/ui/builtins/card-outline";

const cardSrc = fs.readFileSync(path.resolve(__dirname, "../src/ui/builtins/Card.svelte"), "utf-8");
const mainCss = fs.readFileSync(path.resolve(__dirname, "../src/runtime/styles/main.css"), "utf-8");

interface FakeNode extends CardOutlineNode {
  label: string;
  innerHTML?: string;
  children?: CardOutlineNode[];
  removeCalled?: boolean;
}

const node = (tagName: string, label?: string, innerHTML = ""): FakeNode => ({
  tagName,
  label: label ?? tagName,
  innerHTML: innerHTML || label || tagName,
  children: [],
  remove() {
    this.removeCalled = true;
  },
});

const withText = (tagName: string, label: string, text: string, childCount = 0): FakeNode => ({
  tagName,
  label,
  textContent: text,
  innerHTML: text,
  children: Array.from({ length: childCount }, (_, i) => node("SPAN", `c${i}`)),
  remove() {
    this.removeCalled = true;
  },
});

const filler = () => withText("P", "filler", "");

test("headingLevel and inferCardOutline algorithm extracts title, subtitle, and footer from node hierarchies", () => {
  // 1. headingLevel validation
  assert.equal(headingLevel(node("H1")), 1);
  assert.equal(headingLevel(node("H2")), 2);
  assert.equal(headingLevel(node("H3")), 3);
  assert.equal(headingLevel(node("H6")), 6);
  assert.equal(headingLevel(node("P")), 0);
  assert.equal(headingLevel(node("BLOCKQUOTE")), 0);

  // 2. Title extraction: first heading above H3 wins
  assert.equal(inferCardOutline([node("H1"), node("P")]).title?.label, "H1");
  assert.equal(inferCardOutline([node("P"), node("H2"), node("UL")]).title?.label, "H2");
  assert.deepEqual(inferCardOutline([node("H3"), node("P")]), {});
  assert.deepEqual(inferCardOutline([node("P"), node("H4")]), {});

  // 3. Subtitle extraction: shallower heading right after title
  assert.equal(inferCardOutline([node("H2"), node("H3"), node("P")]).description?.label, "H3");
  assert.equal(inferCardOutline([node("H1"), node("H2"), node("P")]).description?.label, "H2");
  assert.equal(inferCardOutline([node("H2"), node("H2"), node("P")]).description, undefined);
  assert.equal(inferCardOutline([node("H2"), node("P"), node("H3")]).description, undefined);

  // 4. Footer extraction: trailing blockquote or H6
  assert.equal(inferCardOutline([node("H2"), node("P"), node("BLOCKQUOTE")]).footer?.label, "BLOCKQUOTE");
  assert.equal(inferCardOutline([node("H2"), node("P"), node("H6")]).footer?.label, "H6");
  assert.equal(inferCardOutline([node("H2"), node("BLOCKQUOTE"), node("P")]).footer, undefined);

  // 5. Empty filler tolerance and empty bodies
  const outline = inferCardOutline([
    withText("H2", "H2", "Quick start"),
    filler(),
    withText("H3", "H3", "Install"),
    filler(),
    withText("BLOCKQUOTE", "BLOCKQUOTE", "Ships offline."),
    filler(),
  ]);
  assert.equal(outline.title?.label, "H2");
  assert.equal(outline.description?.label, "H3");
  assert.equal(outline.footer?.label, "BLOCKQUOTE");

  assert.deepEqual(inferCardOutline([]), {});
  assert.deepEqual(inferCardOutline([node("P"), node("UL"), node("PRE")]), {});
});

test("Card component contract: outline adoption, props precedence, and cloneCard", () => {
  // Svelte customElement tag
  assert.match(cardSrc, /tag:\s*"dmd-card"/);
  // Uses inferCardOutline
  assert.match(cardSrc, /inferCardOutline/);
  // Exposes cloneCard for carousel wrapping
  assert.match(cardSrc, /cloneCard/);
  // Props have precedence over inferred chrome
  assert.match(cardSrc, /const canAdoptTitle = !title && !autoTitle;/);
  assert.match(cardSrc, /const canAdoptDescription = !description && !autoDescription;/);
  assert.match(cardSrc, /outline\.title\.remove\(\)/);
  assert.match(cardSrc, /outline\.description\.remove\(\)/);
  assert.match(cardSrc, /outline\.footer\.remove\(\)/);
});

test("Card visual styling, colors, and heading scaling in CSS", () => {
  // Color presets
  for (const c of ["blue", "green", "violet", "amber", "red", "neutral"]) {
    assert.match(mainCss, new RegExp(`\\.dmd-card-${c}`));
  }
  // Heading scaling inside Markdown card bodies
  assert.match(mainCss, /\.dmd-markdown-body dmd-card > h4/);
  // Inferred footer auto-margins to bottom of equal-height row
  assert.match(mainCss, /\.dmd-card-footer\s*\{[^}]*margin-top:\s*auto/);
  // Inline code styling inside card chrome
  assert.match(mainCss, /\.dmd-card-title code/);
  assert.match(mainCss, /\.dmd-card-subtitle code/);
});
