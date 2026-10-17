import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { buildCommand } from "../src/cli/commands/build";
import { validateCommand } from "../src/cli/commands/validate";
import { emitStaticSite } from "../src/cli/seo";
import { normalizeConfig } from "../src/runtime/config";
import {
  DEFAULT_EMBEDDED_DOCS,
  DMD_FOR_DEVELOPERS_MARKDOWN,
  DMD_NAV_GUIDE_MARKDOWN,
  embeddedDmdDocs,
  embeddedDmdVariant,
  getEmbeddedDmdDoc,
} from "../src/runtime/embedded-dmd";
import { buildSidebarTree } from "../src/runtime/loader/auto-indexer";
import { LocalDocLoader } from "../src/runtime/loader/local-loader";
import { parseMarkdown } from "../src/runtime/markdown/parser";
import { DocSearchIndex } from "../src/runtime/search/search-index";
import type { DocManifest } from "../src/runtime/types";
import { makeTempDir } from "./helpers/temp";

test("embedded guides have six native languages and English fallback independent of project originals", () => {
  const config = normalizeConfig({ i18n: { defaultLocale: "pt-BR", locales: [{ code: "pt-BR" }, { code: "ja" }] } });
  const docs = embeddedDmdDocs(config);
  assert.ok(docs["DMD.pt-br"].includes("Navegar na documentação"));
  assert.equal(docs["DMD.ja"], DMD_NAV_GUIDE_MARKDOWN);
  assert.equal(embeddedDmdVariant("DMD.ja", config)?.locale, "en");
  assert.equal(embeddedDmdVariant("DMD.pt-br", config)?.locale, "pt-BR");
  assert.ok(docs.DMD.includes("Navegar na documentação"));
  assert.ok(docs["DMD/for-developers.pt-br"].includes("](/DMD)"));
  assert.ok(!docs["DMD.fr"], "project builds should omit unselected translations");
  for (const code of ["en", "pt-br", "es", "fr", "de", "zh-cn"]) {
    for (const id of ["DMD", "DMD/for-developers"]) {
      const raw = DEFAULT_EMBEDDED_DOCS[`${id}.${code}`];
      assert.ok(raw);
      assert.equal(parseMarkdown(raw, id).frontmatter.noindex, true);
      assert.equal(getEmbeddedDmdDoc(`./${id}.${code}.md`), raw);
    }
  }
});

test("local and remote-capable loaders resolve built-ins without network access", async () => {
  const loader = new LocalDocLoader();
  assert.equal(await loader.fetchDocContent("DMD.zh-cn.md"), DEFAULT_EMBEDDED_DOCS["DMD.zh-cn"]);
  assert.equal(loader.peekDocContent("DMD/for-developers.de.md"), DEFAULT_EMBEDDED_DOCS["DMD/for-developers.de"]);
});

test("localized prerendering tolerates build-time setup window without browser events", () => {
  const original = (globalThis as any).window;
  try {
    (globalThis as any).window = {};
    const parsed = parseMarkdown(
      "# Test\n\n[Guia](guide.md)",
      "README.pt-br",
      normalizeConfig({ i18n: { locales: [{ code: "pt-BR" }] } }),
    );
    assert.ok(parsed.html.includes("guide.pt-br"));
  } finally {
    if (original === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = original;
  }
});

test("DEFAULT_EMBEDDED_DOCS defines navigation guide and developer kickstart guide", () => {
  assert.ok(DEFAULT_EMBEDDED_DOCS.DMD, "DMD key must exist in DEFAULT_EMBEDDED_DOCS");
  assert.ok(DEFAULT_EMBEDDED_DOCS["DMD/for-developers"], "DMD/for-developers must exist in DEFAULT_EMBEDDED_DOCS");

  // Navigation guide contents
  assert.ok(DMD_NAV_GUIDE_MARKDOWN.includes("Navigating DocMeDown Documentation"));
  assert.ok(DMD_NAV_GUIDE_MARKDOWN.includes("Ctrl"));
  assert.ok(DMD_NAV_GUIDE_MARKDOWN.includes("Search Modal"));
  assert.ok(DMD_NAV_GUIDE_MARKDOWN.includes("Table of Contents"));
  assert.ok(DMD_NAV_GUIDE_MARKDOWN.includes("Breadcrumbs"));
  assert.ok(DMD_NAV_GUIDE_MARKDOWN.includes("Reading Progress"));
  assert.ok(DMD_NAV_GUIDE_MARKDOWN.includes("Code Blocks"));
  assert.ok(DMD_NAV_GUIDE_MARKDOWN.includes("Tables"));
  assert.ok(DMD_NAV_GUIDE_MARKDOWN.includes("DMD/for-developers"));

  // Developer subpage contents
  assert.ok(DMD_FOR_DEVELOPERS_MARKDOWN.includes("DocMeDown for Developers"));
  assert.ok(DMD_FOR_DEVELOPERS_MARKDOWN.includes("npx docmedown serve"));
  assert.ok(DMD_FOR_DEVELOPERS_MARKDOWN.includes("npx docmedown init"));
  assert.ok(DMD_FOR_DEVELOPERS_MARKDOWN.includes("docs.json"));
  assert.ok(DMD_FOR_DEVELOPERS_MARKDOWN.includes(".dmd/"));
  assert.ok(DMD_FOR_DEVELOPERS_MARKDOWN.includes("GitHub Pages"));
  assert.ok(DMD_FOR_DEVELOPERS_MARKDOWN.includes("[← Back to Navigation Guide](DMD)"));

  // Helper lookup
  assert.equal(getEmbeddedDmdDoc("DMD"), DMD_NAV_GUIDE_MARKDOWN);
  assert.equal(getEmbeddedDmdDoc("DMD.md"), DMD_NAV_GUIDE_MARKDOWN);
  assert.equal(getEmbeddedDmdDoc("./DMD.md"), DMD_NAV_GUIDE_MARKDOWN);
  assert.equal(getEmbeddedDmdDoc("DMD/for-developers"), DMD_FOR_DEVELOPERS_MARKDOWN);
  assert.equal(getEmbeddedDmdDoc("DMD/for-developers.md"), DMD_FOR_DEVELOPERS_MARKDOWN);
});

test("DMD and DMD/for-developers carry hidden and noindex frontmatter", () => {
  const dmdParsed = parseMarkdown(DMD_NAV_GUIDE_MARKDOWN, "DMD");
  assert.equal(dmdParsed.frontmatter.hidden, true);
  assert.equal(dmdParsed.frontmatter.noindex, true);

  const devParsed = parseMarkdown(DMD_FOR_DEVELOPERS_MARKDOWN, "DMD/for-developers");
  assert.equal(devParsed.frontmatter.hidden, true);
  assert.equal(devParsed.frontmatter.noindex, true);

  // Hidden frontmatter prevents documents from appearing in the sidebar navigation
  const sidebar = buildSidebarTree(["DMD.md", "README.md"], {
    "DMD.md": dmdParsed.frontmatter,
    "README.md": { title: "Home" },
  });
  assert.equal(sidebar.length, 1);
  assert.equal(sidebar[0].slug, "README");
});

test("DocSearchIndex excludes hidden and noindex documents from search index", () => {
  const searchIndex = new DocSearchIndex();
  const dmdParsed = parseMarkdown(DMD_NAV_GUIDE_MARKDOWN, "DMD");

  searchIndex.addDoc({
    slug: "DMD",
    path: "DMD.md",
    title: dmdParsed.frontmatter.title || "DocMeDown Navigation Guide",
    frontmatter: dmdParsed.frontmatter,
    content: DMD_NAV_GUIDE_MARKDOWN,
  });

  searchIndex.addDoc({
    slug: "getting-started",
    path: "getting-started.md",
    title: "Getting Started with Our App",
    content: "Welcome to our application documentation.",
  });

  // Searching for DMD or Navigation should return 0 results because it is hidden/noindex
  const dmdResults = searchIndex.search("Navigation Guide");
  assert.equal(dmdResults.length, 0);

  // Normal documents are searchable
  const appResults = searchIndex.search("Getting Started");
  assert.equal(appResults.length, 1);
  assert.equal(appResults[0].slug, "getting-started");
});

test("LocalDocLoader retrieves embedded DMD documents from _docs.js payload", () => {
  (globalThis as any).window = {
    __DOCMEDOWN_DATA__: {
      docs: {
        ...DEFAULT_EMBEDDED_DOCS,
      },
    },
    location: { protocol: "file:" },
  };

  const loader = new LocalDocLoader();

  const peekedDmd = loader.peekDocContent("DMD");
  assert.ok(peekedDmd);
  assert.ok(peekedDmd.includes("Navigating DocMeDown Documentation"));

  const peekedDev = loader.peekDocContent("DMD/for-developers");
  assert.ok(peekedDev);
  assert.ok(peekedDev.includes("DocMeDown for Developers"));

  delete (globalThis as any).window;
});

test("buildCommand embeds DMD and DMD/for-developers in _docs.js by default", async () => {
  const workspace = makeTempDir("dmd-build-test-");
  try {
    fs.writeFileSync(path.join(workspace, "README.md"), "# Welcome to Test Site\n\nMain content.", "utf-8");

    await buildCommand(workspace, { singleFile: false, static: false });

    const docsJsPath = path.join(workspace, ".dmd", "_docs.js");
    assert.ok(fs.existsSync(docsJsPath), "_docs.js must be created");

    const docsJsContent = fs.readFileSync(docsJsPath, "utf-8");
    assert.ok(docsJsContent.includes('"DMD"'), '_docs.js must contain "DMD"');
    assert.ok(docsJsContent.includes('"DMD/for-developers"'), '_docs.js must contain "DMD/for-developers"');
    assert.ok(docsJsContent.includes("Navigating DocMeDown Documentation"));
    assert.ok(docsJsContent.includes("DocMeDown for Developers"));

    // Manifest should NOT list DMD (exclusive to footer)
    const manifestPath = path.join(workspace, ".dmd", "_manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const manifestSlugs = manifest.docs.map((d: any) => d.slug);
    assert.ok(!manifestSlugs.includes("DMD"), "Manifest must not index DMD");
    assert.ok(!manifestSlugs.includes("DMD/for-developers"), "Manifest must not index DMD/for-developers");
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("emitStaticSite prerenders DMD static pages with noindex meta tags", () => {
  const workspace = makeTempDir("dmd-static-test-");
  try {
    const config = normalizeConfig({ url: "https://example.com/docs" });
    const manifest: DocManifest = {
      docs: [
        {
          slug: "README",
          path: "README.md",
          title: "Overview",
          content: "# Overview",
        },
      ],
      tree: [],
    };
    const docsMap: Record<string, string> = {
      README: "# Overview",
      ...DEFAULT_EMBEDDED_DOCS,
    };

    const result = emitStaticSite(workspace, manifest, docsMap, config);

    assert.ok(result.written.includes("DMD/index.html"), "DMD/index.html must be prerendered");
    assert.ok(
      result.written.includes("DMD/for-developers/index.html"),
      "DMD/for-developers/index.html must be prerendered",
    );

    const dmdHtml = fs.readFileSync(path.join(workspace, "DMD", "index.html"), "utf-8");
    assert.ok(dmdHtml.includes('<meta name="robots" content="noindex, nofollow" />'));
    assert.ok(dmdHtml.includes("Navigating DocMeDown Documentation"));

    // Verify sitemap.xml does NOT include DMD
    const sitemap = fs.readFileSync(path.join(workspace, "sitemap.xml"), "utf-8");
    assert.ok(!sitemap.includes("/DMD/"));
    assert.ok(!sitemap.includes("/for-developers/"));
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("validateCommand accepts internal links pointing to DMD documents", async () => {
  const workspace = makeTempDir("dmd-validate-test-");
  try {
    fs.writeFileSync(
      path.join(workspace, "README.md"),
      "# Welcome\n\nSee our [Navigation Guide](DMD) and [Developer Guide](DMD/for-developers).",
      "utf-8",
    );

    const result = await validateCommand(workspace, { silent: true });
    assert.equal(result.valid, true, "Validation should pass without broken link errors for DMD");
    assert.equal(result.errors.length, 0);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("Content.svelte footer links to DMD with SPA navigation support", () => {
  const contentSveltePath = path.resolve(__dirname, "../src/ui/components/Content.svelte");
  const contentSvelte = fs.readFileSync(contentSveltePath, "utf-8");

  assert.ok(contentSvelte.includes('doc.navigate("DMD")'));
  assert.ok(contentSvelte.includes('doc.router.resolveLink("DMD"'));
  assert.ok(!contentSvelte.includes('href="https://github.com"'));
});
