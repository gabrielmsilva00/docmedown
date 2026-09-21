import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { emitAiContextFiles } from "../src/cli/ai-context";
import { shouldWatchDocumentationSource } from "../src/cli/commands/build";
import {
  emitStaticSite,
  generateRobotsTxt,
  generateSitemap,
  getAssetPrefix,
  getStaticPagePath,
  renderStaticPage,
} from "../src/cli/seo";
import { generateManifest } from "../src/cli/utils/scanner";
import { normalizeConfig } from "../src/runtime/config";

function createFixture(): { root: string; config: any } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-static-"));
  fs.writeFileSync(
    path.join(root, "README.md"),
    "---\ntitle: Home\ndescription: The home page\n---\n\n# Home\n\nWelcome to the **docs**.\n",
    "utf-8",
  );
  fs.mkdirSync(path.join(root, "guides"));
  fs.writeFileSync(
    path.join(root, "guides", "intro.md"),
    "# Intro\n\nHello world guide content.\n\n## Setup\n\nRun the thing.\n",
    "utf-8",
  );
  fs.writeFileSync(
    path.join(root, "docs.json"),
    JSON.stringify({ name: "Test Docs", url: "https://docs.test", description: "Test corpus" }),
    "utf-8",
  );
  const config = normalizeConfig(JSON.parse(fs.readFileSync(path.join(root, "docs.json"), "utf-8")));
  return { root, config };
}

function buildCorpus(root: string): Record<string, string> {
  return {
    README: fs.readFileSync(path.join(root, "README.md"), "utf-8"),
    "guides/intro": fs.readFileSync(path.join(root, "guides", "intro.md"), "utf-8"),
  };
}

test("static page paths and asset prefixes follow slug depth", () => {
  assert.equal(getStaticPagePath("README"), "index.html");
  assert.equal(getStaticPagePath("guides/intro"), "guides/intro/index.html");
  assert.equal(getAssetPrefix("README"), "");
  assert.equal(getAssetPrefix("examples"), "../");
  assert.equal(getAssetPrefix("guides/intro"), "../../");
  assert.equal(getAssetPrefix("api/v1/auth"), "../../../");
});

test("renderStaticPage emits full SEO head tags", () => {
  const { config } = createFixture();
  const doc = {
    slug: "guides/intro",
    path: "guides/intro.md",
    title: "Intro",
    frontmatter: { title: "Intro", description: "Guide intro page" },
    headings: [{ level: 1, text: "Intro", id: "intro" }],
    content: "# Intro\n\nHello.",
    readingTimeMinutes: 1,
    lastModified: "2026-09-07T00:00:00.000Z",
  } as any;
  const html = renderStaticPage({ config, doc, contentHtml: "<h1>Intro</h1>" });

  assert.ok(html.includes("<title>Intro | Test Docs</title>"));
  assert.ok(html.includes('<meta name="description" content="Guide intro page" />'));
  assert.ok(html.includes('<link rel="canonical" href="https://docs.test/guides/intro/" />'));
  assert.ok(html.includes('<meta property="og:title" content="Intro | Test Docs" />'));
  assert.ok(html.includes('<meta property="og:url" content="https://docs.test/guides/intro/" />'));
  assert.ok(html.includes('<meta name="twitter:card" content="summary" />'));
  assert.ok(html.includes('"@type":"TechArticle"'));
  assert.ok(html.includes("dateModified"));
  assert.ok(html.includes("../../_docs.js"));
  assert.ok(html.includes("../../docmedown.web.js"));
  assert.ok(html.includes('window.__DOCMEDOWN_STATIC_SLUG__="guides/intro"'));
  assert.ok(html.includes('window.__DOCMEDOWN_STATIC_BASE__="../../"'));
  // Prerendered pages open on the inline app-shell preview, not a blank canvas.
  assert.ok(html.includes('id="dmd-splash"'));
  assert.ok(html.includes("dmd-splash-progress"));
  assert.ok(html.includes("dmd-color-mode"));
});

test("renderStaticPage supports noindex frontmatter", () => {
  const { config } = createFixture();
  const doc = {
    slug: "drafts/secret",
    path: "drafts/secret.md",
    title: "Secret",
    frontmatter: { noindex: true },
    headings: [],
    content: "# Secret",
  } as any;
  const html = renderStaticPage({ config, doc, contentHtml: "<h1>Secret</h1>" });
  assert.ok(html.includes('<meta name="robots" content="noindex, nofollow" />'));
  assert.ok(!html.includes('rel="canonical"'));
});

test("sitemap and robots are generated only with a configured site URL", () => {
  const { root, config } = createFixture();
  const manifest = generateManifest(root, config);

  const sitemap = generateSitemap(manifest, config);
  assert.ok(sitemap?.includes("<loc>https://docs.test/</loc>"));
  assert.ok(sitemap?.includes("<loc>https://docs.test/guides/intro/</loc>"));

  const robots = generateRobotsTxt(config);
  assert.ok(robots?.includes("Sitemap: https://docs.test/sitemap.xml"));

  const noUrlConfig = normalizeConfig({ name: "No URL" });
  assert.equal(generateSitemap(manifest, noUrlConfig), null);
  assert.equal(generateRobotsTxt(noUrlConfig), null);
});

test("emitStaticSite prerenders nested pages, overwrites the standard home shell, and emits support files", () => {
  const { root, config } = createFixture();
  const manifest = generateManifest(root, config);
  const docsMap = buildCorpus(root);

  // Standard runtime shell: must be replaced by the prerendered home page.
  fs.writeFileSync(
    path.join(root, "index.html"),
    '<html><script src="./docmedown.iife.js" data-docmedown-runtime></script></html>',
    "utf-8",
  );

  const result = emitStaticSite(root, manifest, docsMap, config);
  assert.equal(result.homeSkipped, false);
  assert.ok(fs.existsSync(path.join(root, "guides", "intro", "index.html")));
  assert.ok(fs.existsSync(path.join(root, "404.html")));
  assert.ok(fs.existsSync(path.join(root, "sitemap.xml")));
  assert.ok(fs.existsSync(path.join(root, "robots.txt")));

  const home = fs.readFileSync(path.join(root, "index.html"), "utf-8");
  assert.ok(home.includes("<title>Test Docs</title>"));
  assert.ok(home.includes("Welcome to the"));
  assert.ok(home.includes('window.__DOCMEDOWN_STATIC_SLUG__="README"'));

  const intro = fs.readFileSync(path.join(root, "guides", "intro", "index.html"), "utf-8");
  assert.ok(intro.includes("Hello world guide content."));
  assert.ok(intro.includes('id="setup"'));

  // AI context files ride along with the build.
  const aiPaths = emitAiContextFiles(root, manifest, config);
  assert.equal(aiPaths.length, 4);
  assert.ok(fs.existsSync(path.join(root, "llms.txt")));
  assert.ok(fs.readFileSync(path.join(root, "SKILL.md"), "utf-8").startsWith("---"));
  const okf = JSON.parse(fs.readFileSync(path.join(root, "okf.json"), "utf-8"));
  assert.equal(okf.format, "docmedown-okf");
});

test("emitStaticSite never overwrites a custom home shell", () => {
  const { root, config } = createFixture();
  const manifest = generateManifest(root, config);
  fs.writeFileSync(path.join(root, "index.html"), "<html><body>Custom marketing page</body></html>", "utf-8");

  const result = emitStaticSite(root, manifest, {}, config);
  assert.equal(result.homeSkipped, true);
  assert.ok(fs.readFileSync(path.join(root, "index.html"), "utf-8").includes("Custom marketing page"));
});

test("watcher ignores generated static artifacts at any depth", () => {
  const root = createFixture().root;
  assert.equal(shouldWatchDocumentationSource(root, path.join(root, "index.html")), false);
  assert.equal(shouldWatchDocumentationSource(root, path.join(root, "guides", "intro", "index.html")), false);
  assert.equal(shouldWatchDocumentationSource(root, path.join(root, "sitemap.xml")), false);
  assert.equal(shouldWatchDocumentationSource(root, path.join(root, "llms-full.txt")), false);
  assert.equal(shouldWatchDocumentationSource(root, path.join(root, "guides", "intro.md")), true);
  assert.equal(shouldWatchDocumentationSource(root, path.join(root, "docs.json")), true);
});

test("scanner never ingests generated AI context files as source documents", () => {
  const root = createFixture().root;
  fs.writeFileSync(path.join(root, "SKILL.md"), "# Agent skill\n\nGenerated file, not a doc.", "utf-8");
  fs.writeFileSync(path.join(root, "llms-full.txt"), "Generated plain text.", "utf-8");

  const files = generateManifest(root, normalizeConfig({ name: "T" }))
    .docs.map((doc) => doc.path)
    .sort();
  assert.deepEqual(files, ["README.md", "guides/intro.md"]);
  assert.ok(!files.includes("SKILL.md"));
});

test("build-time setup loads .dmd/setup.js and prerenders custom language tokens in static site", () => {
  const { root, config } = createFixture();
  const dmdDir = path.join(root, ".dmd");
  fs.mkdirSync(dmdDir, { recursive: true });
  fs.writeFileSync(
    path.join(dmdDir, "setup.js"),
    `
    if (typeof window !== "undefined" && window.DocMeDown?.registerLanguage) {
      window.DocMeDown.registerLanguage("testbuildlang", {
        keyword: /\\b(?:render|compute)\\b/,
        number: /\\b\\d+\\b/,
      }, "#ec4899");
    }
    `,
    "utf-8",
  );

  const testDoc = [
    "# Build-time custom grammar",
    "",
    '```testbuildlang title="compute.testbuildlang"',
    "compute 100",
    "render 200",
    "```",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(root, "guides", "custom.md"), testDoc, "utf-8");

  const manifest = generateManifest(root, config);
  const docsMap = {
    README: fs.readFileSync(path.join(root, "README.md"), "utf-8"),
    "guides/intro": fs.readFileSync(path.join(root, "guides", "intro.md"), "utf-8"),
    "guides/custom": testDoc,
  };

  emitStaticSite(root, manifest, docsMap, config);

  const staticPage = fs.readFileSync(path.join(root, "guides", "custom", "index.html"), "utf-8");
  assert.ok(staticPage.includes('class="token keyword">compute</span>'));
  assert.ok(staticPage.includes('class="token number">100</span>'));
  assert.ok(staticPage.includes("compute.testbuildlang"));
});
