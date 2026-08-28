import assert from "node:assert/strict";
import { test } from "node:test";
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
