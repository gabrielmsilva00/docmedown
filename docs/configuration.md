---
title: Configuration Reference (docs.json)
description: Complete cookbook and schema reference for docs.json, theme families, navigation, branding, custom sidebars, and runtime options.
order: 13
category: Reference & Configuration
tags: [config, reference, themes, json, customization, branding, sidebar]
---

# Configuration Cookbook & Reference (`docs.json`) ⚙️

While DocMeDown works with **zero configuration out of the box**, a `docs.json` file in your documentation directory unlocks complete control over themes, branding, navigation, search, custom sidebars, and dynamic Git sources.

Add the schema definition at the top of your `docs.json` for instant autocomplete and validation in VS Code, Cursor, and JetBrains IDEs:

```json
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "My Project"
}
```

---

## 🍳 Configuration Archetypes (Copy & Paste)

Choose the preset archetype closest to your project:

<Tabs type="pills">
  <Tab label="1. Open-Source Library (Atlas)" icon="📦">
```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "SuperLib",
  "tagline": "Next-generation state management for modern web apps",
  "version": "1.0.0",
  "url": "https://superlib.dev",
  "theme": {
    "family": "atlas",
    "density": "comfortable",
    "defaultMode": "auto",
    "favicon": "default"
  },
  "nav": [
    { "label": "Overview", "href": "#/README" },
    { "label": "Quickstart", "href": "#/getting-started" },
    { "label": "API", "href": "#/api" },
    { "label": "GitHub", "href": "https://github.com/my-org/superlib", "external": true }
  ],
  "socials": [
    { "type": "github", "url": "https://github.com/my-org/superlib" },
    { "type": "discord", "url": "https://discord.gg/superlib" }
  ]
}
```
  </Tab>

  <Tab label="2. CLI / DevOps Runbook (Terminal)" icon="💻">
```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "KubeOps CLI",
  "tagline": "Cluster orchestration and incident response manual",
  "theme": {
    "family": "terminal",
    "density": "compact",
    "defaultMode": "dark",
    "codeTheme": "one-dark",
    "favicon": "terminal"
  },
  "nav": [
    { "label": "Runbooks", "href": "#/README" },
    { "label": "Incidents", "href": "#/incidents" },
    { "label": "Architecture", "href": "#/architecture" }
  ],
  "search": {
    "placeholder": "Search cluster runbooks & commands..."
  }
}
```
  </Tab>

  <Tab label="3. Technical Architecture Spec (Blueprint)" icon="📐">
```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "DataMesh Engine",
  "tagline": "Distributed telemetry protocol specification",
  "theme": {
    "family": "blueprint",
    "density": "comfortable",
    "defaultMode": "auto",
    "favicon": "minimal"
  },
  "nav": [
    { "label": "Specification", "href": "#/README" },
    { "label": "Schemas", "href": "#/schemas" },
    { "label": "RFCs", "href": "#/rfcs" }
  ]
}
```
  </Tab>

  <Tab label="4. Product Manual & Handbook (Editorial)" icon="📖">
```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Engineering Handbook",
  "tagline": "Principles, practices, and onboarding curriculum",
  "theme": {
    "family": "editorial",
    "density": "comfortable",
    "defaultMode": "light",
    "favicon": "book"
  },
  "nav": [
    { "label": "Welcome", "href": "#/README" },
    { "label": "Values", "href": "#/values" },
    { "label": "Engineering", "href": "#/engineering" }
  ]
}
```
  </Tab>

  <Tab label="5. Live Remote GitHub Source" icon="🌐">
```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Remote Docs",
  "source": {
    "type": "github",
    "repo": "owner/repository",
    "branch": "main",
    "docsDir": "docs"
  },
  "theme": {
    "family": "blueprint",
    "density": "comfortable"
  }
}
```
  </Tab>
</Tabs>

---

## 🎨 Theme Families & Aesthetics

DocMeDown ships **six complete visual systems**. A theme family is not a simple color toggle: it redefines canvas texture, borders, geometry, typography hierarchy, and diagram palettes:

| Family | Vibe & Aesthetics | Geometry | Typography | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **`atlas`** *(default)* | Mineral canvas, cobalt index rails, precise hierarchy | Measured 6–16px corners | Local system sans-serif | Developer libraries, SaaS products, APIs |
| **`blueprint`** | Technical drafting canvas, grid lines, vibrant coral signals | Squared corners | Sans-serif (System) | Architecture specs, protocol RFCs, frameworks |
| **`terminal`** | High-contrast console, phosphor prompts, compact chrome | Sharp 0–2px corners | Local monospace headings and utilities, sans body | CLI tools, DevOps runbooks, system manuals |
| **`editorial`** | Warm paper, brick accents, ink rules, generous reading rhythm | Restrained 2–4px corners | Local Palatino / Georgia serif | Handbooks, essays, long-form guides, books |
| **`botanical`** | Sage book cloth, fern accents, field-guide headings | Asymmetric leaf-shaped notes | Local Palatino headings, system sans body | Research notes, learning resources, field guides |
| **`studio`** | Lilac stock, violet ink, offset-print frames | Framed panels, hard offset shadows | Local Arial Black / system display, sans body | Design systems, creative product documentation |

All six families support light, dark, and automatic color modes, plus comfortable and compact density. Fonts use local stacks: no external font requests are needed, including in offline exports. Use the **Appearance** menu to preview and select a family; your choice is saved on the current browser origin.

### Custom Brand Colors
While each family selects harmonious colors automatically, you can override the action accent color:

```json title="docs.json"
{
  "theme": {
    "family": "atlas",
    "accentColor": "#6366f1",
    "accentColorDark": "#818cf8"
  }
}
```

### Built-in Favicon Presets
Choose from five crisp, self-contained SVG favicons that scale across light and dark browser chrome and embed automatically into offline bundles:

| Favicon | Description | Aesthetic |
| :--- | :--- | :--- |
| `"default"` | Modern folded document with signature downward arrow (`↓`) in indigo/violet gradient | DocMeDown official mark |
| `"markdown"` | Deep squircle badge with crisp white `M` and sky-blue downward arrow | Markdown-centric documentation |
| `"terminal"` | Obsidian console with window controls and emerald prompt (`>_`) | Developer CLIs & technical tools |
| `"book"` | Open book in vibrant royal blue | Guides, handbooks, and reference libraries |
| `"minimal"` | Geometric hexagon and spark in obsidian and cyan | Minimalist or enterprise toolkits |

---

## 📖 Comprehensive Parameter Reference

### Root Properties

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | `"DocMeDown"` | Project name displayed in the top navbar and page title. |
| `tagline` | `string` | `""` | Subtitle displayed in search modals and meta descriptions. |
| `description` | `string` | `""` | Global fallback description used for SEO and social share cards. |
| `version` | `string` | `""` | Release version displayed as a badge next to the site logo. |
| `home` | `string` | `"README.md"` | Target document opened when users click the brand title or Home icon. |
| `url` | `string` | `""` | Canonical production URL (enables `sitemap.xml` and `robots.txt` generation). |

#### Documentation Home (`"home"`)
Pin the site landing document explicitly with `"home"`:

```json title="docs.json"
{
  "home": "PROJECT.md"
}
```

When `"home"` is not explicitly configured, DocMeDown resolves it automatically from files at the root of your documentation folder in this order:
1. `README.md`, `PROJECT.md`, `ABOUT.md`, or `INDEX.md` (case-sensitive).
2. The same names case-insensitively (`readme.md`, `index.md`).
3. Otherwise, the alphabetically first Markdown document in the corpus.

---

### `theme` Object

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `family` | `"atlas" \| "blueprint" \| "terminal" \| "editorial" \| "botanical" \| "studio"` | `"atlas"` | Visual design system. |
| `density` | `"comfortable" \| "compact"` | `"comfortable"` | Controls navbar height, sidebar padding, and content spacing. |
| `defaultMode` | `"auto" \| "light" \| "dark"` | `"auto"` | Initial color mode for new visitors. |
| `codeTheme` | `"github" \| "one-dark" \| "dracula" \| "synthwave"` | `"github"` | Syntax highlighting color theme. |
| `favicon` | `string` | `"default"` | Built-in preset name or relative path to a local SVG/PNG file. |
| `accentColor` | `string (CSS Hex)` | Family default | Light-mode accent color. |
| `accentColorDark` | `string (CSS Hex)` | `accentColor` | Dark-mode accent color. |
| `logo.light` | `string` | `""` | Path to light mode logo image. |
| `logo.dark` | `string` | `""` | Path to dark mode logo image. |

---

### `nav` Array

Define links appearing in the top navigation bar:

```json title="docs.json"
"nav": [
  { "label": "Guides", "href": "#/guides/installation" },
  { "label": "API", "href": "#/api" },
  { "label": "GitHub", "href": "https://github.com/my-org/my-project", "external": true }
]
```

---

### `sidebar` Array (Explicit Custom Hierarchy)

Define exact category groupings, icons, and badges:

```json title="docs.json"
"sidebar": [
  {
    "title": "Getting Started",
    "icon": "🚀",
    "children": [
      { "title": "Overview", "path": "README.md", "icon": "⚡" },
      { "title": "Quickstart", "path": "getting-started.md", "icon": "🚀", "badge": "Essential", "badgeType": "success" }
    ]
  },
  {
    "title": "Advanced",
    "icon": "⚙️",
    "collapsed": true,
    "children": [
      { "title": "CLI", "path": "guides/cli-reference.md", "icon": "💻" }
    ]
  }
]
```

---

### `source` Object (Remote Git Repositories)

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `type` | `"github" \| "gitlab"` | `"github"` | Git hosting provider. |
| `repo` | `string` | *(required)* | Repository in `"owner/repo-name"` format. |
| `branch` | `string` | `"main"` | Target branch to pull documents from. |
| `docsDir` | `string` | `""` | Subdirectory containing documentation (e.g. `"docs"`). |
| `token` | `string` | `""` | Optional access token for private repositories. |

---

### `autoIndex` Object

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | Automatically discover and index all Markdown files. |
| `sort` | `"natural" \| "alphabetical" \| "frontmatter"` | `"natural"` | Sorting strategy for sidebar navigation. |
| `defaultCollapsed`| `boolean` | `false` | Whether nested folder categories start collapsed in the sidebar. |
| `exclude` | `string[]` | `["node_modules", ".git", ".dmd"]` | Directories ignored during scanning. |

---

### `search` Object

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | Enables fuzzy search command palette (<Kbd>⌘K</Kbd>). |
| `placeholder` | `string` | `"Search documentation (⌘K)..."` | Input placeholder text. |
| `maxResults` | `number` | `10` | Maximum search results displayed. |

---

### `offline` Object

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `embedNestedDocs` | `boolean` | `true` | Whether to inline sub-documentation sites into the single-file offline bundle. |

---

### `footer` Object

```json title="docs.json"
{
  "footer": {
    "copyright": "© 2026 My Team. Released under the MIT License.",
    "showBuiltWith": true,
    "links": [
      { "label": "Privacy Policy", "href": "https://example.com/privacy", "external": true },
      { "label": "Terms", "href": "https://example.com/terms", "external": true }
    ]
  }
}
```

---

## 🗺️ Next Steps

Continue along the linear documentation journey:

<CardGrid cols={2}>
  <Card
    title="CLI Command Reference"
    description="Learn all command options and flags for init, serve, build, validate, and doctor."
    href="#/guides/cli-reference"
    badge="Next Up"
    badgeType="info"
  />
  <Card
    title="Model Context Protocol (MCP)"
    description="Connect Cursor, Claude Desktop, and Windsurf to your documentation."
    href="#/guides/mcp-server"
    badge="Previous"
    badgeType="success"
  />
</CardGrid>
