import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { emitAiContextFiles } from "../src/cli/ai-context";
import { createMcpServer } from "../src/cli/commands/mcp";
import { generateSitemap, renderStaticPage } from "../src/cli/seo";
import { normalizeConfig } from "../src/runtime/config";
import { getCanonicalDocumentUrl, getDocumentUrl, getSiteBaseUrl } from "../src/runtime/document-url";
import type { DocConfig, DocFileItem, DocManifest } from "../src/runtime/types";
import { makeTempDir } from "./helpers/temp";

test("document URLs preserve deployment subpaths, root identity, and locale suffixes", () => {
  const config = { url: "https://docs.test/project///" };
  assert.equal(getSiteBaseUrl(config), "https://docs.test/project");
  assert.equal(getDocumentUrl(config, "README"), "https://docs.test/project/");
  assert.equal(getDocumentUrl(config, "README.fr"), "https://docs.test/project/README.fr/");
  assert.equal(getDocumentUrl(config, "guides/start.pt-br"), "https://docs.test/project/guides/start.pt-br/");
  assert.equal(getDocumentUrl({}, "README"), "/");
  assert.equal(getDocumentUrl({}, "guides/start"), "/guides/start/");
  assert.equal(getCanonicalDocumentUrl({}, "README"), null);
});

test("document URLs encode logical filename segments rather than URL syntax", () => {
  assert.equal(getDocumentUrl({}, "guides/hello world #1? 50%"), "/guides/hello%20world%20%231%3F%2050%25/");
  assert.equal(getDocumentUrl({}, "guides/café"), "/guides/caf%C3%A9/");
  assert.equal(getDocumentUrl({}, "literal%20name"), "/literal%2520name/");
});

function doc(slug: string): DocFileItem {
  return {
    docId: slug,
    locale: "en",
    slug,
    path: `${slug}.md`,
    title: "Guide",
    frontmatter: {},
    headings: [],
    content: "# Guide",
  };
}

for (const url of [undefined, "https://docs.test/project///"]) {
  test(`static metadata, sitemap, AI exports, and MCP agree ${url ? "with" : "without"} a deployment URL`, async () => {
    const config: DocConfig = normalizeConfig({ name: "URL parity", ...(url ? { url } : {}) });
    const documents = [doc("README"), doc("README.fr"), doc("guides/hello world #1?"), doc("guides/café")];
    const manifest: DocManifest = {
      version: "1",
      generatedAt: "2026-10-20T00:00:00.000Z",
      config,
      tree: [],
      docs: documents,
    };
    const root = makeTempDir("dmd-url-parity");
    emitAiContextFiles(root, manifest, config);
    const sitemap = generateSitemap(manifest, config);
    const server = createMcpServer({ manifest, docs: {} });
    const client = new Client({ name: "url-parity", version: "1" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      for (const document of documents) {
        const expected = getDocumentUrl(config, document.slug);
        const html = renderStaticPage({ config, doc: document, contentHtml: "<h1>Guide</h1>" });
        if (url) {
          assert.ok(html.includes(`<link rel="canonical" href="${expected}"`));
          assert.ok(html.includes(`<meta property="og:url" content="${expected}"`));
          assert.ok(sitemap?.includes(`<loc>${expected}</loc>`));
        } else {
          assert.ok(!html.includes('rel="canonical"'));
          assert.equal(sitemap, null);
        }
        for (const filename of ["llms.txt", "llms-full.txt", "SKILL.md"]) {
          assert.ok(fs.readFileSync(path.join(root, filename), "utf8").includes(expected));
        }
        const result = await client.callTool({ name: "resolve_url", arguments: { slug: document.slug } });
        assert.ok(!result.isError);
        const text = (result.content as Array<{ type: string; text: string }>)[0].text;
        assert.deepEqual(JSON.parse(text), { slug: document.slug, url: expected, siteUrl: getSiteBaseUrl(config) });
      }
    } finally {
      await client.close();
      await server.close();
    }
  });
}
