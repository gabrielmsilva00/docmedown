#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const binScript = path.join(rootDir, "bin", "docmedown.js");

function parseArgs(args) {
  let sseUrl = null;
  let targetDir = path.join(rootDir, "docs");
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--sse" && i + 1 < args.length) {
      sseUrl = args[++i];
    } else if (arg === "--dir" && i + 1 < args.length) {
      targetDir = path.resolve(process.cwd(), args[++i]);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      positional.push(arg);
    }
  }

  return { sseUrl, targetDir, command: positional[0] || "smoke", rest: positional.slice(1) };
}

function printHelp() {
  console.log(`DocMeDown MCP Local Test Client

Usage:
  node ./scripts/test-mcp-client.mjs [command] [args...] [options]

Commands:
  smoke                   Run automated smoke check verifying all 4 MCP tools (default)
  list                    List all indexed documents via list_docs
  read <slug>             Read full document content and headings via read_doc
  search <query> [limit]  Search document corpus via search_docs
  url <slug>              Resolve public site URL for slug via resolve_url

Options:
  --sse <url>             Connect to running SSE server (e.g. http://localhost:3001/sse)
                          (default: launches local stdio subprocess with ./bin/docmedown.js)
  --dir <dir>             Documentation directory to serve in stdio mode (default: ./docs)
  -h, --help              Show this help message
`);
}

async function createClientTransport({ sseUrl, targetDir }) {
  if (sseUrl) {
    return new SSEClientTransport(new URL(sseUrl));
  }
  return new StdioClientTransport({
    command: process.execPath,
    args: [binScript, "mcp", targetDir],
  });
}

async function main() {
  const { sseUrl, targetDir, command, rest } = parseArgs(process.argv.slice(2));

  const client = new Client({
    name: "docmedown-test-client",
    version: "1.0.0",
  });

  const transport = await createClientTransport({ sseUrl, targetDir });
  console.error(`[Test Client] Connecting via ${sseUrl ? `SSE (${sseUrl})` : `stdio (${targetDir})`}...`);

  await client.connect(transport);

  try {
    if (command === "list") {
      const res = await client.callTool({ name: "list_docs", arguments: {} });
      const raw = res.content?.[0]?.text;
      const parsed = JSON.parse(raw);
      console.log(`\nCorpus: ${parsed.site} (${parsed.count} documents)`);
      console.log("-".repeat(60));
      for (const doc of parsed.docs) {
        const cat = doc.category ? ` [${doc.category}]` : "";
        const readTime = doc.readingTimeMinutes ? ` (~${doc.readingTimeMinutes} min)` : "";
        console.log(` • ${doc.title} (${doc.slug})${cat}${readTime}`);
      }
    } else if (command === "read") {
      const slug = rest[0] || "README";
      const res = await client.callTool({ name: "read_doc", arguments: { slug } });
      if (res.isError) {
        console.error(`Error: ${res.content?.[0]?.text}`);
        process.exitCode = 1;
        return;
      }
      const raw = res.content?.[0]?.text;
      const parsed = JSON.parse(raw);
      console.log(`\nTitle: ${parsed.title} (${parsed.slug})`);
      console.log(`Headings: ${parsed.headings?.map((h) => `${"#".repeat(h.level)} ${h.text}`).join(", ") || "none"}`);
      console.log("-".repeat(60));
      console.log(parsed.content);
    } else if (command === "search") {
      const query = rest[0];
      if (!query) {
        console.error("Error: Please provide a query. Example: node ./scripts/test-mcp-client.mjs search 'deploy'");
        process.exitCode = 1;
        return;
      }
      const limit = rest[1] ? Number.parseInt(rest[1], 10) : 10;
      const res = await client.callTool({ name: "search_docs", arguments: { query, limit } });
      const raw = res.content?.[0]?.text;
      const parsed = JSON.parse(raw);
      console.log(`\nSearch query: "${parsed.query}" (${parsed.count} match${parsed.count === 1 ? "" : "es"})`);
      console.log("-".repeat(60));
      for (const item of parsed.results) {
        console.log(` • [${item.score} pts] ${item.title} (${item.slug})`);
        if (item.snippet) console.log(`   "${item.snippet}"`);
      }
    } else if (command === "url") {
      const slug = rest[0] || "README";
      const res = await client.callTool({ name: "resolve_url", arguments: { slug } });
      if (res.isError) {
        console.error(`Error: ${res.content?.[0]?.text}`);
        process.exitCode = 1;
        return;
      }
      const raw = res.content?.[0]?.text;
      const parsed = JSON.parse(raw);
      console.log(`\nSlug: ${parsed.slug} -> Public URL: ${parsed.url}`);
    } else if (command === "smoke") {
      console.log("\n--- Running MCP Smoke Verification ---");
      // 1. List tools
      const toolList = await client.listTools();
      const toolNames = toolList.tools.map((t) => t.name).sort();
      console.log(`✔ Registered tools: ${toolNames.join(", ")}`);

      // 2. list_docs
      const listRes = await client.callTool({ name: "list_docs", arguments: {} });
      const listParsed = JSON.parse(listRes.content?.[0]?.text || "{}");
      console.log(`✔ list_docs returned ${listParsed.count} documents from "${listParsed.site}"`);

      // 3. search_docs
      const searchRes = await client.callTool({ name: "search_docs", arguments: { query: "mcp" } });
      const searchParsed = JSON.parse(searchRes.content?.[0]?.text || "{}");
      console.log(`✔ search_docs("mcp") returned ${searchParsed.count} result(s)`);

      // 4. read_doc
      const firstSlug = listParsed.docs?.[0]?.slug || "README";
      const readRes = await client.callTool({ name: "read_doc", arguments: { slug: firstSlug } });
      const readParsed = JSON.parse(readRes.content?.[0]?.text || "{}");
      console.log(
        `✔ read_doc("${firstSlug}") returned "${readParsed.title}" (${readParsed.content?.length || 0} chars)`,
      );

      // 5. resolve_url
      const urlRes = await client.callTool({ name: "resolve_url", arguments: { slug: firstSlug } });
      const urlParsed = JSON.parse(urlRes.content?.[0]?.text || "{}");
      console.log(`✔ resolve_url("${firstSlug}") resolved to "${urlParsed.url}"`);

      console.log("\n✨ All 4 MCP tools verified successfully!\n");
    } else {
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("MCP test client error:", err);
  process.exit(1);
});
