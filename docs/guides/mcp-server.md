---
title: Model Context Protocol (MCP) Server
description: Connect your documentation directly to AI coding assistants (Claude Desktop, Cursor, Windsurf, Copilot) with DocMeDown's native MCP server.
order: 4
tags: [ai, mcp, model-context-protocol, claude, cursor, windsurf, llm, agents]
---

# Model Context Protocol (MCP) Server 🤖

DocMeDown includes a production-grade, native **Model Context Protocol (MCP)** server.

Instead of forcing AI assistants to scrape rendered HTML or read truncated snippets, DocMeDown turns your documentation corpus into an interactive, high-fidelity knowledge graph directly queryable by **Claude Desktop**, **Cursor**, **Windsurf**, and any MCP-compliant AI assistant.

---

## ⚡ 1. Zero-Install Quickstart

DocMeDown's MCP server can be invoked instantly with `npx` with zero installation required:

```bash
# Stdio transport (default, used by Cursor, Claude Desktop, Windsurf):
npx -y docmedown mcp ./docs

# HTTP Server-Sent Events (SSE) transport (for networked/remote agents):
npx -y docmedown mcp ./docs --transport sse --port 3001 --host 0.0.0.0
```

> [!TIP]
> **Sub-Millisecond Startup**: Running `npx docmedown build ./docs` before starting the MCP server generates `_manifest.json` and `_docs.js`. The MCP server then operates with zero filesystem scanning overhead, booting in under 20ms!

---

## 🛠️ 2. MCP Tools Specification

DocMeDown exposes four specialized tools conforming to standard JSON Schema specifications:

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| **`list_docs`** | *(none)* | Returns an inventory of all pages with `slug`, `title`, `path`, `category`, `readingTimeMinutes`, and `lastModified`. |
| **`read_doc`** | `slug` *(string)* | Returns the complete raw markdown content of a page, structured headings tree (`level`, `text`, `id`), and modification timestamp. |
| **`search_docs`** | `query` *(string)*, `limit?` *(number)* | Ranked keyword search across titles, headings, and document bodies with preview snippets. |
| **`resolve_url`** | `slug` *(string)* | Computes the canonical public URL for any document on the deployed site based on `docs.json` `url`. |

---

## 🔌 3. Client Configuration Recipes

<Tabs type="pills">
  <Tab label="Cursor (.cursor/mcp.json)" icon="🖱️">
Create or edit `.cursor/mcp.json` in your project root:

```json title=".cursor/mcp.json"
{
  "mcpServers": {
    "project-docs": {
      "command": "npx",
      "args": ["-y", "docmedown", "mcp", "./docs"]
    }
  }
}
```
  </Tab>

  <Tab label="Claude Desktop" icon="🟣">
Add to your `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json title="claude_desktop_config.json"
{
  "mcpServers": {
    "docmedown": {
      "command": "npx",
      "args": ["-y", "docmedown", "mcp", "C:\\dev\\my-project\\docs"]
    }
  }
}
```
  </Tab>

  <Tab label="Windsurf (Cascade)" icon="🏄">
In Windsurf, open `~/.codeium/windsurf/mcp_config.json`:

```json title="mcp_config.json"
{
  "mcpServers": {
    "docs": {
      "command": "npx",
      "args": ["-y", "docmedown", "mcp", "./docs"]
    }
  }
}
```
  </Tab>

  <Tab label="HTTP SSE (Networked / Docker)" icon="🌐">
For remote containers, microservices, or shared team environments:

```bash
npx -y docmedown mcp ./docs --transport sse --port 3001 --host 0.0.0.0 --allow-origins "*"
```

Connect clients via `http://localhost:3001/sse`.
  </Tab>
</Tabs>

---

## 🧪 4. Local Development & Testing

When developing DocMeDown or integrating it with your toolchain, you can run, inspect, and test the MCP server locally with dedicated scripts:

### Local Dev Server (`dev:mcp`)
```bash
# Run over stdio (default, for Cursor, Claude Desktop, Windsurf):
npm run dev:mcp

# Run over SSE for browser / HTTP clients:
npm run dev:mcp -- --transport sse --port 3001
```

### Dedicated MCP Test Suite (`test:mcp`)
Run the comprehensive automated MCP test suite covering tool schemas, query ranking, YAML frontmatter filtering, stdio subprocess pipes, and SSE CORS handling:
```bash
npm run test:mcp
```

### Interactive Test Client (`test:mcp:client`)
Test tools interactively directly from your terminal without opening an external AI client:
```bash
# Run automated smoke check verifying all 4 MCP tools:
npm run test:mcp:client

# List all indexed pages:
node ./scripts/test-mcp-client.mjs list

# Search documentation with ranking scores and snippets:
node ./scripts/test-mcp-client.mjs search "deploy"

# Read markdown content and headings for a specific slug:
node ./scripts/test-mcp-client.mjs read "guides/mcp-server"

# Resolve public canonical URL:
node ./scripts/test-mcp-client.mjs url "guides/mcp-server"
```

---

## 💬 5. Real-World AI Prompts & Workflow

Once connected, your AI assistant autonomously decides when to query your documentation:

### Example 1: Finding Guides & Implementation Details
> **Developer:** *"How do I configure DocMeDown to serve dynamic docs from a remote GitHub repository?"*
> 
> **AI Assistant Action:**
> 1. Calls `search_docs(query: "remote github")` ➔ Finds `guides/remote-github`.
> 2. Calls `read_doc(slug: "guides/remote-github")` ➔ Retrieves exact configuration schema.
> 3. Responds with the exact 12-line `docs.json` configuration block and citation URL!

### Example 2: Verifying API Parameters
> **Developer:** *"What are the supported options for the `build` command?"*
> 
> **AI Assistant Action:**
> 1. Calls `search_docs(query: "build options")` ➔ Finds `guides/cli-reference`.
> 2. Returns `--watch`, `--no-single-file`, `--no-static`, and `--out-dir` directly from the documentation source of truth.

---

## ⚖️ Why Native MCP Beats Traditional RAG / Web Scraping

| Capability | DocMeDown MCP | Web Scraping / HTML RAG |
| :--- | :---: | :---: |
| **Startup Overhead** | **Instant (< 20ms)** | Requires vector embeddings |
| **Content Accuracy** | **100% Raw Source Markdown** | Truncated / cluttered HTML noise |
| **Structured Navigation** | **Full Headings Hierarchy Tree** | Flat text chunks |
| **Offline Support** | **100% Local Stdio Process** | Requires external API keys / models |
| **Cost** | **$0.00 (Zero Token Vector DB)** | Ongoing vector hosting costs |

---

## 🗺️ Next Steps

Continue along the linear documentation journey:

<CardGrid cols={2}>
  <Card
    title="Configuration Reference"
    description="Complete cookbook and schema reference for docs.json, theme families, and branding."
    href="#/configuration"
    badge="Next Up"
    badgeType="info"
  />
  <Card
    title="Dynamic Remote Git"
    description="Stream live documentation directly from GitHub or GitLab without build steps."
    href="#/guides/remote-github"
    badge="Previous"
    badgeType="success"
  />
</CardGrid>

