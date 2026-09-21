import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parseMarkdown } from "../src/runtime/markdown/parser";
import { type CardOutlineNode, headingLevel, inferCardOutline } from "../src/ui/builtins/card-outline";

const cardSrc = fs.readFileSync(path.resolve(__dirname, "../src/ui/builtins/Card.ts"), "utf-8");
const mainCss = fs.readFileSync(path.resolve(__dirname, "../src/runtime/styles/main.css"), "utf-8");

/**
 * Stand-ins for card children. Inference only ever reads `tagName`; `label`
 * makes assertions read as the authoring, not as the DOM.
 */
interface FakeNode extends CardOutlineNode {
  label: string;
}

const node = (tagName: string, label?: string): FakeNode => ({ tagName, label: label ?? tagName });
const outlineOf = (...tags: string[]) => inferCardOutline(tags.map((tag) => node(tag, tag)));

test("headingLevel reads H1-H6 and rejects everything else", () => {
  assert.equal(headingLevel(node("H1")), 1);
  assert.equal(headingLevel(node("H2")), 2);
  assert.equal(headingLevel(node("H6")), 6);
  // tagName is uppercase for HTML in the DOM, but stay case-insensitive.
  assert.equal(headingLevel(node("h3")), 3);
  assert.equal(headingLevel(node("P")), 0);
  assert.equal(headingLevel(node("BLOCKQUOTE")), 0);
});

test("a leading heading above H3 becomes the card title", () => {
  assert.equal(outlineOf("H1", "P").title?.label, "H1");
  assert.equal(outlineOf("H2", "P", "UL").title?.label, "H2");
  // Body copy may precede the heading; the first title-level heading still wins.
  assert.equal(outlineOf("P", "H2", "UL").title?.label, "H2");
});

test("H3 and deeper headings stay body copy", () => {
  assert.deepEqual(outlineOf("H3", "P"), {});
  assert.deepEqual(outlineOf("P", "H4", "UL"), {});
  assert.deepEqual(outlineOf("P", "H3", "H4"), {});
});

test("a smaller heading right after the title becomes the description", () => {
  const outline = outlineOf("H2", "H3", "P");
  assert.equal(outline.title?.label, "H2");
  assert.equal(outline.description?.label, "H3");
  // An H1 title accepts any deeper heading as its subtitle.
  assert.equal(outlineOf("H1", "H2", "P").description?.label, "H2");
  assert.equal(outlineOf("H1", "H6", "P").description?.label, "H6");
});

test("an equal or shallower heading after the title is not a description", () => {
  assert.equal(outlineOf("H2", "H2", "P").description, undefined);
  assert.equal(outlineOf("H2", "H1", "P").description, undefined);
  // "right after": an intervening paragraph breaks the subtitle pair.
  assert.equal(outlineOf("H2", "P", "H3").description, undefined);
});

test("a trailing blockquote becomes the footer", () => {
  assert.equal(outlineOf("H2", "P", "BLOCKQUOTE").footer?.label, "BLOCKQUOTE");
  // Footers are independent of the title: a card may be body copy + note.
  assert.equal(outlineOf("P", "UL", "BLOCKQUOTE").footer?.label, "BLOCKQUOTE");
  // Only a *trailing* blockquote is a footer.
  assert.equal(outlineOf("BLOCKQUOTE", "P").footer, undefined);
});

test("a trailing heading below H5 becomes the footer, H5 stays body copy", () => {
  assert.equal(outlineOf("P", "H6").footer?.label, "H6");
  assert.equal(outlineOf("P", "H5").footer, undefined);
  assert.equal(outlineOf("P", "H4").footer, undefined);
});

test("each node is claimed by one slot only", () => {
  // `## Title` + `### Sub` is a description, never a footer, even though the
  // subtitle is also the last child.
  const outline = outlineOf("H2", "H3");
  assert.equal(outline.description?.label, "H3");
  assert.equal(outline.footer, undefined);
  // A footer-level heading is a footer, not a title.
  assert.equal(outlineOf("H6").title, undefined);
  assert.equal(outlineOf("H6").footer?.label, "H6");
});

/** An empty element: what the browser makes of the pipeline's orphan `</p>`. */
const filler = (tagName = "P"): FakeNode => ({
  tagName,
  label: `${tagName}(empty)`,
  textContent: "",
  childElementCount: 0,
});

const withText = (tagName: string, label: string, text: string, elementChildren = 0): FakeNode => ({
  tagName,
  label,
  textContent: text,
  childElementCount: elementChildren,
});

test("the markdown pipeline unwraps a heading-led card without orphaning a paragraph", () => {
  // `processComponentBodies` renders the body first, then `marked` wraps the
  // component open tag plus the markdown that follows it in a paragraph. Leaving
  // the closing `</p>` behind would make the browser materialize an empty `<p>`
  // between the card's first headings, so `unwrapBlockComponents` drops both
  // halves of the wrapper.
  const html = parseMarkdown(
    ['<Card color="blue">', "  ## Quick start", "  ### Install with **npm**", "", "  > Ships offline.", "</Card>"].join(
      "\n",
    ),
    "showcase",
  ).html;
  assert.match(html, /<Card color="blue"><h2>Quick start<\/h2>/);
  assert.match(html, /<h3>Install with <strong>npm<\/strong><\/h3>/);
  assert.match(html, /<blockquote>/);
  assert.doesNotMatch(html, /<\/h2><\/p>/);
});

test("inference ignores stray empty elements between the chrome candidates", () => {
  // Defence in depth: `unwrapBlockComponents` now unwraps a component paragraph
  // whole, but a body can still arrive with an empty wrapper (runtime-injected
  // content, markup from an older build). It must not break title→subtitle
  // adjacency or hide a trailing footer.
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
});

test("an element with children but no text is content, not a filler", () => {
  // `<p><img /></p>` has no text of its own: it must still separate a title
  // from a later heading rather than letting them pair up.
  const outline = inferCardOutline([
    withText("H2", "H2", "Title"),
    withText("P", "P(img)", "", 1),
    withText("H3", "H3", "Sub"),
  ]);
  assert.equal(outline.title?.label, "H2");
  assert.equal(outline.description, undefined);
  assert.equal(outline.footer, undefined);
});

test("an empty or chrome-less body yields no card outline", () => {
  assert.deepEqual(outlineOf(), {});
  assert.deepEqual(outlineOf("P", "UL", "PRE"), {});
});

test("DmdCard adopts the inferred outline at connect and on slot change", () => {
  assert.match(cardSrc, /import \{ inferCardOutline \} from "\.\/card-outline";/);
  assert.match(cardSrc, /inferCardOutline\(Array\.from\(this\.children\)\)/);
  assert.match(cardSrc, /connectedCallback\(\) \{\s*super\.connectedCallback\(\);\s*this\._adoptOutline\(\);/);
  assert.match(cardSrc, /<slot @slotchange=\$\{this\._onSlotChange\}><\/slot>/);
});

test("inference never overrides an explicitly authored prop", () => {
  // Each chrome slot is adopted only while its prop stays empty...
  assert.match(cardSrc, /const canAdoptTitle = !this\.title && !this\._autoTitle;/);
  assert.match(cardSrc, /const canAdoptDescription = !this\.description && !this\._autoDescription;/);
  assert.match(cardSrc, /if \(!this\.footer && !this\._autoFooter && outline\.footer\)/);
  // ...and an adopted node is copied out of the body, never left behind: a
  // later slot change must not re-adopt the same nodes.
  assert.match(cardSrc, /outline\.title\.remove\(\)/);
  assert.match(cardSrc, /outline\.description\.remove\(\)/);
  assert.match(cardSrc, /outline\.footer\.remove\(\)/);
});

test("inferred chrome renders through the existing prop chrome", () => {
  // Same elements as the prop-driven paths, so title/description/footer look
  // and pin identically (unsafeHTML keeps inline Markdown inside a heading).
  assert.match(cardSrc, /<h3 class="dmd-card-title">\$\{unsafeHTML\(this\._autoTitle\)\}<\/h3>/);
  assert.match(cardSrc, /<p class="dmd-card-subtitle">\$\{unsafeHTML\(this\._autoDescription\)\}<\/p>/);
  assert.match(cardSrc, /<div class="dmd-card-footer">\$\{unsafeHTML\(this\._autoFooter\)\}<\/div>/);
  // The header row (badge/icon) still shows up for an inferred title alone.
  assert.match(cardSrc, /this\.title \|\| this\._autoTitle \|\| this\.badge \|\| this\.icon/);
  // An inferred footer still reaches the bottom edge of an equal-height row.
  const footerBlock = /\.dmd-card-footer\s*\{[^}]*\}/.exec(mainCss)?.[0] ?? "";
  assert.match(footerBlock, /margin-top:\s*auto/);
});

test("container-style card headings are scaled through the host element", () => {
  // The card body is slotted light DOM: `.dmd-card-body h2` can only match
  // shadow-root content, so the host element is what reaches a body heading.
  assert.match(mainCss, /\.dmd-markdown-body dmd-card > h2,/);
  assert.match(mainCss, /\.dmd-markdown-body dmd-card > h3,/);
  assert.match(mainCss, /\.dmd-markdown-body dmd-card > h4 \{/);
  const headingBlock = /\.dmd-markdown-body dmd-card > h4 \{([^}]*)\}/.exec(mainCss)?.[1] ?? "";
  assert.match(headingBlock, /font-size:\s*1rem/);
  assert.match(headingBlock, /margin-top:\s*0\.25rem/);
});

test("cloneCard carries the adopted outline onto the carousel duplicate", () => {
  // The wrap-around slides clone a card, but `cloneNode(true)` only copies the
  // surviving light DOM — an adopted title/footer has already been removed from
  // the body, so the inferred chrome must be copied over by hand.
  assert.match(cardSrc, /cloneCard\(\): DmdCard \{/);
  assert.match(cardSrc, /const copy = this\.cloneNode\(true\) as DmdCard;/);
  assert.match(cardSrc, /copy\._autoTitle = this\._autoTitle;/);
  assert.match(cardSrc, /copy\._autoDescription = this\._autoDescription;/);
  assert.match(cardSrc, /copy\._autoFooter = this\._autoFooter;/);
});

test("Markdown adopted into card chrome keeps its inline code look", () => {
  assert.match(mainCss, /\.dmd-card-title code,/);
  assert.match(mainCss, /\.dmd-card-subtitle code,/);
  assert.match(mainCss, /\.dmd-card-footer code \{/);
});
