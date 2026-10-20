---
title: CLI Command Reference
description: Complete, real-world reference for every DocMeDown CLI command, options, flags, and CI/CD automation recipes.
order: 1
tags: [cli, commands, terminal, tui, ci-cd, automation]
---

# CLI Command Reference 🛠️

The DocMeDown command-line interface provides everything you need to scaffold, develop, validate, bundle, and distribute documentation.

You can run any command directly with `npx -y docmedown <command>` or install it globally:

```bash
npm install -g docmedown
```

---

## ⚡ Command Matrix Overview

| Command | Shorthand | Purpose | Key Flags |
| :--- | :--- | :--- | :--- |
| **[`docmedown`](#0-docmedown-quickstart-amp-dev-server)** | `dmd` | Quickstart setup if empty, or starts local preview server | `-p, --port`, `-y, --yes`, `--no-open` |
| **[`init`](#1-init-interactive-setup-wizard)** | — | Interactive setup wizard to configure and scaffold docs | `-y, --yes`, `-n, --name`, `-t, --theme`, `--no-start` |
| **[`serve`](#2-serve-alias-dev-hot-live-reload)** | `dev` | High-speed local dev server with WebSocket hot reload | `-p, --port`, `-H, --host`, `--no-open`, `--no-qr` |
| **[`build`](#3-build-static-compiler-amp-bundler)** | — | Prerender static HTML, SEO, AI context, and offline bundle | `-w, --watch`, `--no-single-file`, `-o, --out-dir` |
| **[`validate`](#4-validate-link-amp-frontmatter-linter)** | — | Deep linter for broken links, missing anchors, and YAML errors | `--json` |
| **[`doctor`](#5-doctor-system-amp-component-diagnostics)** | — | Environmental health, missing assets, and .dmd component testing | `--json` |
| **[`mcp`](#6-mcp-model-context-protocol-server)** | — | Expose docs to AI assistants (Cursor, Claude Desktop, Windsurf) | `-t, --transport`, `-p, --port`, `--allow-origins` |
| **[`config`](#7-config-interactive-terminal-tui)** | — | Visual terminal wizard for theme, branding, and navigation | — |

---

## 0. `docmedown` — Quickstart & Dev Server

When run in a directory that already contains documentation, `docmedown` immediately launches the local development server.

When run in an empty directory or without documentation, `docmedown` acts as the **Quickstart setup**:
1. Uses quickstart defaults (detecting your project name from `package.json`).
2. Renders a preview tree view of the directories and files to be created.
3. **Prompts for confirmation BEFORE creating any files** (unless `-y, --yes` is supplied).

```bash
# Quickstart in ./docs (prompts for confirmation before creating files):
npx docmedown

# Quickstart without confirmation prompt:
npx docmedown -y
```

---

## 1. `init` — Interactive Setup Wizard

The `init` command launches the interactive setup wizard, walking you through customizing your documentation site before generating files:

1. **Interactive Questionnaire**: Choose documentation directory, project name, tagline, theme family, default color mode, and whether to include sample custom components.
2. **Directory Tree Preview**: Renders a complete tree view showing every file that will be created or linked from root.
3. **Pre-Creation Confirmation**: Prompts for confirmation **before** writing any files to disk.

```bash
# Launch interactive setup wizard:
npx docmedown init

# Launch interactive setup for a specific directory:
npx docmedown init ./docs

# Non-interactive / CI with defaults:
npx docmedown init ./docs -y --no-start
```

### What gets created:
```
docs/                        # Documentation root: ONLY sources + index.html symlink
├── index.html               # Symlink → .dmd/index.html (ONLY distributable: SEO site, via build)
├── README.md                # Primary documentation home page (or linked from root)
├── getting-started.md       # Starter guide (#/getting-started)
├── CHANGELOG.md             # Linked from root (if present)
├── guides/
│   └── custom-components.md # Custom component reference
└── .dmd/
    ├── .config/docs.json         # Core configuration (theme, navigation, branding)
    └── .components/
        └── CounterWidget.svelte  # Svelte 5 runes component starter
```

---

## 2. `serve` (alias: `dev`) — Hot Live Reload

Launch an ultra-fast local development server with instant WebSocket-backed live reloading.

```bash
# Serve default ./docs folder on http://localhost:3000:
npx docmedown serve ./docs

# Use the short alias:
npx docmedown dev

# Custom port and host:
npx docmedown serve ./docs --port 8080 --host 0.0.0.0 --no-open
```

### Options:
- `-p, --port <number>`: Port to listen on (default: `3000`; auto-increments if already in use).
- `-H, --host <string>`: Host to bind server to (default: `0.0.0.0` so phones/tablets on your LAN can connect).
- `--no-open`: Prevents automatically opening your default web browser on startup.
- `--no-qr`: Hides the terminal QR code for the Network URL.

On startup the server prints a compact banner (`✔ Artifacts ready (N pages)`) instead of the full build checklist, plus `Local:` and `Network:` URLs with a scannable QR for the Network address.

> [!TIP]
> **Preserved Reading Position**: When you edit any Markdown file or `.dmd/` custom component, DocMeDown pushes updates over WebSocket and re-renders the document **without losing your current scroll position**.

---

## 3. `build` — Static Compiler & Bundler

Recursively scans all Markdown documents, extracts headings, generates navigation trees, prerenders static pages with full SEO metadata, emits AI context files, and produces an air-gapped offline bundle.

```bash
# Build production assets and offline bundle in ./docs/.dmd/.singlefile:
npx docmedown build ./docs

# Watch mode (automatically rebuilds on source changes):
npx docmedown build ./docs --watch

# Output single-file offline bundle to a custom directory:
npx docmedown build ./docs --out-dir ./dist
```

### Generated Artifacts:
1. **Prerendered Static Pages**: Compiles every markdown file to `<slug>/index.html` with full semantic HTML, inlined Prism syntax highlighting, and JSON-LD schema.
2. **SEO Assets**: Generates `sitemap.xml` and `robots.txt` when `url` is configured in `docs.json`.
3. **AI Context Files**: Emits `llms.txt`, `llms-full.txt`, `SKILL.md`, and `okf.json` into `.dmd/` for AI coding agents.
4. **Standalone Offline Distributable**: Compresses all documents, custom components, and runtime into a single, self-extracting `.dmd/.singlefile/index.html` that works over `file:///` URLs. The `docs/index.html` symlink instead targets the serveable SEO site (`.dmd/index.html`) so crawlers and static hosts see the full prerendered site.

### Options:
- `-w, --watch`: Watch source files and rebuild assets on change.
- `--no-single-file`: Build serveable files only; skip offline single-file bundling.
- `--no-static`: Skip prerendered static pages and SEO/AI files.
- `-o, --out-dir <path>`: Output directory for the offline bundle (default: `<dir>/.dmd/.singlefile`).

---

## 4. `validate` — Link & Frontmatter Linter

Performs deep structural verification across your documentation site. Catches broken local links, missing anchors, malformed YAML frontmatter, and invalid `docs.json` configuration before deployment.

```bash
# Validate documentation links and schemas:
npx docmedown validate ./docs

# Output machine-readable JSON for CI/CD pipelines:
npx docmedown validate ./docs --json
```

### Sample Output:
```text
🔍 Validating documentation in ./docs...
  📄 Documents scanned: 12
  🔗 Links verified:    21
  📑 Headings indexed:  148

✔ Validation passed! All documents, links, and schemas are valid.
```

If an author writes a broken link or references a non-existent heading anchor, `validate` flags the exact file and line number:
```text
✖ Broken link in "guides/custom-components.md":
  Anchor "#missing-prop" not found in "guides/cli-reference.md"
```

---

## 5. `doctor` — System & Component Diagnostics

Runs comprehensive diagnostics on your development environment, project structure, asset references, and `.dmd` custom components.

```bash
# Diagnose local documentation project:
npx docmedown doctor ./docs

# Output JSON report:
npx docmedown doctor ./docs --json
```

### Sample Diagnostic Report:
```text
🩺 DocMeDown Doctor — System & Documentation Diagnostics (./docs)
──────────────────────────────────────────────────────────────────────
✔ [PASS] Node.js Environment: v26.3.0 (satisfies requirement >=20.19.0)
✔ [PASS] Configuration File: Found valid configuration file: docs.json
✔ [PASS] Documentation Documents: Found 12 markdown document(s) with valid home page
✔ [PASS] Asset References: All local asset references verified
✔ [PASS] Custom Components (.dmd): All 4 custom component(s) compiled cleanly
──────────────────────────────────────────────────────────────────────
✨ Doctor found 0 critical issues (5 passed, 0 warning(s)). Ready to build/serve!
```

---

## 6. `mcp` — Model Context Protocol Server

Turns your documentation into an interactive knowledge base queryable by AI coding assistants (Claude Desktop, Cursor, Windsurf, Copilot).

```bash
# Stdio transport (default, ideal for Cursor / Claude Desktop):
npx -y docmedown mcp ./docs

# HTTP Server-Sent Events (SSE) transport (for networked/remote agents):
npx -y docmedown mcp ./docs --transport sse --port 3001 --host 0.0.0.0
```

### Options:
- `-t, --transport <type>`: Protocol to use: `stdio` (default) or `sse`.
- `-p, --port <number>`: Port number for SSE transport (default: `3001`).
- `-H, --host <string>`: Hostname/IP to bind to (default: `localhost`).
- `--allow-origins <origins>`: Allowed CORS origins for SSE (e.g. `*` or `http://localhost:3000`).

---

## 7. `config` — Interactive Terminal TUI

Launch a terminal user interface to visually configure themes, branding, density, navigation links, and remote Git repositories.

```bash
npx docmedown config ./docs/docs.json
```

Saves directly to your `docs.json` file with full schema validation.

---

## 🤖 CI/CD Automation Recipe

Add this GitHub Actions workflow to `.github/workflows/docs-check.yml` to automatically lint links, verify health, and build documentation on every Pull Request:

```yaml title=".github/workflows/docs-check.yml"
name: Documentation Quality & Build
on: [push, pull_request]

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Validate Links & Frontmatter
        run: npx docmedown validate ./docs

      - name: Run Doctor Diagnostics
        run: npx docmedown doctor ./docs

      - name: Compile Production Site & Offline Bundle
        run: npx docmedown build ./docs
```

---

## 🗺️ Next Steps

Continue along the linear documentation journey:

<CardGrid cols={2}>
  <Card
    title="Migration Guides"
    description="Step-by-step guides for migrating from Docusaurus, VitePress, Docsify, and MkDocs."
    href="#/guides/migrations"
    badge="Next Up"
    badgeType="info"
  />
  <Card
    title="Configuration Reference"
    description="Review docs.json schema, theme families, branding, and navigation."
    href="#/configuration"
    badge="Previous"
    badgeType="success"
  />
</CardGrid>

