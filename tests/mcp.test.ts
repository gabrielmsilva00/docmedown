import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  createMcpServer,
  type DocToolkit,
  loadBuiltSite,
  loadOrCreateToolkit,
  mcpCommand,
  searchDocs,
  startMcpSseServer,
} from "../src/cli/commands/mcp";
import type { DocManifest } from "../src/runtime/types";

function createBuiltFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-mcp-fixture-"));
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
        content:
          "---\ntitle: Deploy Guide\ncategory: guides\n---\n# Deploy Guide\n\nDeploy with the CLI and host on any static server.",
        readingTimeMinutes: 2,
        lastModified: "2026-09-07T00:00:00.000Z",
      },
      {
        slug: "internal/secret",
        path: "internal/secret.md",
        title: "Secret Internal Page",
        category: "internal",
        frontmatter: { hidden: true },
        headings: [{ level: 1, text: "Secret Page", id: "secret-page" }],
        content: "# Secret Page\n\nConfidential internal instructions for static hosting.",
        readingTimeMinutes: 1,
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
        "guides/deploy":
          "---\ntitle: Deploy Guide\ncategory: guides\n---\n# Deploy Guide\n\nDeploy with the CLI and host on any static server.",
        "internal/secret": "# Secret Page\n\nConfidential internal instructions for static hosting.",
      },
    },
    null,
    2,
  )};\n`;
  fs.writeFileSync(path.join(root, "_docs.js"), docsJs, "utf-8");
  return root;
}

function createUnbuiltFixture(
  options: { configType?: "docs.json" | "dmd.json" | "none"; configContent?: any } = {},
): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-unbuilt-"));

  if (options.configType === "docs.json" || options.configType === undefined) {
    fs.writeFileSync(
      path.join(root, "docs.json"),
      JSON.stringify(
        options.configContent || { name: "Zero Install Docs", url: "https://unbuilt.test", theme: { family: "atlas" } },
      ),
      "utf-8",
    );
  } else if (options.configType === "dmd.json") {
    fs.writeFileSync(
      path.join(root, "dmd.json"),
      JSON.stringify(options.configContent || { name: "DMD Fallback Docs", theme: { family: "blueprint" } }),
      "utf-8",
    );
  }

  fs.writeFileSync(
    path.join(root, "README.md"),
    "---\ntitle: Zero Install Home\n---\n# Zero Install Guide\n\nThis site was never pre-built with dmd build.",
    "utf-8",
  );

  const guidesDir = path.join(root, "guides");
  fs.mkdirSync(guidesDir, { recursive: true });
  fs.writeFileSync(
    path.join(guidesDir, "deploy.md"),
    "---\ntitle: Unbuilt Deploy\ncategory: guides\n---\n# Deploying Unbuilt\n\nDeploy unbuilt documentation directly.",
    "utf-8",
  );

  return root;
}

// ---------------------------------------------------------------------------
// 1. loadBuiltSite
// ---------------------------------------------------------------------------

test("loadBuiltSite reads manifest and embedded docs without a source tree", () => {
  const root = createBuiltFixture();
  const toolkit = loadBuiltSite(root);
  assert.ok(toolkit);
  assert.equal(toolkit!.manifest.docs.length, 3);
  assert.ok(toolkit!.docs.README?.includes("Welcome to the MCP fixture docs."));
  assert.ok(toolkit!.docs["guides/deploy"]?.includes("Deploy with the CLI"));
});

test("loadBuiltSite returns null when _manifest.json is missing or dir does not exist", () => {
  assert.equal(loadBuiltSite(path.join(os.tmpdir(), "dmd-mcp-nonexistent")), null);

  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-empty-"));
  assert.equal(loadBuiltSite(emptyDir), null);
});

test("loadBuiltSite returns null when _manifest.json contains invalid JSON syntax", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-corrupt-manifest-"));
  fs.writeFileSync(path.join(root, "_manifest.json"), "{ invalid json syntax !!", "utf-8");
  assert.equal(loadBuiltSite(root), null);
});

test("loadBuiltSite handles missing or malformed _docs.js gracefully", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-no-docsjs-"));
  const manifest: DocManifest = {
    version: "1.0.0",
    generatedAt: "2026-09-07T00:00:00.000Z",
    config: { name: "No DocsJS" } as any,
    docs: [],
    tree: [],
  };
  fs.writeFileSync(path.join(root, "_manifest.json"), JSON.stringify(manifest), "utf-8");

  // Missing _docs.js
  const toolkitNoDocs = loadBuiltSite(root);
  assert.ok(toolkitNoDocs);
  assert.deepEqual(toolkitNoDocs!.docs, {});

  // Malformed _docs.js
  fs.writeFileSync(path.join(root, "_docs.js"), "window.__DOCMEDOWN_DATA__ = invalid_json;", "utf-8");
  const toolkitCorruptDocs = loadBuiltSite(root);
  assert.ok(toolkitCorruptDocs);
  assert.deepEqual(toolkitCorruptDocs!.docs, {});
});

// ---------------------------------------------------------------------------
// 2. loadOrCreateToolkit
// ---------------------------------------------------------------------------

test("loadOrCreateToolkit dynamically indexes unbuilt markdown directory with docs.json", () => {
  const root = createUnbuiltFixture({ configType: "docs.json" });
  const toolkit = loadOrCreateToolkit(root);
  assert.ok(toolkit);
  assert.equal(toolkit!.manifest.config.name, "Zero Install Docs");
  assert.equal(toolkit!.manifest.docs.length, 2);
  assert.ok(toolkit!.docs.README.includes("This site was never pre-built"));
  assert.ok(toolkit!.docs["guides/deploy"].includes("Deploying Unbuilt"));
  assert.ok(toolkit!.docs["guides/deploy.md"].includes("Deploying Unbuilt"));
});

test("loadOrCreateToolkit falls back to dmd.json when docs.json is absent", () => {
  const root = createUnbuiltFixture({ configType: "dmd.json" });
  const toolkit = loadOrCreateToolkit(root);
  assert.ok(toolkit);
  assert.equal(toolkit!.manifest.config.name, "DMD Fallback Docs");
  assert.equal(toolkit!.manifest.docs.length, 2);
});

test("loadOrCreateToolkit uses default normalized config when no config file exists", () => {
  const root = createUnbuiltFixture({ configType: "none" });
  const toolkit = loadOrCreateToolkit(root);
  assert.ok(toolkit);
  assert.equal(toolkit!.manifest.config.name, "DocMeDown");
  assert.equal(toolkit!.manifest.docs.length, 2);
});

test("loadOrCreateToolkit normalizes index.md and README.md to README slug and indexes nested paths", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-index-slug-"));
  fs.writeFileSync(path.join(root, "index.md"), "# Index Title\n\nIndex page content.", "utf-8");
  const sub = path.join(root, "api", "v1");
  fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(path.join(sub, "reference.md"), "# API Reference\n\nEndpoints list.", "utf-8");

  const toolkit = loadOrCreateToolkit(root);
  assert.ok(toolkit);
  assert.equal(toolkit!.manifest.docs.length, 2);
  assert.ok(toolkit!.docs.README.includes("Index page content"));
  assert.ok(toolkit!.docs["api/v1/reference"].includes("Endpoints list"));
  assert.ok(toolkit!.docs["api/v1/reference.md"].includes("Endpoints list"));
});

test("loadOrCreateToolkit returns null for non-existent directory or directory with no markdown files", () => {
  assert.equal(loadOrCreateToolkit(path.join(os.tmpdir(), "dmd-zero-nonexistent")), null);

  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-empty-unbuilt-"));
  fs.writeFileSync(path.join(emptyDir, "some-file.txt"), "Not markdown", "utf-8");
  assert.equal(loadOrCreateToolkit(emptyDir), null);
});

test("loadOrCreateToolkit prioritizes pre-built artifacts when _manifest.json already exists", () => {
  const root = createBuiltFixture();
  // Modify a source file that shouldn't affect the pre-built manifest
  fs.writeFileSync(path.join(root, "README.md"), "# Newer source markdown", "utf-8");

  const toolkit = loadOrCreateToolkit(root);
  assert.ok(toolkit);
  // It loaded the built site which contains 3 docs from createBuiltFixture
  assert.equal(toolkit!.manifest.docs.length, 3);
  assert.equal(toolkit!.manifest.config.name, "MCP Docs");
});

// ---------------------------------------------------------------------------
// 3. searchDocs Algorithm & Relevance Ranking
// ---------------------------------------------------------------------------

test("searchDocs ranks title matches above headings, and headings above content", () => {
  const root = createBuiltFixture();
  const toolkit = loadBuiltSite(root)!;

  const results = searchDocs(toolkit, "deploy");
  assert.ok(results.length >= 1);
  assert.equal(results[0].slug, "guides/deploy");
  assert.ok(results[0].snippet.toLowerCase().includes("deploy"));
  assert.ok(results[0].score > 0);
});

test("searchDocs filters out documents with frontmatter hidden: true", () => {
  const root = createBuiltFixture();
  const toolkit = loadBuiltSite(root)!;

  // "secret" appears in internal/secret title and content
  const secretResults = searchDocs(toolkit, "secret");
  assert.equal(secretResults.length, 0);

  // "static hosting" appears in internal/secret content
  const staticResults = searchDocs(toolkit, "static hosting");
  // Only guides/deploy should match, internal/secret must be excluded
  assert.ok(staticResults.every((r) => r.slug !== "internal/secret"));
});

test("searchDocs respects limit parameter and clamps between 1 and 25", () => {
  const root = createBuiltFixture();
  const toolkit = loadBuiltSite(root)!;

  // Add more docs to test limit
  toolkit.manifest.docs.push(
    {
      slug: "page-1",
      path: "page-1.md",
      title: "Doc Guide One",
      frontmatter: {},
      headings: [],
      content: "deploy static content",
      readingTimeMinutes: 1,
    },
    {
      slug: "page-2",
      path: "page-2.md",
      title: "Doc Guide Two",
      frontmatter: {},
      headings: [],
      content: "deploy static content",
      readingTimeMinutes: 1,
    },
  );

  const limited1 = searchDocs(toolkit, "deploy", 1);
  assert.equal(limited1.length, 1);

  const limited2 = searchDocs(toolkit, "deploy", 2);
  assert.equal(limited2.length, 2);

  const zeroOrNegative = searchDocs(toolkit, "deploy", 0);
  assert.equal(zeroOrNegative.length, 1); // Math.max(1, limit) clamps to at least 1
});

test("searchDocs returns empty array for empty, whitespace, or single-character queries", () => {
  const root = createBuiltFixture();
  const toolkit = loadBuiltSite(root)!;

  assert.deepEqual(searchDocs(toolkit, ""), []);
  assert.deepEqual(searchDocs(toolkit, "   "), []);
  assert.deepEqual(searchDocs(toolkit, "a"), []);
  assert.deepEqual(searchDocs(toolkit, " x  y "), []);
});

test("searchDocs extracts clean snippets without frontmatter or markdown syntax markers", () => {
  const root = createBuiltFixture();
  const toolkit = loadBuiltSite(root)!;

  const results = searchDocs(toolkit, "CLI");
  assert.ok(results.length >= 1);
  const snippet = results[0].snippet;
  assert.ok(!snippet.includes("---"));
  assert.ok(!snippet.includes("title: Deploy Guide"));
  assert.ok(!snippet.startsWith("#"));
  assert.ok(snippet.includes("Deploy with the CLI"));
});

test("searchDocs returns empty array when query does not match any document", () => {
  const root = createBuiltFixture();
  const toolkit = loadBuiltSite(root)!;
  assert.equal(searchDocs(toolkit, "zzzz-completely-unmatched-term-1234").length, 0);
});

// ---------------------------------------------------------------------------
// 4. MCP Tool Schemas & Server Registration
// ---------------------------------------------------------------------------

test("createMcpServer registers all 4 expected tools with schemas and server metadata", async () => {
  const root = createBuiltFixture();
  const toolkit: DocToolkit = loadBuiltSite(root)!;

  const server = createMcpServer(toolkit);
  const client = new Client({ name: "schema-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    const toolsResult = await client.listTools();
    assert.ok(toolsResult.tools);
    const toolMap = new Map(toolsResult.tools.map((t) => [t.name, t]));

    // All 4 tools exist
    assert.ok(toolMap.has("list_docs"), "list_docs tool registered");
    assert.ok(toolMap.has("read_doc"), "read_doc tool registered");
    assert.ok(toolMap.has("search_docs"), "search_docs tool registered");
    assert.ok(toolMap.has("resolve_url"), "resolve_url tool registered");

    // Check descriptions
    assert.ok(toolMap.get("list_docs")!.description?.includes("MCP Docs"));
    assert.ok(toolMap.get("search_docs")!.description?.includes("MCP Docs"));

    // Check input schemas
    const readDocSchema = toolMap.get("read_doc")!.inputSchema as any;
    assert.equal(readDocSchema.type, "object");
    assert.ok(readDocSchema.properties.slug);
    assert.ok(readDocSchema.required?.includes("slug"));

    const searchDocsSchema = toolMap.get("search_docs")!.inputSchema as any;
    assert.equal(searchDocsSchema.type, "object");
    assert.ok(searchDocsSchema.properties.query);
    assert.ok(searchDocsSchema.properties.limit);
    assert.ok(searchDocsSchema.required?.includes("query"));

    const resolveUrlSchema = toolMap.get("resolve_url")!.inputSchema as any;
    assert.equal(resolveUrlSchema.type, "object");
    assert.ok(resolveUrlSchema.properties.slug);
    assert.ok(resolveUrlSchema.required?.includes("slug"));
  } finally {
    await client.close();
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// 5. In-Memory MCP Tool Execution (DocMeDown Protocol Contracts)
// ---------------------------------------------------------------------------

test("MCP list_docs tool returns complete corpus inventory with metadata", async () => {
  const root = createBuiltFixture();
  const toolkit: DocToolkit = loadBuiltSite(root)!;
  const server = createMcpServer(toolkit);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    const res = await client.callTool({ name: "list_docs", arguments: {} });
    assert.equal((res as any).isError, undefined);
    const content = (res.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(content);

    assert.equal(parsed.site, "MCP Docs");
    assert.equal(parsed.count, 3);
    assert.equal(parsed.docs.length, 3);

    const deployDoc = parsed.docs.find((d: any) => d.slug === "guides/deploy");
    assert.ok(deployDoc);
    assert.equal(deployDoc.title, "Deploy Guide");
    assert.equal(deployDoc.category, "guides");
    assert.equal(deployDoc.readingTimeMinutes, 2);
    assert.equal(deployDoc.lastModified, "2026-09-07T00:00:00.000Z");
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP read_doc tool returns frontmatter-stripped markdown, headings, and handles path variations", async () => {
  const root = createBuiltFixture();
  const toolkit: DocToolkit = loadBuiltSite(root)!;
  const server = createMcpServer(toolkit);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    // Standard slug
    const res1 = await client.callTool({ name: "read_doc", arguments: { slug: "guides/deploy" } });
    const text1 = (res1.content as Array<{ type: string; text: string }>)[0].text;
    const parsed1 = JSON.parse(text1);
    assert.equal(parsed1.slug, "guides/deploy");
    assert.equal(parsed1.title, "Deploy Guide");
    assert.ok(!parsed1.content.includes("---"));
    assert.ok(parsed1.content.startsWith("# Deploy Guide"));
    assert.deepEqual(parsed1.headings, [{ level: 1, text: "Deploy Guide", id: "deploy-guide" }]);

    // Slug with .md extension
    const res2 = await client.callTool({ name: "read_doc", arguments: { slug: "guides/deploy.md" } });
    assert.equal(JSON.parse((res2.content as any)[0].text).slug, "guides/deploy");

    // Slug with ./ prefix
    const res3 = await client.callTool({ name: "read_doc", arguments: { slug: "./guides/deploy.md" } });
    assert.equal(JSON.parse((res3.content as any)[0].text).slug, "guides/deploy");

    // Case-insensitive lookup
    const res4 = await client.callTool({ name: "read_doc", arguments: { slug: "GUIDES/DEPLOY" } });
    assert.equal(JSON.parse((res4.content as any)[0].text).slug, "guides/deploy");

    // Non-existent slug returns isError: true with guidance
    const resMissing = await client.callTool({ name: "read_doc", arguments: { slug: "nonexistent-doc" } });
    assert.equal((resMissing as any).isError, true);
    const missingText = (resMissing.content as any)[0].text;
    assert.ok(missingText.includes("Document not found: nonexistent-doc"));
    assert.ok(missingText.includes("Use list_docs to see available slugs"));
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP search_docs tool returns ranked results with snippets and query details", async () => {
  const root = createBuiltFixture();
  const toolkit: DocToolkit = loadBuiltSite(root)!;
  const server = createMcpServer(toolkit);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    const res = await client.callTool({ name: "search_docs", arguments: { query: "static server", limit: 5 } });
    const text = (res.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);

    assert.equal(parsed.query, "static server");
    assert.equal(parsed.count, 1);
    assert.equal(parsed.results[0].slug, "guides/deploy");
    assert.ok(parsed.results[0].snippet.includes("static server"));
    assert.ok(parsed.results[0].score > 0);

    // Search with no matches
    const noMatch = await client.callTool({ name: "search_docs", arguments: { query: "nosuchwordexists" } });
    const noMatchParsed = JSON.parse((noMatch.content as any)[0].text);
    assert.equal(noMatchParsed.count, 0);
    assert.deepEqual(noMatchParsed.results, []);
  } finally {
    await client.close();
    await server.close();
  }
});

test("MCP resolve_url tool computes public URLs for base url and relative fallbacks", async () => {
  const root = createBuiltFixture();
  const toolkit: DocToolkit = loadBuiltSite(root)!;
  const server = createMcpServer(toolkit);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    // Configured site URL: https://mcp.test
    const homeUrl = await client.callTool({ name: "resolve_url", arguments: { slug: "README" } });
    assert.equal(JSON.parse((homeUrl.content as any)[0].text).url, "https://mcp.test/");

    const deployUrl = await client.callTool({ name: "resolve_url", arguments: { slug: "guides/deploy" } });
    assert.equal(JSON.parse((deployUrl.content as any)[0].text).url, "https://mcp.test/guides/deploy/");

    // Slug with .md extension
    const deployMdUrl = await client.callTool({ name: "resolve_url", arguments: { slug: "guides/deploy.md" } });
    assert.equal(JSON.parse((deployMdUrl.content as any)[0].text).url, "https://mcp.test/guides/deploy/");

    // Non-existent slug returns isError: true
    const missing = await client.callTool({ name: "resolve_url", arguments: { slug: "unknown-slug" } });
    assert.equal((missing as any).isError, true);

    // Fallback when site URL is undefined
    toolkit.manifest.config.url = undefined as any;
    const relHome = await client.callTool({ name: "resolve_url", arguments: { slug: "README" } });
    assert.equal(JSON.parse((relHome.content as any)[0].text).url, "/");

    const relDeploy = await client.callTool({ name: "resolve_url", arguments: { slug: "guides/deploy" } });
    assert.equal(JSON.parse((relDeploy.content as any)[0].text).url, "/guides/deploy/");
  } finally {
    await client.close();
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// 6. Stdio Subprocess Transport (Real Process Integration)
// ---------------------------------------------------------------------------

test("MCP server connects and serves tools over StdioClientTransport subprocess", async () => {
  const root = createBuiltFixture();
  const binScript = path.resolve(__dirname, "../bin/docmedown.js");

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [binScript, "mcp", root],
  });

  const client = new Client({ name: "stdio-test-client", version: "1.0.0" });
  await client.connect(transport);

  try {
    const listRes = await client.callTool({ name: "list_docs", arguments: {} });
    assert.ok(listRes);
    const content = (listRes.content as Array<{ type: string; text: string }>)[0].text;
    assert.ok(content.includes("guides/deploy"));

    const readRes = await client.callTool({ name: "read_doc", arguments: { slug: "README" } });
    const readText = (readRes.content as Array<{ type: string; text: string }>)[0].text;
    assert.ok(readText.includes("Welcome to the MCP fixture docs"));

    const searchRes = await client.callTool({ name: "search_docs", arguments: { query: "deploy" } });
    assert.ok((searchRes.content as any)[0].text.includes("guides/deploy"));

    const urlRes = await client.callTool({ name: "resolve_url", arguments: { slug: "README" } });
    assert.ok((urlRes.content as any)[0].text.includes("https://mcp.test/"));
  } finally {
    await client.close();
  }
});

test("MCP server handles errors over StdioClientTransport subprocess without crashing", async () => {
  const root = createBuiltFixture();
  const binScript = path.resolve(__dirname, "../bin/docmedown.js");

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [binScript, "mcp", root],
  });

  const client = new Client({ name: "stdio-error-client", version: "1.0.0" });
  await client.connect(transport);

  try {
    // 1. Calling non-existent document returns isError: true
    const errorRes = await client.callTool({ name: "read_doc", arguments: { slug: "does-not-exist" } });
    assert.equal((errorRes as any).isError, true);

    // 2. Subsequent call succeeds, proving subprocess session is healthy
    const okRes = await client.callTool({ name: "read_doc", arguments: { slug: "README" } });
    assert.equal((okRes as any).isError, undefined);
    assert.ok((okRes.content as any)[0].text.includes("Welcome to the MCP fixture docs"));
  } finally {
    await client.close();
  }
});

test("MCP server subprocess indexes and serves an unbuilt markdown directory over stdio", async () => {
  const root = createUnbuiltFixture({ configType: "docs.json" });
  const binScript = path.resolve(__dirname, "../bin/docmedown.js");

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [binScript, "mcp", root],
  });

  const client = new Client({ name: "stdio-unbuilt-client", version: "1.0.0" });
  await client.connect(transport);

  try {
    const listRes = await client.callTool({ name: "list_docs", arguments: {} });
    const content = (listRes.content as Array<{ type: string; text: string }>)[0].text;
    assert.ok(content.includes("Zero Install Docs"));
    assert.ok(content.includes("guides/deploy"));

    const readRes = await client.callTool({ name: "read_doc", arguments: { slug: "guides/deploy" } });
    const readText = (readRes.content as any)[0].text;
    assert.ok(readText.includes("Deploying Unbuilt"));
  } finally {
    await client.close();
  }
});

test("MCP server stdio subprocess isolates diagnostics to stderr and keeps stdout clean", async () => {
  const root = createBuiltFixture();
  const binScript = path.resolve(__dirname, "../bin/docmedown.js");

  const child = spawn(process.execPath, [binScript, "mcp", root], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stderrOutput = "";
  let stdoutOutput = "";

  child.stdout.on("data", (d) => {
    stdoutOutput += d.toString();
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      resolve();
    }, 4000);

    child.stderr.on("data", (d) => {
      stderrOutput += d.toString();
      if (stderrOutput.includes("[DocMeDown] MCP server ready over stdio")) {
        clearTimeout(timeout);
        child.kill("SIGTERM");
        resolve();
      }
    });

    child.once("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  // Diagnostics must appear on stderr
  assert.ok(stderrOutput.includes("[DocMeDown] MCP server ready over stdio"));
  assert.ok(stderrOutput.includes("serving 3 documents"));
  // Stdout must not contain plaintext diagnostic logs (reserved for JSON-RPC)
  assert.ok(!stdoutOutput.includes("[DocMeDown]"));
});

// ---------------------------------------------------------------------------
// 7. SSE Transport & HTTP Server Integration
// ---------------------------------------------------------------------------

test("MCP server serves tools over SSE transport with CORS and session management", async () => {
  const root = createBuiltFixture();
  const toolkit: DocToolkit = loadBuiltSite(root)!;

  const handle = await startMcpSseServer(toolkit, {
    port: 0,
    allowOrigins: ["http://localhost:3000", "https://example.com"],
  });

  const client = new Client({ name: "sse-test-client", version: "1.0.0" });
  const clientTransport = new SSEClientTransport(new URL(handle.url));
  await client.connect(clientTransport);

  try {
    const listRes = await client.callTool({ name: "list_docs", arguments: {} });
    assert.ok(listRes);
    const text = (listRes.content as Array<{ type: string; text: string }>)[0].text;
    assert.ok(text.includes("guides/deploy"));

    const searchRes = await client.callTool({ name: "search_docs", arguments: { query: "deploy" } });
    const searchText = (searchRes.content as Array<{ type: string; text: string }>)[0].text;
    assert.ok(searchText.includes("guides/deploy"));

    // Verify preflight OPTIONS response
    const optionsRes = await fetch(handle.url, { method: "OPTIONS" });
    assert.equal(optionsRes.status, 204);
    assert.equal(optionsRes.headers.get("access-control-allow-methods"), "GET, POST, OPTIONS");
  } finally {
    await client.close();
    await handle.close();
  }
});

test("MCP server handles SSE transport over /events endpoint", async () => {
  const root = createBuiltFixture();
  const toolkit: DocToolkit = loadBuiltSite(root)!;

  const handle = await startMcpSseServer(toolkit, { port: 0 });
  const eventsUrl = `http://${handle.host}:${handle.port}/events`;

  const client = new Client({ name: "sse-events-client", version: "1.0.0" });
  const clientTransport = new SSEClientTransport(new URL(eventsUrl));
  await client.connect(clientTransport);

  try {
    const listRes = await client.callTool({ name: "list_docs", arguments: {} });
    const text = (listRes.content as any)[0].text;
    assert.ok(text.includes("guides/deploy"));
  } finally {
    await client.close();
    await handle.close();
  }
});

test("MCP server SSE HTTP endpoints handle CORS origins, preflights, and invalid routes", async () => {
  const root = createBuiltFixture();
  const toolkit: DocToolkit = loadBuiltSite(root)!;

  const handle = await startMcpSseServer(toolkit, {
    port: 0,
    allowOrigins: ["https://allowed-app.com", "https://other.com"],
  });

  try {
    // 1. Origin matching
    const matchRes = await fetch(handle.url, {
      method: "OPTIONS",
      headers: { Origin: "https://allowed-app.com" },
    });
    assert.equal(matchRes.status, 204);
    assert.equal(matchRes.headers.get("access-control-allow-origin"), "https://allowed-app.com");

    // 2. Unmatched origin reflects default allowed origin
    const unmatchRes = await fetch(handle.url, {
      method: "OPTIONS",
      headers: { Origin: "https://unauthorized.com" },
    });
    assert.equal(unmatchRes.headers.get("access-control-allow-origin"), "https://allowed-app.com");

    // 3. POST /message with missing or invalid session ID returns 404
    const postInvalidSession = await fetch(`http://${handle.host}:${handle.port}/message?sessionId=unknown-123`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(postInvalidSession.status, 404);
    assert.equal(await postInvalidSession.text(), "Session not found");

    const postNoSession = await fetch(`http://${handle.host}:${handle.port}/message`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(postNoSession.status, 404);

    // 4. Unknown route returns 404
    const unknownRoute = await fetch(`http://${handle.host}:${handle.port}/unknown-path`);
    assert.equal(unknownRoute.status, 404);
  } finally {
    await handle.close();
  }
});

test("MCP server cleanly closes all active SSE sessions and frees listening socket", async () => {
  const root = createBuiltFixture();
  const toolkit: DocToolkit = loadBuiltSite(root)!;

  const handle = await startMcpSseServer(toolkit, { port: 0 });
  const client = new Client({ name: "sse-teardown-client", version: "1.0.0" });
  await client.connect(new SSEClientTransport(new URL(handle.url)));

  await handle.close();
  await client.close();

  // Verifying server is closed: connecting now should fail
  await assert.rejects(async () => {
    await fetch(handle.url);
  });
});

// ---------------------------------------------------------------------------
// 8. CLI Commands & Development Contracts
// ---------------------------------------------------------------------------

test("mcpCommand throws descriptive error when target directory has no documentation", async () => {
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-empty-mcp-"));
  await assert.rejects(
    async () => {
      await mcpCommand(emptyDir);
    },
    (err: Error) => {
      assert.ok(err.message.includes("No documentation found at"));
      assert.ok(err.message.includes("docmedown build"));
      return true;
    },
  );
});

test("package.json defines dev:mcp and test:mcp development scripts", () => {
  const pkgPath = path.resolve(__dirname, "../package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  assert.ok(pkg.scripts["dev:mcp"], "dev:mcp script is defined in package.json");
  assert.equal(pkg.scripts["dev:mcp"], "node ./bin/docmedown.js mcp ./docs");

  assert.ok(pkg.scripts["test:mcp"], "test:mcp script is defined in package.json");
  assert.ok(pkg.scripts["test:mcp"].includes("tests/mcp.test.ts"));
});

test("loadOrCreateToolkit indexes repository docs directory cleanly", () => {
  const repoDocsDir = path.resolve(__dirname, "../docs");
  const toolkit = loadOrCreateToolkit(repoDocsDir);
  assert.ok(toolkit, "Toolkit loaded successfully for repo ./docs");
  assert.ok(toolkit!.manifest.docs.length >= 10, "Repo docs contains at least 10 documents");
  assert.ok(toolkit!.manifest.docs.some((d) => d.slug === "README" || d.slug.toLowerCase() === "readme"));
  assert.ok(toolkit!.manifest.docs.some((d) => d.slug === "guides/mcp-server"));
});
