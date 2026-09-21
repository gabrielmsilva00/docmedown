---
title: CLI Command Reference
description: Complete guide to DocMeDown CLI commands, options, and flags.
order: 1
tags: [cli, commands, terminal, tui]
---

# CLI Command Reference 🛠️

The DocMeDown CLI is designed for speed and simplicity. You can run it directly with `npx` or install it globally with `npm install -g docmedown`.

---

## 1. Quickstart / Default Command

```bash
npx docmedown [dir]
```

- **Arguments**: `[dir]` (default: `./docs`)
- **Behavior**:
  - If the directory does not exist or has no docs, automatically runs the **`init`** command.
  - If the directory already exists and contains docs, automatically launches the **`serve`** development server.

---

## 2. `init` — Scaffold Documentation

```bash
npx docmedown init [dir] [options]
```

Scaffolds a new documentation site with template files (`index.html`, `docs.json`, `README.md`, `getting-started.md`, `guides/`, `.dmd/`).

### Options:
- `--no-start`: Do not prompt or start the local preview server after scaffolding.

---

## 3. `serve` (alias: `dev`) — Live Preview Server

```bash
npx docmedown serve [dir] [options]
```

Starts an ultra-fast local development server with WebSocket-based live reloading. It builds serveable documentation and `<dir>/.dist/index.html` at startup; source changes rebuild both outputs before the preview reloads.

### Options:
- `-p, --port <number>`: Port to listen on (default: `3000`, auto-increments if in use).
- `-H, --host <string>`: Host to bind server to (default: `localhost`).
- `--no-open`: Prevents automatically opening your default web browser.

---

## 4. `build` — Static Indexing & Single-File Bundler

```bash
npx docmedown build [dir] [options]
```

Recursively scans all Markdown documents, parses frontmatter, extracts headings for table of contents, and generates serveable `_manifest.json`, `_docs.js`, and runtime files in the documentation directory. Every build also:

- **Prerenders a static page** per document (`<slug>/index.html`, README → root `index.html`) with full SEO head tags (title, description, canonical, Open Graph, Twitter card, JSON-LD), so crawlers and no-JS visitors see complete content.
- **Generates a `404.html`**, plus `sitemap.xml` and `robots.txt` when `url` is set in `docs.json`.
- **Emits AI context files**: `llms.txt`, `llms-full.txt`, `SKILL.md`, and `okf.json` at the documentation root.
- Creates a self-contained offline bundle at `<dir>/.dist/index.html` by default.

### Options:
- `-w, --watch`: Watch source files and rebuild serveable assets plus `<dir>/.dist/index.html` after changes.
- `--no-single-file`: Skip the default offline bundle and build serveable files only.
- `--no-static`: Skip static page prerendering and the SEO/AI context files.
- `-o, --out-dir <path>`: Destination directory for the offline `index.html` (default: `<dir>/.dist`).

---

## 5. `mcp` — Model Context Protocol Server

```bash
npx docmedown build ./docs   # the MCP server reads built artifacts
npx docmedown mcp [dir]
```

Serves the built documentation as an MCP stdio server so AI coding assistants (Claude, Cursor, Windsurf, …) can query it directly. No source tree is required — only `_manifest.json` and `_docs.js` produced by `build`. Exposed tools:

| Tool | Description |
| :--- | :--- |
| `list_docs` | Every document with slug, title, category, and reading time |
| `read_doc` | Full markdown content of one page, including headings and last-modified date |
| `search_docs` | Keyword search returning ranked results with content snippets |
| `resolve_url` | Resolve a slug to its public URL on the deployed site |

Example `claude_desktop_config.json` entry:

```json
{
  "mcpServers": {
    "my-docs": { "command": "npx", "args": ["docmedown", "mcp", "./docs"] }
  }
}
```

---

## 6. `config` — Interactive Terminal TUI Wizard

```bash
npx docmedown config [path]
```

Launches an interactive, beautiful terminal user interface (TUI) allowing you to visually configure:
- Project title & tagline
- Theme family (`atlas`, `blueprint`, `terminal`, or `editorial`)
- Default light, dark, or automatic color mode
- Remote GitHub / GitLab repository source integration
- Social and navbar links

Saves directly to your `docs.json` file.

---

## 💻 Local NPM Scripts

When working directly inside the DocMeDown codebase (or before publishing to npm), use the local npm scripts:

```bash
# Start live preview dev server on ./docs
npm run serve
# or
npm run dev

# Build serveable docs and ./docs/.dist/index.html for offline use
npm run build:docs

# Watch source files and rebuild both outputs
npm run build:docs:watch

# Alias for the same standard build
npm run build:offline

# Launch interactive TUI configuration wizard
npm run config:docs

# Run test suite
npm test
```

