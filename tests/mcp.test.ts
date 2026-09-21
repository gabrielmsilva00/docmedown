import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer, type DocToolkit, loadBuiltSite, searchDocs } from "../src/cli/commands/mcp";
import type { DocManifest } from "../src/runtime/types";

function createBuiltFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-mcp-"));
  const manifest: DocManifest = {
    version: "1.0.0",
    generatedAt: "2026-09-07T00:00:00.000Z",
    config: { name: "MCP Docs", url: "https://mcp.test", description: "MCP fixture" } as any,
    docs: [
      {
        slug: "README",
        path: "README.md",
        title: "Home",
        frontmatter: {},
        headings: [{ level: 1, text: "Home", id: "home" }],
        content: "# Home\n\nWelcome to the MCP fixture docs.",
        readingTimeMinutes: 1,
        lastModified: "2026-09-07T00:00:00.000Z",
      },
      {
        slug: "guides/deploy",
        path: "guides/deploy.md",
        title: "Deploy Guide",
        category: "guides",
        frontmatter: {},
        headings: [{ level: 1, text: "Deploy Guide", id: "deploy-guide" }],
        content: "# Deploy Guide\n\nDeploy with the CLI and host on any static server.",
        readingTimeMinutes: 2,
        lastModified: "2026-09-07T00:00:00.000Z",
      },
    ],
    tree: [],
  };
  fs.writeFileSync(path.join(root, "_manifest.json"), JSON.stringify(manifest), "utf-8");
  const docsJs = `window.__DOCMEDOWN_DATA__ = ${JSON.stringify(
    {
      manifest,
      docs: {
        README: "# Home\n\nWelcome to the MCP fixture docs.",
        "guides/deploy": "# Deploy Guide\n\nDeploy with the CLI and host on any static server.",
      },
    },
    null,
    2,
  )};\n`;
  fs.writeFileSync(path.join(root, "_docs.js"), docsJs, "utf-8");
  return root;
}

test("loadBuiltSite reads manifest and embedded docs without a source tree", () => {
  const root = createBuiltFixture();
  const toolkit = loadBuiltSite(root);
  assert.ok(toolkit);
  assert.equal(toolkit!.manifest.docs.length, 2);
  assert.ok(toolkit!.docs.README?.includes("Welcome to the MCP fixture docs."));
  assert.equal(loadBuiltSite(path.join(os.tmpdir(), "dmd-mcp-missing")), null);
});

test("searchDocs ranks title matches above content matches", () => {
  const root = createBuiltFixture();
  const toolkit = loadBuiltSite(root)!;
  const results = searchDocs(toolkit, "deploy");
  assert.equal(results.length, 1);
  assert.equal(results[0].slug, "guides/deploy");
  assert.ok(results[0].snippet.toLowerCase().includes("deploy"));
  assert.equal(searchDocs(toolkit, "zzzz-no-match").length, 0);
});

test("MCP tools serve the docmd #221 output shape over InMemoryTransport", async () => {
  const root = createBuiltFixture();
  const toolkit: DocToolkit = loadBuiltSite(root)!;

  const server = createMcpServer(toolkit);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    const listed = await client.callTool({ name: "list_docs", arguments: {} });
    const listedText = (listed.content as Array<{ type: string; text: string }>)[0].text;
    assert.ok(listedText.includes("guides/deploy"));
    assert.ok(listedText.includes("Deploy Guide"));

    const read = await client.callTool({ name: "read_doc", arguments: { slug: "guides/deploy" } });
    const readText = (read.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(readText);
    assert.equal(parsed.slug, "guides/deploy");
    assert.equal(parsed.title, "Deploy Guide");
    assert.ok(parsed.content.includes("Deploy with the CLI"));
    assert.ok(Array.isArray(parsed.headings) && parsed.headings.length === 1);
    assert.equal(parsed.lastModified, "2026-09-07T00:00:00.000Z");

    const search = await client.callTool({ name: "search_docs", arguments: { query: "static server" } });
    const searchText = (search.content as Array<{ type: string; text: string }>)[0].text;
    assert.ok(searchText.includes("guides/deploy"));

    const resolved = await client.callTool({ name: "resolve_url", arguments: { slug: "guides/deploy" } });
    const resolvedText = (resolved.content as Array<{ type: string; text: string }>)[0].text;
    assert.ok(resolvedText.includes("https://mcp.test/guides/deploy/"));

    const missing = await client.callTool({ name: "read_doc", arguments: { slug: "nope" } });
    assert.equal((missing as any).isError, true);
  } finally {
    await client.close();
    await server.close();
  }
});
