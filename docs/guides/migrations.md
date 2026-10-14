---
title: Migration Guides (Docusaurus, VitePress, Docsify)
description: Step-by-step migration recipes from Docusaurus, VitePress, Docsify, and MkDocs to DocMeDown with configuration mappings and component conversions.
order: 13
category: Migration & Ecosystem
tags: [migration, docusaurus, vitepress, docsify, mkdocs, guides, comparison]
---

# Migration Guides 🔄

Switching to DocMeDown simplifies your documentation stack dramatically. By replacing complex bundlers and static site configurations with DocMeDown's zero-config engine, you get:
- **Instant Dev Server**: Under 10ms startup without bundling pauses.
- **Air-Gapped Offline Bundling**: Double-clickable single-file `.dist/index.html` with zero CORS errors.
- **AI-Native Context**: Built-in Model Context Protocol (MCP) server, `llms.txt`, and `SKILL.md`.
- **Multi-Framework Components**: Use Svelte 5, React TSX, or Web Components without configuring Babel or MDX plugins.

Choose your current documentation framework below:

---

## 🦖 Migrating from Docusaurus

Docusaurus requires Node build setups, `docusaurus.config.js`, sidebars files, and React MDX compilation.

### Step 1: Copy your Markdown files
Copy your `docs/` folder into your new DocMeDown project:

```bash
# Keep your markdown files as-is:
cp -r my-docusaurus-app/docs ./docs
```

DocMeDown natively understands GitHub Flavored Markdown, code block titles, and Frontmatter.

### Step 2: Map `docusaurus.config.js` to `docs.json`

| Docusaurus Property | DocMeDown (`docs.json`) Equivalent |
| :--- | :--- |
| `title: "My Site"` | `"name": "My Site"` |
| `tagline: "The best docs"` | `"tagline": "The best docs"` |
| `url: "https://mysite.com"` | `"url": "https://mysite.com"` |
| `themeConfig.navbar.items` | `"nav": [...]` |
| `themeConfig.footer.copyright` | `"footer.copyright": "..."` |
| `themeConfig.colorMode.defaultMode` | `"theme.defaultMode": "auto"` |

### Step 3: Migrate Sidebars
In Docusaurus, sidebars are defined in `sidebars.js`. In DocMeDown:
- **Option A (Zero-Config)**: Delete `sidebars.js`! DocMeDown auto-indexes your directory structure and frontmatter `order`.
- **Option B (Explicit)**: Translate into the `sidebar` array in `docs.json`:

```json title="docs.json"
{
  "sidebar": [
    {
      "title": "Tutorial",
      "children": [
        { "title": "Intro", "path": "intro.md" },
        { "title": "Basics", "path": "basics.md" }
      ]
    }
  ]
}
```

### Step 4: Migrate React MDX Components
In Docusaurus, components are imported at the top of MDX files:
```mdx
import MyWidget from '@site/src/components/MyWidget';

<MyWidget />
```

In DocMeDown:
1. Drop `MyWidget.tsx` into `docs/.dmd/`.
2. Delete the `import` statement in your Markdown!
3. Use `<MyWidget />` anywhere directly.

---

## ⚡ Migrating from VitePress

VitePress uses Vue 3, Vite, and `.vitepress/config.mts`.

### Step 1: Map `.vitepress/config.mts` to `docs.json`

```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "My Docs",
  "theme": {
    "family": "atlas",
    "density": "comfortable"
  },
  "nav": [
    { "label": "Guide", "href": "#/guide/getting-started" },
    { "label": "Config", "href": "#/config" }
  ]
}
```

### Step 2: Migrate Vue Components to Svelte 5 or React TSX
Instead of Vue components inside `.vitepress/theme/`, create lightweight **Svelte 5** (`.svelte`) or **React TSX** (`.tsx`) files in `.dmd/`. They compile automatically into standard Web Components.

---

## 📄 Migrating from Docsify

Docsify is a client-side Markdown reader, but lacks static prerendering (SEO), offline single-file bundles, and modern component support.

### Step 1: Replace `index.html` runtime
In Docsify, you maintain a custom `index.html` with window configurations and CDN scripts.

With DocMeDown, replace this with a clean `docs.json`:
```bash
npx docmedown init ./docs
```

### Why DocMeDown is a massive upgrade over Docsify:
1. **Search Engine Optimization (SEO)**: Docsify is invisible to many search crawlers because it renders client-side only. DocMeDown prerenders full semantic HTML with Open Graph and JSON-LD.
2. **100% Offline Double-Clickable**: Docsify fails when opening via `file:///` because browsers block `fetch()`. DocMeDown bundles everything into a single-file self-extracting envelope.
3. **Svelte 5 Reactivity**: Modern runes engine instead of legacy DOM manipulation.
4. **AI-Native MCP**: Instant integration with Claude Desktop, Cursor, and Windsurf.

---

## 🐍 Migrating from MkDocs (Material for MkDocs)

MkDocs relies on Python, `pip`, and `mkdocs.yml`.

### Mapping `mkdocs.yml` to `docs.json`:

```yaml title="mkdocs.yml"
site_name: Project Manual
theme:
  name: material
  palette:
    scheme: default
nav:
  - Home: index.md
  - Guide: guides/start.md
```

Translates directly into:

```json title="docs.json"
{
  "name": "Project Manual",
  "theme": {
    "family": "blueprint",
    "defaultMode": "auto"
  },
  "sidebar": [
    { "title": "Home", "path": "index.md" },
    { "title": "Guide", "path": "guides/start.md" }
  ]
}
```

Now you can eliminate Python build dependencies from your CI/CD pipeline!

---

## 🗺️ Next Steps

Continue along the linear documentation journey:

<CardGrid cols={2}>
  <Card
    title="Component Showcase"
    description="Explore live interactive previews and code snippets for all built-in elements."
    href="#/showcase"
    badge="Next Up"
    badgeType="info"
  />
  <Card
    title="CLI Command Reference"
    description="Review flags and options for init, serve, build, validate, and doctor."
    href="#/guides/cli-reference"
    badge="Previous"
    badgeType="success"
  />
</CardGrid>
