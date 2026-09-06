import assert from "node:assert/strict";
import { test } from "node:test";
import { carouselWindow } from "../src/runtime/components/Builtins";
import { processAlerts } from "../src/runtime/markdown/callouts";
import { renderCodeBlock } from "../src/runtime/markdown/highlighter";
import { renderMath } from "../src/runtime/markdown/katex";
import {
  buildMermaidConfig,
  calculateDiagramCameraBounds,
  calculateDiagramFit,
  decodeDiagramSource,
  encodeDiagramSource,
  extractDiagramSubgraphs,
  formatDiagramMarkdown,
  formatDiagramSubgraphMarkdown,
  isDiagramFamily,
  panDiagramCamera,
  readDiagramSize,
} from "../src/runtime/markdown/mermaid";
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

test("math is not parsed inside inline code or fenced code blocks", () => {
  const raw = [
    "Use `$E=mc^2$` literally, or `` `$E = mc^2$` `` too, or:",
    "",
    "```js",
    "const price = `$5 and $10`;",
    "```",
    "",
    "````markdown",
    "```js",
    "const price = `$5 and $10`;",
    "```",
    "````",
    "",
    "Real math: $a^2+b^2=c^2$",
  ].join("\n");

  const rendered = renderMath(raw);
  // Code spans and fences stay literal (this is what corrupted KaTeX pages before)
  assert.ok(rendered.includes("`$E=mc^2$`"));
  assert.ok(rendered.includes("`` `$E = mc^2$` ``"));
  assert.ok(rendered.includes("const price = `$5 and $10`;"));
  // Real math still renders
  assert.match(rendered, /katex/);
  assert.ok(rendered.includes("a^2+b^2=c^2") === false || rendered.includes("katex-html"));
});

test("markdown page mixing math, code spans, and display math renders cleanly", () => {
  const md = [
    "Render inline math with single dollar signs `$ ... $` like $f(x) = \\sin(x)$:",
    "",
    "$$",
    "\\int_0^1 x\\,dx = \\frac{1}{2}",
    "$$",
  ].join("\n");

  const parsed = parseMarkdown(md, "test");
  assert.match(parsed.html, /katex/);
  assert.ok(parsed.html.includes("<code>$ ... $</code>"));
  // KaTeX output must never appear escaped as visible text
  assert.doesNotMatch(parsed.html, /&lt;span class=&quot;katex&quot;/);
});

test("highlighter aliases languages and never fakes highlighting", () => {
  const ts = renderCodeBlock("const x: number = 1;", "ts");
  assert.match(ts, /token keyword/);
  assert.ok(ts.includes('data-lang="typescript"'));

  const unknown = renderCodeBlock("plain text here", "notalanguage");
  assert.ok(unknown.includes("plain text here"));
  assert.doesNotMatch(unknown, /token keyword/);
});

test("Mermaid engine builds deterministic base themes per family and mode", () => {
  const terminalDark = buildMermaidConfig("terminal", "dark");
  assert.equal(terminalDark.theme, "base");
  assert.equal(terminalDark.htmlLabels, false);
  assert.equal(terminalDark.flowchart?.htmlLabels, false);
  assert.equal(terminalDark.securityLevel, "strict");
  assert.equal(terminalDark.suppressErrorRendering, true);
  assert.equal(terminalDark.themeVariables.darkMode, true);
  // Terminal dark palette values straight from FAMILY_TOKENS.
  assert.equal(terminalDark.themeVariables.lineColor, "#39e87f");
  assert.equal(terminalDark.themeVariables.primaryTextColor, "#d8e6d8");
  assert.match(String(terminalDark.fontFamily), /mono/i);

  const atlasLight = buildMermaidConfig("atlas", "light");
  assert.equal(atlasLight.themeVariables.darkMode, false);
  assert.equal(atlasLight.themeVariables.background, "#f7f7f5");
  assert.equal(atlasLight.themeVariables.lineColor, "#315cf5");

  // Explicit tokens win over family defaults (config accent overrides).
  const custom = buildMermaidConfig("atlas", "dark", {
    canvas: "#000000",
    surface: "#111111",
    surfaceRaised: "#222222",
    ink: "#ffffff",
    inkSecondary: "#cccccc",
    rule: "#333333",
    accent: "#ff0000",
    codeSurface: "#0a0a0a",
    codeInk: "#eeeeee",
    fontFamily: "monospace",
  });
  assert.equal(custom.themeVariables.lineColor, "#ff0000");
});

test("diagram placeholders round-trip unicode sources through attributes", () => {
  const source = 'graph TD\nA["café ☕"] --> B{ok?}';
  assert.equal(decodeDiagramSource(encodeDiagramSource(source)), source);
  const placeholder = renderCodeBlock(source, "mermaid");
  assert.match(placeholder, /class="dmd-diagram-host"/);
  assert.doesNotMatch(placeholder, /class="dmd-diagram"/);
  assert.equal(isDiagramFamily("terminal"), true);
  assert.equal(isDiagramFamily("neon"), false);
});

test("diagram copy actions produce portable graph and subgraph Markdown", () => {
  const source = "graph LR\nA[Input] --> B[Rendered docs]";
  assert.equal(formatDiagramMarkdown(`\n${source}\n`), `\`\`\`mermaid\n${source}\n\`\`\``);

  const architecture = `graph TD
    subgraph Outer ["Outer system"]
        A[Input]
        subgraph Inner ["Inner process"]
            B[Transform]
        end
    end
    A --> B`;
  const subgraphs = extractDiagramSubgraphs(architecture);
  assert.equal(subgraphs.length, 2);
  assert.deepEqual(
    subgraphs.map(({ id, label }) => ({ id, label })),
    [
      { id: "Outer", label: "Outer system" },
      { id: "Inner", label: "Inner process" },
    ],
  );
  assert.match(subgraphs[0].source, /subgraph Inner/);
  assert.match(subgraphs[0].source, /^\s*subgraph Outer/m);
  assert.equal(
    formatDiagramSubgraphMarkdown(architecture, subgraphs[1].source),
    `\`\`\`mermaid\ngraph TD\nsubgraph Inner ["Inner process"]\n    B[Transform]\nend\n\`\`\``,
  );
});

test("diagram camera reads SVG bounds and fits without clipping", () => {
  const diagram = readDiagramSize('<svg viewBox="-8 -8 960 1200" width="100%"></svg>');
  assert.deepEqual(diagram, { width: 960, height: 1200 });
  assert.equal(calculateDiagramFit(diagram!, { width: 720, height: 1200 }), 0.75);
  assert.equal(calculateDiagramFit(diagram!, { width: 720, height: 600 }), 0.5);
  assert.equal(calculateDiagramFit({ width: 400, height: 300 }, { width: 800, height: 600 }), 1);
  assert.equal(readDiagramSize("<svg></svg>"), null);
});

test("diagram camera returns bounded pan remainder for document scroll handoff", () => {
  const bounds = calculateDiagramCameraBounds({ width: 900, height: 1200 }, { width: 700, height: 600 });
  assert.deepEqual(bounds, { x: 100, y: 300 });

  const inside = panDiagramCamera({ x: 0, y: 0 }, { x: -40, y: -120 }, bounds);
  assert.deepEqual(inside, { camera: { x: -40, y: -120 }, remainder: { x: 0, y: 0 } });

  const bottomHandoff = panDiagramCamera(inside.camera, { x: 0, y: -240 }, bounds);
  assert.deepEqual(bottomHandoff, { camera: { x: -40, y: -300 }, remainder: { x: 0, y: -60 } });

  const topHandoff = panDiagramCamera({ x: 0, y: 280 }, { x: 0, y: 70 }, bounds);
  assert.deepEqual(topHandoff, { camera: { x: 0, y: 300 }, remainder: { x: 0, y: 50 } });
});

test("architecture overview fit keeps measured SVG content in document layout", () => {
  // Browser getBBox() expands Mermaid's too-short nominal viewBox to include
  // the complete third output cluster before the camera computes Fit.
  const measuredArchitecture = { width: 813.302, height: 1132.5 };
  const fit = calculateDiagramFit(measuredArchitecture, { width: 681, height: measuredArchitecture.height });
  assert.ok(fit > 0.83 && fit < 0.85);
  assert.equal(Math.round(measuredArchitecture.height * fit), 948);
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

test("headings expose inline HTML for display and clean plain text for search", () => {
  const raw = "React &middot; ![GitHub license](https://img.shields.io/badge/a.svg) and `npm test`";
  const parsed = parseMarkdown(`# ${raw}`, "README");
  const heading = parsed.headings[0];

  assert.equal(heading.level, 1);
  assert.equal(heading.text, "React · GitHub license and npm test");
  assert.match(heading.html!, /<img src="https:\/\/img\.shields\.io\/badge\/a\.svg"/);
  assert.match(heading.html!, /alt="GitHub license"/);
  assert.match(heading.html!, /<code>npm test<\/code>/);
  assert.match(heading.html!, /middot;/);
  assert.doesNotMatch(heading.html!, /&amp;(?:middot|amp|lt|gt);/);
  assert.match(parsed.html, /<img src="https:\/\/img\.shields\.io\/badge\/a\.svg"/);

  // Anchor IDs must remain byte-identical so existing deep links keep working:
  // the slug comes from marked's token text (image tokens reduce to their alt).
  assert.equal(heading.id, "react-middot-github-license-and-npm-test");
});

test("heading plain text keeps snake_case and decodes badge-link labels", () => {
  const parsed = parseMarkdown(
    "# [![CI](https://ci.example/badge.svg)](https://ci.example/runs) for `some_var_name`",
    "README",
  );

  assert.equal(parsed.headings[0].text, "CI for some_var_name");
  // The page map strips the nested anchor and keeps the badge image.
  assert.match(parsed.headings[0].html!, /<img src="https:\/\/ci\.example\/badge\.svg"/);
});

test("carouselWindow slides a full window with wrap-around", () => {
  // 5 cards, 2 per view: 4 positions, every window stays full
  assert.deepEqual(carouselWindow(5, 2, 0).indices, [0, 1]);
  assert.deepEqual(carouselWindow(5, 2, 3).indices, [3, 4]);
  assert.equal(carouselWindow(5, 2, 0).positions, 4);
  // Wraps backwards from the first position to the last
  assert.deepEqual(carouselWindow(5, 2, -1).indices, [3, 4]);
  // Wraps forwards past the last position to the first
  assert.deepEqual(carouselWindow(5, 2, 4).indices, [0, 1]);
  // Positions cap at total - perView + 1: start=2 normalizes back to position 0
  assert.deepEqual(carouselWindow(4, 3, 2).indices, [0, 1, 2]);
  assert.equal(carouselWindow(4, 3, 2).positions, 2);
  // Single column: one card per view, one position per card
  assert.deepEqual(carouselWindow(3, 1, 2).indices, [2]);
  assert.equal(carouselWindow(3, 1, 2).positions, 3);
  // Degenerate inputs stay safe
  assert.deepEqual(carouselWindow(0, 2, 0).indices, []);
  assert.deepEqual(carouselWindow(2, 3, 0).indices, [0, 1]);
  // Negative and fractional starts normalize into range
  assert.deepEqual(carouselWindow(5, 2, -5.7).indices, [2, 3]);
  assert.deepEqual(carouselWindow(5, 2, 8).indices, [0, 1]);
});

test("block-level custom components are not wrapped in <p> tags", () => {
  const singleLineAlert = '<Alert type="tip" title="Pro tip">Alerts take eight types</Alert>';
  const parsedSingle = parseMarkdown(singleLineAlert, "test");
  assert.doesNotMatch(parsedSingle.html, /<p>\s*<Alert/i);
  assert.doesNotMatch(parsedSingle.html, /<\/Alert>\s*<\/p>/i);
  assert.match(parsedSingle.html, /<Alert type="tip" title="Pro tip">/);

  const adjacentAlerts = [
    '<Alert type="tip" title="Pro tip">Tip content</Alert>',
    '<Alert type="danger" title="Danger zone">Danger content</Alert>',
  ].join("\n");
  const parsedAdjacent = parseMarkdown(adjacentAlerts, "test");
  assert.doesNotMatch(parsedAdjacent.html, /<p>\s*<Alert/i);
  assert.doesNotMatch(parsedAdjacent.html, /<\/Alert>\s*<\/p>/i);

  const cardGrid = [
    "<CardGrid cols={2}>",
    '  <Card title="Card 1" description="Desc 1" />',
    '  <Card title="Card 2" description="Desc 2" />',
    "</CardGrid>",
  ].join("\n");
  const parsedGrid = parseMarkdown(cardGrid, "test");
  assert.doesNotMatch(parsedGrid.html, /<p>\s*<CardGrid/i);
  assert.doesNotMatch(parsedGrid.html, /<\/CardGrid>\s*<\/p>/i);
  assert.match(parsedGrid.html, /<Card title="Card 1"/);
});

test("Card accepts arbitrary Markdown and HTML children without a title", () => {
  const md = [
    '<Card color="blue">',
    "  ### Quick start",
    "",
    "  Install with **npm**:",
    "",
    "  - zero config",
    "  - hot reload",
    "",
    "  ```sh",
    "  npx docmedown init",
    "  ```",
    "",
    '  <Badge type="success">STABLE</Badge>',
    "</Card>",
  ].join("\n");

  const parsed = parseMarkdown(md, "test");
  assert.doesNotMatch(parsed.html, /<p>\s*<Card/i);
  assert.match(parsed.html, /<Card color="blue">/);
  // Markdown inside the card body is parsed before marked (headings, bold, lists)
  assert.match(parsed.html, /<h3[^>]*>Quick start<\/h3>/);
  assert.match(parsed.html, /<strong>npm<\/strong>/);
  assert.match(parsed.html, /<li>zero config<\/li>/);
  // Fenced code inside the body is rendered immediately through the shared
  // code renderer — no raw backticks may leak into the final marked pass
  assert.match(parsed.html, /dmd-code-block-wrapper[\s\S]*npx docmedown init/);
  assert.doesNotMatch(parsed.html, /```/);
  // Nested custom component markup passes through untouched
  assert.match(parsed.html, /<Badge type="success">STABLE<\/Badge>/);
  // No <p> wrappers around the card or its close tag
  assert.doesNotMatch(parsed.html, /<\/Card>\s*<\/p>/i);
});

test("Card with a 4-space-indented body is dedented instead of read as code", () => {
  // Regression: nested inside <CardGrid>, a <Card> body is typically indented
  // 4+ spaces. Without dedenting, marked reads those lines as an indented code
  // block — headings parse (line one is trimmed) but bold/lists stay literal.
  const md = [
    "<CardGrid cols={2}>",
    '  <Card color="blue" title="Nested">',
    "    ### Heading",
    "    A paragraph with **bold** text.",
    "",
    "    - one",
    "    - two",
    "",
    "    ```sh",
    "    echo hi",
    "    ```",
    "  </Card>",
    "</CardGrid>",
  ].join("\n");

  const parsed = parseMarkdown(md, "test");
  assert.match(parsed.html, /<h3[^>]*>Heading<\/h3>/);
  assert.match(parsed.html, /<strong>bold<\/strong>/);
  assert.match(parsed.html, /<li>one<\/li>/);
  // It must NOT be wrapped as a single indented code block
  assert.doesNotMatch(parsed.html, /<pre><code>A paragraph/);
  assert.match(parsed.html, /dmd-code-block-wrapper[\s\S]*echo[\s\S]*hi/);
  assert.doesNotMatch(parsed.html, /```/);
});

test("universal <Item> is handled as a custom component, not <p>-wrapped", () => {
  // <Item> resolves to a container's child at render time; the parser must
  // recognise it as a component and pass it through without paragraph wrapping,
  // including when nested through intermediate elements.
  const direct = '<Accordion><Item title="Q">A</Item></Accordion>';
  const parsedDirect = parseMarkdown(direct, "test");
  assert.match(parsedDirect.html, /<Item title="Q"><p>A<\/p><\/Item>/);
  assert.doesNotMatch(parsedDirect.html, /<p>\s*<Item/i);

  const columns = '<Columns cols={2} type="card"><Item>One</Item><Item>Two</Item></Columns>';
  const parsedColumns = parseMarkdown(columns, "test");
  assert.match(parsedColumns.html, /<Columns[^>]*>/);
  assert.match(parsedColumns.html, /<Item><p>One<\/p><\/Item>/);
  assert.doesNotMatch(parsedColumns.html, /<p>\s*<Item/i);

  // Deeply nested through a wrapper element — still a component.
  const nested = '<Timeline><div><Item title="v2">Note</Item></div></Timeline>';
  const parsedNested = parseMarkdown(nested, "test");
  assert.match(parsedNested.html, /<Item title="v2"><p>Note<\/p><\/Item>/);
  assert.doesNotMatch(parsedNested.html, /<\/Item>\s*<\/p>/i);

  // <Item> inside <Tabs> resolves to <Tab> at render time; passes through.
  const tabs = '<Tabs type="postit"><Item label="via">content</Item></Tabs>';
  const parsedTabs = parseMarkdown(tabs, "test");
  assert.match(parsedTabs.html, /<Tabs type="postit">/);
  assert.match(parsedTabs.html, /<Item label="via"><p>content<\/p><\/Item>/);
  assert.doesNotMatch(parsedTabs.html, /<p>\s*<Item/i);
});

test("a fence inside a component body does not swallow following document content", () => {
  // Regression: raw inner fences used to pair with the next fence in the
  // document during the final marked pass, consuming everything in between.
  const md = [
    '<Card color="blue">',
    "  Body with code:",
    "",
    "  ```sh",
    "  npx docmedown init",
    "  ```",
    "</Card>",
    "",
    "```html",
    '<Card color="green">Later example</Card>',
    "```",
    "",
    "Trailing paragraph after the second fence.",
  ].join("\n");

  const parsed = parseMarkdown(md, "test");
  // The first fence renders as code and the second (top-level) fence is still
  // an intact code block containing the later example's literal source
  assert.match(parsed.html, /dmd-code-block-wrapper[\s\S]*npx docmedown init/);
  assert.match(parsed.html, /Later example/);
  assert.match(parsed.html, /<p>Trailing paragraph after the second fence\.<\/p>/);
  assert.doesNotMatch(parsed.html, /```/);
});

test("Card title is optional and color attribute is preserved for the React component", () => {
  const noTitle = parseMarkdown('<Card color="green">Body only.</Card>', "test");
  assert.match(noTitle.html, /<Card color="green">/);
  assert.match(noTitle.html, /<p>Body only.<\/p>/);

  const freeColor = parseMarkdown('<Card color="#ff6600">Tinted.</Card>', "test");
  assert.match(freeColor.html, /<Card color="#ff6600">/);

  const withTitle = parseMarkdown('<Card title="Legacy" description="Still works" />', "test");
  assert.match(
    withTitle.html,
    /<Card title="Legacy" description="Still works" ?\/?><\/Card>|<Card title="Legacy" description="Still works" ?><\/Card>/,
  );
});

test("inline custom components remain inline inside paragraphs", () => {
  const inlineBadge = '<Badge type="info">INFO</Badge> <Badge type="success">STABLE</Badge>';
  const parsed = parseMarkdown(inlineBadge, "test");
  // Inline badges authored together stay inside paragraph markup
  assert.match(parsed.html, /<p><Badge type="info">INFO<\/Badge> <Badge type="success">STABLE<\/Badge><\/p>/);
});
