# DocMeDown ⚡
### *The simplest MarkDown documenter yet.*

[![npm version](https://img.shields.io/npm/v/docmedown.svg?style=flat-square&color=6366f1)](https://www.npmjs.com/package/docmedown)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![CI](https://github.com/gabrielmsilva00/docmedown/actions/workflows/ci.yml/badge.svg)](https://github.com/gabrielmsilva00/docmedown/actions/workflows/ci.yml)

**DocMeDown** is a zero-friction, ultra-lightweight documentation engine and CLI utility. Similar in visual elegance and features to **Docusaurus** and **VitePress**, but with **10x simpler setup** and zero build baggage.

Source code, issues, and releases live at [github.com/gabrielmsilva00/docmedown](https://github.com/gabrielmsilva00/docmedown).

Drop a single `index.html` file into any directory of `.md` files, and you have a fast, responsive documentation website with a complete reading interface.

---

## ✨ Features at a Glance

- 🚀 **Zero-Config Auto-Discovery**: Automatically parses and indexes all `.md` files & subfolders into categories, builds navigation sidebars, and powers instant search out of the box.
- 🌐 **Dual Usage: CLI Tool & Web Script**:
  - Run via single-line CLI: `npx docmedown ./docs`
  - Or drop `<script src="docmedown.js"></script>` into an `index.html` on any static host.
- ⚡ **Dynamic Remote GitHub / GitLab Mode**: Document any GitHub or GitLab repository *live* without hosting markdown files statically! Changes pushed to your repo dynamically update the documentation website immediately.
- 📦 **Compressed Offline Copies**: Generate or download a minified, self-extracting `index.html` containing the complete documentation corpus, custom components, Mermaid renderer, styles, and runtime. Double-click it under `file:///` without a web server.
- 🎨 **Four Complete Theme Families**: Atlas, Blueprint, Terminal, and Editorial each redefine surfaces, geometry, typography, spacing, and diagram palettes—not merely the accent color. Every family supports light, dark, automatic mode, and comfortable or compact density.
- 🔍 **Instant Fuzzy Search**: Keyboard-driven command palette (`⌘K` / `Ctrl+K`) with real-time in-browser indexing.
- ⚛️ **React Custom Components (.dmd)**: Support for custom React components inside `.dmd/` or built-in components (`<Tabs>`, `<CardGrid>`, `<Badge>`, `<Steps>`).
- 📊 **Mermaid Diagrams & KaTeX Math**: Theme-aware diagrams with automatic Fit, zoom, 1:1 view, SVG export, expanded review, and offline parity, plus native LaTeX equations.
- 💡 **GitHub-Style Callouts**: Full support for `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, and `[!CAUTION]`.

---

## 🚀 10-Second Quickstart

### Option 1: Using the CLI Tool

```bash
# Scaffold a new documentation directory and start preview immediately
npx docmedown ./docs
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

The serveable manifest and runtime remain in `./docs`. The offline artifact is written to `./docs/.dist/index.html`; dot-prefixed directories are excluded from document discovery. The artifact stores compact JSON and the production runtime in a gzip-compressed, base64-encoded envelope with a minified self-extractor. Open that file directly in a browser (`file:///.../.dist/index.html`) on air-gapped machines, send it via email, or distribute it with offline desktop applications. Use `--no-single-file` to skip the offline artifact, or `--out-dir <path>` to place it elsewhere.

Serveable DocMeDown sites also include a **Download** action in the navbar. It reads the already-loaded documentation corpus and current runtime, compresses them locally with the browser's native gzip stream, and downloads the same self-contained format without requesting `.dist/index.html`. In a downloaded or CLI-built offline copy, the control is greyed out as **Offline copy** because the page is already portable.

`docmedown serve ./docs` and `docmedown dev ./docs` also run this standard build at startup. While the server is running, Markdown and `docs.json` changes are debounced, then rebuild the serveable artifacts and `./docs/.dist/index.html` before the browser reloads.

To rebuild both outputs without starting a preview server, use watch mode:

```bash
npx docmedown build ./docs --watch
```

Within this repository, the equivalent command is `npm run build:docs:watch`.

---

## 🚢 GitHub Pages Hosting

The repository includes `.github/workflows/pages.yml`, which builds the production runtime and generated documentation assets before publishing `./docs/` through GitHub Pages. This is required because `_docs.js`, `_manifest.json`, and `docmedown.iife.js` are generated files and intentionally ignored by Git.

To enable it for a repository fork or project site:

1. Push the workflow to the `main` branch.
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. Push documentation or runtime changes; the workflow runs `npm ci`, `npm run build`, and `npm run build:docs`, then uploads the complete `docs/` directory.

The generated entrypoint uses same-directory relative URLs (`./_docs.js` and `./docmedown.iife.js`), so it works at both a custom domain and a project URL such as `/repository-name/`. The Pages workflow verifies those generated files before upload and includes `.nojekyll` for direct static-file compatibility. Hash routing keeps document navigation client-side without requiring server rewrites.

---

## ⚛️ Custom React Components (.dmd)

Define global React components in a browser-loadable `.dmd/components.js` module. React is available as `window.React` in that module:

```js title=".dmd/components.js"
const { createElement, useState } = window.React;

export function CounterButton() {
  const [count, setCount] = useState(0);
  return createElement(
    'button',
    { onClick: () => setCount((value) => value + 1) },
    `Clicked ${count} times`
  );
}

export default {
  CounterButton,
};
```

You can now use `<CounterButton />` anywhere inside your Markdown documents!

The standard build embeds `.dmd/components.js` in `docs/.dist/index.html`, so the same custom components work in the distributable offline bundle.

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
    description="Atlas, Blueprint, Terminal, and Editorial change the entire reading system."
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

Use the **Appearance** menu to switch family, color mode, and reading density at runtime. Set `accentColor` and `accentColorDark` only when a brand color must override the family default. Legacy accent-only presets remain accepted temporarily for migration but should not be used in new configurations.

---

## 🛠️ CLI Command Reference

| Command | Description |
| :--- | :--- |
| `docmedown [dir]` | Auto-initializes if empty, or starts local preview server |
| `docmedown init [dir]` | Scaffolds starter docs, `index.html`, `docs.json`, and `.dmd` folder |
| `docmedown serve [dir]` (or `dev`) | Starts local live-reloading dev server on `http://localhost:3000` |
| `docmedown build [dir]` | Builds serveable files and `./<dir>/.dist/index.html` for offline use |
| `docmedown build [dir] --no-single-file` | Builds serveable files only |
| `docmedown config [path]` | Launches interactive TUI configuration wizard |

---

## 📄 License

MIT © DocMeDown Contributors

---

## 🚀 Maintainer release command

Maintainers publish a prepared version with one command:

```bash
npm run deploy
```

It validates the release, pushes `main` and `v<version>` to GitHub, publishes to npm, and verifies the npm registry. Run `npm run deploy:dry-run` to validate without changing GitHub or npm.

## 🧹 Quality checks

DocMeDown uses [Biome](https://biomejs.dev/) for formatting, import organization, and linting, and Zod for runtime configuration validation.

```bash
npm run lint       # check formatting, imports, and lint rules
npm run lint:fix   # apply Biome fixes
npm run format     # format maintained source files
npm run typecheck
npm test
```

`npm run test:release` runs all of these checks plus production, documentation, and package smoke builds.
