import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { emitAiContextFiles } from "../src/cli/ai-context";
import { createMcpServer, type DocToolkit, searchDocs } from "../src/cli/commands/mcp";
import { generateSitemap, renderStaticPage } from "../src/cli/seo";
import { normalizeConfig } from "../src/runtime/config";
import { buildSidebarTree } from "../src/runtime/loader/auto-indexer";
import { type DocumentDiscoveryTarget, isDocumentDiscoverable } from "../src/runtime/publication";
import { DocSearchIndex } from "../src/runtime/search/search-index";
import type { DocFileItem, DocFrontmatter, DocManifest } from "../src/runtime/types";
import { makeTempDir } from "./helpers/temp";

function document(slug: string, frontmatter: DocFrontmatter = {}): DocFileItem {
  return {
    docId: slug,
    locale: "en",
    slug,
    path: `${slug}.md`,
    title: slug,
    frontmatter,
    headings: [],
    content: `# ${slug}\n\npublicationmarker`,
  };
}

function fixture(): DocManifest {
  return {
    version: "1",
    generatedAt: "2026-10-20T00:00:00.000Z",
    config: normalizeConfig({ name: "Publication", url: "https://docs.test" }),
    tree: [],
    docs: [
      document("visible"),
      document("hidden", { hidden: true }),
      document("noindex", { noindex: true }),
      document("both", { hidden: true, noindex: true }),
    ],
  };
}

test("discovery policy preserves each output's existing boolean semantics", () => {
  const targets: DocumentDiscoveryTarget[] = ["sidebar", "search", "sitemap", "seo", "ai", "mcp-search"];
  const cases: Array<[DocFrontmatter | undefined, boolean[]]> = [
    [undefined, [true, true, true, true, true, true]],
    [{ hidden: false, noindex: false }, [true, true, true, true, true, true]],
    [{ hidden: true }, [false, false, false, false, false, false]],
    [{ noindex: true }, [true, false, false, false, true, true]],
    [{ hidden: true, noindex: true }, [false, false, false, false, false, false]],
  ];
  for (const [frontmatter, expected] of cases) {
    assert.deepEqual(
      targets.map((target) => isDocumentDiscoverable(frontmatter, target)),
      expected,
    );
  }
});

test("navigation, search, sitemap, SEO and AI exports apply the documented policy", () => {
  const manifest = fixture();
  const index = new DocSearchIndex();
  index.addDocs(manifest.docs);
  assert.deepEqual(
    index.search("publicationmarker").map((result) => result.slug),
    ["visible"],
  );
  const tree = buildSidebarTree(
    manifest.docs.map((doc) => doc.path),
    Object.fromEntries(manifest.docs.map((doc) => [doc.path, doc.frontmatter])),
  );
  assert.deepEqual(tree.map((node) => node.slug).sort(), ["noindex", "visible"]);
  const sitemap = generateSitemap(manifest, manifest.config);
  assert.ok(sitemap?.includes("https://docs.test/visible/"));
  for (const doc of manifest.docs) {
    const html = renderStaticPage({ config: manifest.config, doc, contentHtml: doc.content ?? "" });
    assert.equal(html.includes('content="noindex, nofollow"'), doc.slug !== "visible");
    if (doc.slug !== "visible") assert.ok(!sitemap?.includes(`https://docs.test/${doc.slug}/`));
  }
  const root = makeTempDir("dmd-publication");
  emitAiContextFiles(root, manifest, manifest.config);
  for (const name of ["llms.txt", "llms-full.txt", "SKILL.md"]) {
    const content = fs.readFileSync(path.join(root, name), "utf8");
    assert.ok(content.includes("https://docs.test/visible/"));
    assert.ok(content.includes("https://docs.test/noindex/"));
    assert.ok(!content.includes("https://docs.test/hidden/"));
    assert.ok(!content.includes("https://docs.test/both/"));
  }
  const okf = JSON.parse(fs.readFileSync(path.join(root, "okf.json"), "utf8"));
  assert.deepEqual(okf.documents.map((doc: { slug: string }) => doc.slug).sort(), ["noindex", "visible"]);
});

test("browser search removes stale entries when discovery flags change", () => {
  for (const frontmatter of [{ hidden: true }, { noindex: true }]) {
    const index = new DocSearchIndex();
    index.addDoc(document("changing"));
    assert.equal(index.search("publicationmarker").length, 1);
    index.addDoc(document("changing", frontmatter));
    assert.deepEqual(index.search("publicationmarker"), []);
    index.addDoc(document("changing"));
    assert.equal(index.search("publicationmarker").length, 1);
  }
});

test("localized AI exports apply discovery flags to the selected translation", () => {
  const manifest = fixture();
  manifest.config = normalizeConfig({
    name: "Localized publication",
    url: "https://docs.test",
    i18n: { defaultLocale: "en", locales: [{ code: "en" }, { code: "fr" }] },
  });
  manifest.docs.push(
    { ...document("visible.fr", { hidden: true }), docId: "visible", locale: "fr" },
    { ...document("noindex.fr", { noindex: true }), docId: "noindex", locale: "fr" },
  );
  const root = makeTempDir("dmd-publication-localized");
  emitAiContextFiles(root, manifest, manifest.config);
  const localized = JSON.parse(fs.readFileSync(path.join(root, "okf.fr.json"), "utf8"));
  assert.deepEqual(
    localized.documents.map((doc: { slug: string }) => doc.slug),
    ["noindex.fr"],
  );
  for (const name of ["llms.fr.txt", "llms-full.fr.txt"]) {
    const content = fs.readFileSync(path.join(root, name), "utf8");
    assert.ok(content.includes("https://docs.test/noindex.fr/"));
    assert.ok(!content.includes("https://docs.test/visible.fr/"));
  }
});

test("MCP preserves searchable noindex pages and direct access to hidden pages", async () => {
  const manifest = fixture();
  const toolkit: DocToolkit = { manifest, docs: {} };
  assert.deepEqual(
    searchDocs(toolkit, "publicationmarker")
      .map((result) => result.slug)
      .sort(),
    ["noindex", "visible"],
  );
  const server = createMcpServer(toolkit);
  const client = new Client({ name: "publication-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const listing = await client.callTool({ name: "list_docs", arguments: {} });
    const listingText = (listing.content as Array<{ type: string; text: string }>)[0].text;
    const payload = JSON.parse(listingText);
    assert.equal(payload.count, manifest.docs.length);
    assert.ok(payload.docs.some((doc: { slug: string }) => doc.slug === "hidden"));
    const reading = await client.callTool({ name: "read_doc", arguments: { slug: "hidden" } });
    assert.ok(!reading.isError);
    const readingText = (reading.content as Array<{ type: string; text: string }>)[0].text;
    assert.equal(JSON.parse(readingText).slug, "hidden");
  } finally {
    await client.close();
    await server.close();
  }
});
