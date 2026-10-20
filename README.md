# DocMeDown ⚡
### *The simplest MarkDown documenter yet.*

[![npm version](https://img.shields.io/npm/v/docmedown.svg?style=flat-square&color=6366f1)](https://www.npmjs.com/package/docmedown)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![CI](https://github.com/gabrielmsilva00/docmedown/actions/workflows/ci.yml/badge.svg)](https://github.com/gabrielmsilva00/docmedown/actions/workflows/ci.yml)

**DocMeDown** is a zero-friction, ultra-lightweight documentation engine and CLI utility. Similar in visual elegance and features to **Docusaurus** and **VitePress**, but with **10x simpler setup** and zero build baggage.

Source code, issues, and releases live at [github.com/gabrielmsilva00/docmedown](https://github.com/gabrielmsilva00/docmedown).

Drop a single `index.html` file into any directory of `.md` files, and you have a fast, responsive documentation website with a complete reading interface.

---

## ✨ Features at a Glance

### Release deployment

Maintainers run `npm run deploy` from `main`. The command validates the release,
commits tracked changes, pushes the release, publishes npm, and explicitly requests
the GitHub Pages workflow (`pages.yml`) on `main`, even when the version is already
fully published. GitHub CLI (`gh`) must be installed and authenticated with permission
to run Actions (`gh auth login`); npm authentication is also required. Workflow errors
abort the command rather than silently skipping Pages. Dispatch acceptance does not
mean the asynchronous Pages build has finished; inspect `gh run list --workflow pages.yml`.
Ordinary pushes to `main` still trigger Pages, so a release can also produce a push run;
the workflow's existing concurrency group serializes/cancels superseded runs.
`npm run deploy:dry-run` validates the release without dispatching Pages or publishing.

### Native multilingual projects

DocMeDown groups translations by filename (`guide.pt-br.md`), not language
directories. Project creation offers English, Brazilian Portuguese, Spanish,
French, German and Simplified Chinese, plus manually named language tags.
Choose the original language separately; missing document translations can fall
back to that original. The built-in `DMD` navigation and developer guides ship in
all six languages and use English when a custom language has no translation.
See [Internationalization](docs/guides/internationalization.md) for configuration,
export behavior and the current translation-coverage limitations.

- 🚀 **Zero-Config Auto-Discovery**: Automatically parses and indexes all `.md` files & subfolders into categories, builds navigation sidebars, and powers instant search out of the box.
- 📁 **Unified Root & `./docs/` Discovery**: Automatically detects markdown files at your project root (`README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `ROADMAP.md`, etc.) and links both root and `./docs/` together by default without creating an artificial `./docs/` subdivision.
- 🌐 **Dual Usage: CLI Tool & Web Script**:
  - Run via single-line CLI: `npx docmedown ./docs`
  - Or drop `<script src="https://cdn.jsdelivr.net/npm/docmedown@latest/dist/docmedown.iife.js"></script>` into an `index.html` on any static host.
- ✍️ **2-Way In-Browser Editor & Live HMR**: Press `Ctrl+E` / `⌘E` to edit documents in a split-view editor modal with live keystroke rendering, instant disk save, zero-page-reload WebSocket HMR, and staged preview support (`--preview`).
- ⚡ **Dynamic Remote GitHub / GitLab Mode**: Document any GitHub or GitLab repository *live* without hosting markdown files statically! Changes pushed to your repo dynamically update the documentation website immediately.
- 📦 **Compressed Offline Copies**: Generate or download a minified, self-extracting `index.html` containing the complete documentation corpus, custom components, Mermaid renderer, styles, and runtime. Double-click it under `file:///` without a web server.
- 🎨 **Six Complete Theme Families & Favicon Presets**: Atlas, Blueprint, Terminal, Editorial, Botanical, and Studio each redefine surfaces, geometry, typography, spacing, and diagram palettes. Choose from 5 crisp SVG favicon presets with automatic offline inlining.
- 📊 **Interactive Data Tables & Delimited Text Toolbar**: Fenced `csv`, `tsv`, and standard GFM tables automatically render as interactive data tables with column/row descriptors and one-click copy export (Markdown, HTML, CSV).
- 🌐 **Static + SEO Output**: every build prerenders complete static pages per document with canonical URLs, Open Graph, Twitter cards, JSON-LD structured data, `sitemap.xml`, and `robots.txt` — crawlers see everything, no JS required.
- 🤖 **AI-Native Distribution**: auto-generated `llms.txt` / `llms-full.txt` / `SKILL.md` / `okf.json`, plus a built-in MCP server (`docmedown mcp`) so Claude, Cursor, and Windsurf can read and search your docs directly.
- 🔍 **Instant Fuzzy Search**: Keyboard-driven command palette (`⌘K` / `Ctrl+K`) with real-time in-browser indexing.
- 🧩 **Multi-Framework Custom Components (.dmd)**: Author custom components in **native Svelte 5**, **React TSX**, or **Web Elements (Lit)** inside `.dmd/`, plus built-in components (`<Tabs>`, `<CardGrid>`, `<Media>`, `<Badge>`, `<Steps>`).
- 🩺 **Built-in CLI Doctor & Link Validator**: Run `docmedown doctor` and `docmedown validate` for automated environment diagnostics, missing asset detection, ahead-of-time component verification, and deep link/anchor integrity.
- 📊 **Mermaid Diagrams & KaTeX Math**: Theme-aware diagrams with automatic Fit, zoom, 1:1 view, SVG export, expanded review, and offline parity, plus native LaTeX equations.
- 💡 **GitHub-Style Callouts**: Full support for `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, and `[!CAUTION]`.

---

## 🚀 10-Second Quickstart

### Option 1: Using the CLI Tool

```bash
# Run at your project root: detects root *.md files (README, CONTRIBUTING, CHANGELOG, etc.)
# and links both root and the ./docs/ folder by default!
npx docmedown
```

To configure branding, themes, or remote GitHub repository sources with an interactive terminal wizard:

```bash
npx docmedown config
```

### Option 2: Pure Web Script (Zero CLI Required)

Create an `index.html` inside your docs folder:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Docs</title>
</head>
<body>
  <div id="dmd-app"></div>
  <script src="https://cdn.jsdelivr.net/npm/docmedown@latest/dist/docmedown.iife.js"></script>
</body>
</html>
```

Place your `README.md` alongside `index.html`, and you're done!

---

## 📁 Unified Root & `./docs/` Architecture

Real-world repositories rarely store all documentation exclusively inside `./docs/`. Almost every project maintains essential Markdown files directly at root:
- `README.md` (Project overview and introduction)
- `CONTRIBUTING.md` (Contribution guidelines)
- `CHANGELOG.md` (Release history and changelog)
- `ROADMAP.md` (Project roadmap)
- `SECURITY.md` (Vulnerability disclosure policies)

Instead of forcing you to choose between root files or a `./docs/` folder, or duplicating files, **DocMeDown unifies both by default**.

### How It Works

When you run `docmedown`, `docmedown serve`, or `docmedown build`:

1. **Auto-Detection**: Scans the current directory (`process.cwd()`) for all root `*.md` files.
2. **Unified Linking**: Transparently links each root Markdown file directly into `./docs/` (using relative symlinks, falling back to hard links or file copies if permissions require).
3. **Flat Top-Level Navigation**: Because root files are linked directly at `./docs/`, they sit at the root of the documentation tree alongside your `./docs/` pages (e.g. Overview, Contributing, Getting Started) **without creating an artificial `./docs/` category subdivision**.
4. **No Template Clobbering**: If a `README.md` already exists at your project root, `docmedown init` preserves it as the primary documentation Overview rather than generating a generic placeholder template.
5. **Bi-Directional Live Sync**:
   - The dev server (`docmedown serve`) watches both `./docs/` and root `*.md` files. Edits to root files trigger instantaneous WebSocket HMR in the browser without full page reloads.
   - The in-browser 2-Way Editor (`Ctrl+E` / `⌘E`) writes directly back to the target root files.
6. **Automatic Cleanup**: If a root Markdown file is deleted or renamed, stale links are pruned automatically on the next command run.

---

## 🔌 Embedding & Lifecycle Integration

For a host application that controls when documentation mounts, opt out of automatic initialization before loading the script:

```html
<script>
  window.__DOCMEDOWN_NO_AUTO_INIT__ = true;
</script>
<script src="https://cdn.jsdelivr.net/npm/docmedown@latest/dist/docmedown.iife.js"></script>
```

Then mount it into a specific element. `init` resolves to an instance with a `destroy()` method, so single-page applications can cleanly replace the reader when routes change.

```html
<div id="project-docs"></div>
<script>
  async function showDocs() {
    const docs = await window.DocMeDown.init({
      el: '#project-docs',
      basePath: '/help',
      config: {
        name: 'Project help',
        theme: { family: 'terminal', density: 'compact', defaultMode: 'auto' }
      }
    });

    // Call docs.destroy() before removing #project-docs from the page.
  }

  showDocs();
</script>
```

The mount element emits `docmedown:ready` with the instance in `event.detail`, and `docmedown:destroyed` when it is unmounted. As an HTML-only alternative, add `data-docmedown-auto-init="false"` to the DocMeDown `<script>` tag.

---

## 🌐 Dynamic Remote GitHub / GitLab Mode

Want to host your documentation on GitHub Pages or Vercel **without** committing your markdown files or setting up complex CI builds?

Simply create `docs.json`:

```json title="docs.json"
{
  "name": "Live Project Docs",
  "source": {
    "type": "github",
    "repo": "facebook/react",
    "branch": "main",
    "docsDir": "docs"
  },
  "theme": {
    "family": "blueprint",
    "density": "comfortable",
    "defaultMode": "auto"
  }
}
```

Host only the `index.html` and `docs.json` file. DocMeDown will dynamically discover and pull the markdown content directly from GitHub on demand!

---

## 📦 Single-File Offline Bundling

Every standard build produces both your serveable documentation files and a **100% self-contained offline `index.html` file**:

```bash
npx docmedown build ./docs
```

The serveable site and runtime live in `./docs/.dmd/` (prerendered pages, `sitemap.xml`, `robots.txt`, per-page SEO head tags included). The `docs/index.html` symlink targets that serveable entrypoint (`.dmd/index.html`) — the ONLY distributable at the docs root — so crawlers and static hosts see the full site; dot-prefixed directories are excluded from document discovery. The offline artifact is written separately to `./docs/.dmd/.singlefile/index.html`. The artifact stores compact JSON and the production runtime in a gzip-compressed, base64-encoded envelope with a minified self-extractor. Open that file directly in a browser (`file:///.../index.html`) on air-gapped machines, send it via email, or distribute it with offline desktop applications. Use `--no-single-file` to skip the offline artifact, or `--out-dir <path>` to place it elsewhere.

Serveable DocMeDown sites also include a **Download** action in the navbar. It reads the already-loaded documentation corpus and current runtime, compresses them locally with the browser's native gzip stream, and downloads the same self-contained format without requesting `.dmd/.singlefile/index.html`. In a downloaded or CLI-built offline copy, the control is greyed out as **Offline copy** because the page is already portable.

`docmedown serve ./docs` and `docmedown dev ./docs` also run this standard build at startup. While the server is running, Markdown and `.dmd/.config/docs.json` changes are debounced, then rebuild the serveable artifacts and `./docs/.dmd/.singlefile/index.html` before the browser reloads.

To rebuild both outputs without starting a preview server, use watch mode:

```bash
npx docmedown build ./docs --watch
```

Within this repository, the equivalent command is `npm run build:docs:watch`.

---

## 🚢 GitHub Pages Hosting

The repository includes `.github/workflows/pages.yml`, which builds the production runtime and generated documentation assets before publishing `./docs/.dmd/` through GitHub Pages. This is required because `_docs.js`, `_manifest.json`, and `docmedown.web.js` are generated files and intentionally ignored by Git.

To enable it for a repository fork or project site:

1. Push the workflow to the `main` branch.
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. Push documentation or runtime changes; the workflow runs `npm ci`, `npm run build`, and `npm run build:docs`, then uploads the hidden `docs/.dmd/` workspace (the `docs/index.html` symlink targets that same serveable entrypoint, so local `/docs/` serving matches Pages).

The generated entrypoint uses same-directory relative URLs (`./_docs.js` and `./docmedown.web.js`), so it works at both a custom domain and a project URL such as `/repository-name/`. The Pages workflow verifies those generated files before upload and includes `.nojekyll` for direct static-file compatibility. Hash routing keeps document navigation client-side without requiring server rewrites.

---

## 🧩 Custom Components (`.dmd/.components/`)

DocMeDown provides a **Universal Component Compatibility Layer**. You can author custom widgets in **native Svelte 5**, **React with TypeScript (TSX)**, or standard **Web Elements (Lit)** with zero build setup:

### 1. Svelte 5 Component (`.dmd/.components/CounterWidget.svelte`)

```svelte title=".dmd/.components/CounterWidget.svelte"
<script>
  let { title = "Interactive Counter" } = $props();
  let count = $state(0);
</script>

<div class="counter-widget">
  <strong>{title}: {count}</strong>
  <button onclick={() => count++}>+1</button>
</div>
```

### 2. React TSX Component (`.dmd/.components/ReactMetricCard.tsx`)

```tsx title=".dmd/.components/ReactMetricCard.tsx"
import React, { useState } from "react";

export default function ReactMetricCard({ label = "Query Rate", initial = 100 }) {
  const [val, setVal] = useState(initial);
  return (
    <div className="metric-panel">
      <strong>{label}: {val} req/s</strong>
      <button onClick={() => setVal(val + 10)}>Boost</button>
    </div>
  );
}
```

Use `<CounterWidget />` or `<ReactMetricCard />` directly inside any Markdown document!

- **Build-Time AOT Compilation**: Standard React TSX components are compiled Ahead-of-Time into native Svelte 5 custom elements during `docmedown build`, eliminating React runtime overhead.
- **Runtime Bridge Fallback**: Complex React components mount cleanly via `ReactBridge` (`createRoot`), preserving hook fidelity.
- **Offline Parity**: All `.dmd/.components/` components are pre-compiled and embedded in `./docs/.dmd/.singlefile/index.html` for 100% self-contained offline functionality (the root `docs/index.html` symlink instead serves the SEO site).
- **Legacy Compatibility**: Bare `.dmd/` components and standard `.dmd/components.js` custom element modules remain fully supported as a deprecated fallback.

### Ready-to-Use Built-in Markdown Components

```html
<!-- Interactive Tabs -->
<Tabs>
  <Tab label="npm">npm install docmedown</Tab>
  <Tab label="yarn">yarn add docmedown</Tab>
  <Tab label="pnpm">pnpm add docmedown</Tab>
</Tabs>

<!-- Feature Cards -->
<CardGrid cols={2}>
  <Card
    title="Instant Setup"
    description="Zero configuration required."
    badge="Fast"
    badgeType="success"
  />
  <Card
    title="Complete Theme Families"
    description="Atlas, Blueprint, Terminal, Editorial, Botanical, and Studio change the entire reading system."
    badge="New"
    badgeType="new"
  />
</CardGrid>

<!-- Step-by-Step Guide -->
<Steps>
  <Step title="Install" step={1}>Install via npm or use standalone script.</Step>
  <Step title="Write Markdown" step={2}>Add your .md guides and tutorials.</Step>
  <Step title="Publish" step={3}>Deploy to any static web host or GitHub Pages.</Step>
</Steps>
```

---

## ⚙️ Configuration Reference (`docs.json`)

DocMeDown validates configuration from `docs.json`, `dmd.json`, inline `#dmd-config` JSON, and embedded manifests before applying defaults. Add the published JSON Schema reference for editor completion and immediate feedback:

```json
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "My Documentation",
  "tagline": "The simplest Markdown documenter yet",
  "version": "1.0.0",
  "rootDoc": "README.md",
  "theme": {
    "family": "atlas",
    "density": "comfortable",
    "defaultMode": "auto",
    "codeTheme": "github"
  },
  "nav": [
    { "label": "Overview", "href": "#/README" },
    { "label": "Getting Started", "href": "#/getting-started" },
    { "label": "Guides", "href": "#/guides/custom-components" }
  ],
  "socials": [
    { "type": "github", "url": "https://github.com/my-org/my-repo" }
  ],
  "search": {
    "enabled": true,
    "placeholder": "Search docs..."
  },
  "footer": {
    "copyright": "© 2026 My Organization. All rights reserved.",
    "showBuiltWith": true
  }
}
```

Unknown keys are rejected. The npm package also ships the portable schema at `schemas/docs.schema.json`; TypeScript consumers can import `docConfigSchema` and `parseDocConfig` from `docmedown`. See the full [configuration reference](./docs/configuration.md) for every field and validation rule.

### Theme Families

| Family | Best suited for | Visual system |
| :--- | :--- | :--- |
| `atlas` *(default)* | General product and API documentation | Neutral mineral canvas, cobalt actions, balanced spacing |
| `blueprint` | Architecture and technical specifications | Squared geometry, drafting rules, coral signals |
| `terminal` | CLI, operations, and infrastructure manuals | Dark-first console character, compact rhythm, monospace utilities |
| `editorial` | Guides, handbooks, and long-form reading | Warm paper surfaces, serif display type, generous article rhythm |
| `botanical` | Research notes, learning resources, and field guides | Sage book-cloth surfaces, fern accents, serif headings, leaf-shaped notes |
| `studio` | Design systems and creative product documentation | Lilac stock, violet ink, bold display type, offset-print frames |

Use the **Appearance** menu to switch family, color mode, and reading density at runtime. Set `accentColor` and `accentColorDark` only when a brand color must override the family default. Legacy accent-only presets remain accepted temporarily for migration but should not be used in new configurations.

---

## 🛠️ CLI Command Reference
 
| Command | Description |
| :--- | :--- |
| `docmedown [dir]` | Quickstart setup if empty (shows preview tree & prompts for confirmation), or starts local preview server |
| `docmedown init [dir]` | Interactive setup wizard to configure and scaffold docs (shows preview tree & prompts for confirmation) |
| `docmedown serve [dir]` (or `dev`) | Starts local live-reloading dev server with WebSocket HMR and in-browser editor (`Ctrl+E`) |
| `docmedown serve [dir] --preview` | Starts dev server in staged `.preview/` overlay mode |
| `docmedown build [dir]` | Builds serveable files, prerendered static pages with SEO metadata, AI context files (`llms.txt`, `llms-full.txt`, `SKILL.md`, `okf.json`), and `./<dir>/.dist/index.html` for offline use |
| `docmedown build [dir] --no-single-file` | Builds serveable files only |
| `docmedown build [dir] --no-static` | Skips static page prerendering and SEO/AI context files |
| `docmedown mcp [dir]` | Serves documentation as an MCP (Model Context Protocol) server over stdio or SSE |
| `docmedown validate [dir]` | Validates Markdown links, anchors, frontmatter, and `docs.json` schema |
| `docmedown doctor [dir]` | Diagnoses Node environment, missing assets, and `.dmd` component compilation |
| `docmedown config [path]` | Launches interactive TUI configuration wizard |

---

## 🚀 Maintainer release command

Maintainers publish a prepared version with one command:

```bash
npm run deploy
```

It validates the release, pushes `main` and `v<version>` to GitHub, publishes to npm, and verifies the npm registry. Run `npm run deploy:dry-run` to validate without changing GitHub or npm.

The prepared **0.9.9-b** candidate is not published; **1.0.0-rc-a** remains the
later milestone. Candidate metadata and release notes are synchronized, but
publication remains blocked by the readiness matrix and npm authentication in
`CONTRIBUTING.md`. Every prerelease requires explicit version and changelog preparation;
automatic patch selection does not advance an existing prerelease. All prereleases
use the existing npm `alpha` dist-tag, not `latest`. See the repository's
`CONTRIBUTING.md` release procedure and evidence matrix before running deploy.

## 🧹 Quality checks & local MCP testing

DocMeDown uses [Biome](https://biomejs.dev/) for formatting, import organization, and linting, and Zod for runtime configuration validation.

```bash
npm run lint          # check formatting, imports, and lint rules
npm run lint:fix      # apply Biome fixes
npm run format        # format maintained source files
npm run typecheck     # static type analysis
npm test              # full unit test suite
npm run test:mcp      # dedicated MCP protocol test suite
npm run dev:mcp       # launch local MCP server over stdio
npm run test:mcp:client # test MCP queries interactively from CLI
```

`npm run test:release` runs all of these checks plus production, documentation, and package smoke builds.

For indexing performance, run `npm run benchmark:headings` (synthetic corpora) or
`npm run benchmark:headings -- --corpus ./docs --rounds 5 --warmups 1` (read-only
real-corpus profile). See repository file `scripts/benchmark-headings.md`
and the [contributor documentation checklist](CONTRIBUTING.md#documentation-maintenance).

---

## 📄 License

DocMeDown is open-source software licensed under the [Apache License, Version 2.0](LICENSE).

Copyright © 2026 Gabriel M. P. da Silva and DocMeDown Contributors.

### Rationale for Apache License 2.0

DocMeDown is licensed under the **Apache License, Version 2.0**. While both MIT and Apache 2.0 are permissive open-source licenses granting full freedom to use, modify, distribute, and commercialize the software, Apache 2.0 provides key legal and practical advantages:

1. **Explicit Patent License Grant (Section 3)**:
   MIT provides a general copyright license but does not explicitly address software patents. Apache 2.0 includes an express, royalty-free, perpetual patent license granted by all contributors to any user, eliminating legal ambiguity and providing total confidence when adopting DocMeDown in enterprise environments.

2. **Defensive Patent Retaliation**:
   Apache 2.0 contains a mutual termination clause: if an entity files a patent infringement lawsuit against the project or its users claiming the work infringes their patents, any patent licenses granted to that entity under Apache 2.0 are automatically terminated. This prevents predatory patent litigation and protects the community.

3. **Trademark Protection (Section 6)**:
   Apache 2.0 explicitly clarifies that the license does not grant trademark rights to use the project’s name, logo, or branding without permission, preventing malicious or misleading impersonation of DocMeDown while keeping the code 100% open.

4. **Contributor Clarity & Enterprise Adoption**:
   Apache 2.0 standardizes intellectual property and contribution guidelines (Sections 4 & 5). It is the recognized standard across modern developer infrastructure (such as Kubernetes, Apache Software Foundation projects, LLVM runtimes, Android, and TypeScript components), ensuring frictionless compliance for corporate legal teams and independent developers alike.

