---
title: Project Structure & Organization
description: Complete directory anatomy, frontmatter schema, auto-indexing rules, manual sidebar trees, and nested documentation sites.
order: 1
category: Core Concepts
tags: [project-structure, organization, frontmatter, sidebar, autoindex, navigation, directory]
---

# Project Structure & Organization 📁

DocMeDown uses a filesystem-driven architecture designed to be predictable, transparent, and easy to maintain. This guide covers how documents are organized, how frontmatter affects navigation, how auto-indexing works, and how to define custom sidebar hierarchies.

---

## 🗂️ Workspace Directory Anatomy

A complete DocMeDown documentation workspace typically looks like this:

```
my-project/
├── docs/                               # Documentation root: ONLY sources + index.html symlink
│   ├── index.html                      # Symlink → .dmd/index.html (ONLY distributable: SEO site)
│   ├── README.md                       # Home document (serves at #/README or /)
│   ├── getting-started.md              # First-level document (#/getting-started)
│   ├── configuration.md                # First-level document (#/configuration)
│   ├── guides/                         # Nested guide directory (creates category)
│   │   ├── project-structure.md        # Document under /guides/
│   │   ├── architecture.md             # Document under /guides/
│   │   ├── markdown-features.md        # Document under /guides/
│   │   └── cli-reference.md            # Document under /guides/
│   └── .dmd/                           # Hidden build workspace (never linked in docs)
│       ├── index.html                  # Serveable site entrypoint
│       ├── _manifest.json              # Indexed corpus + headings
│       ├── _docs.js                    # Offline file:/// fallback data
│       ├── docmedown.web.js            # Serveable runtime (+ docmedown-mermaid.js)
│       ├── .singlefile/index.html      # Self-contained offline bundle (explicit distributable)
│       ├── .components/                # Custom components (Svelte/TSX/Lit, auto-discovered)
│       │   ├── CounterWidget.svelte    # Svelte 5 custom component (<CounterWidget />)
│       │   ├── MetricCard.tsx          # React TSX component (<MetricCard />)
│       │   └── ClusterBadge.ts         # Lit Web Component (<ClusterBadge />)
│       └── .config/docs.json           # Site configuration, theme & branding
├── package.json
└── tsconfig.json
```

### Key Directories & Files Explained

| Path | Purpose | Behavior |
| :--- | :--- | :--- |
| **`docs/index.html`** | Distributable Symlink | Points at `.dmd/index.html` (serveable SEO site); the ONLY distributable at the docs root. |
| **`docs/README.md`** | Default Home Document | Automatically mapped to the documentation root route (`#/README` or `/`). |
| **`docs/.dmd/`** | Hidden Build Workspace | Generated site, runtimes, static pages, SEO/AI files. Never linked in navigation. |
| **`docs/.dmd/.singlefile/`** | Offline Artifacts | Self-contained single-file bundle (`index.html`), double-clickable via `file:///`; explicit offline distributable (NOT the root symlink). |
| **`docs/.dmd/.components/`** | Custom Components | Files placed here (`.svelte`, `.tsx`, `.ts`) are precompiled and available directly in Markdown without imports. Bare `.dmd/` still works as a deprecated fallback. |
| **`docs/.dmd/.config/`** | Site Configuration | `docs.json` / `dmd.json` live here by default; bare `docs/*.json` still works as a fallback. |
| **`docs/.dmd/_manifest.json`** | Build Cache & Index | Emitted during `docmedown build` containing the indexed documentation corpus and headings. |
| **`docs/.dmd/_docs.js`** | Offline Fallback Data | Embedded in local static builds for fallback loading when running via `file:///`. |

---

## 📑 Frontmatter Specification

Every `.md` and `.mdx` document supports standard YAML frontmatter between `---` delimiters at the very top of the file:

```yaml
---
title: Engine Architecture & How It Works
sidebar_label: Architecture
description: Under-the-hood deep dive into DocMeDown's zero-config engine.
order: 2
category: Core Concepts
icon: 🏛️
badge: Deep Dive
badge_type: info
tags: [architecture, engine, svelte-5, runes]
hidden: false
noindex: false
---
```

### Supported Frontmatter Fields

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`title`** | `string` | Derived from filename | The main document title displayed as the page `<h1>` and browser tab title. |
| **`sidebar_label`** | `string` | `title` or filename | Optional shorter label used in the sidebar navigation tree. |
| **`description`** | `string` | *(empty)* | Page meta description for SEO and AI context indexing (`llms.txt`). |
| **`order`** | `number` | `0` (`-999` for README) | Explicit sorting position in the sidebar when using auto-indexing. |
| **`category`** | `string` | Parent directory name | Human-readable category badge shown in the top navbar breadcrumbs. |
| **`icon`** | `string` | *(none)* | Emoji or icon character displayed next to the link in the sidebar (e.g. `⚡`, `🚀`). |
| **`badge`** | `string` | *(none)* | Short badge tag displayed next to the title in the sidebar (e.g. `New`, `v0.9.0`). |
| **`badge_type`** | `string` | `info` | Badge color variant: `info`, `success`, `warning`, or `new`. |
| **`tags`** | `string[]` | `[]` | Array of keywords. Enables clickable tag pills in the navbar and tag filtering modal. |
| **`hidden`** | `boolean` | `false` | When `true`, hides the document from the sidebar navigation (still accessible via URL). |
| **`noindex`** | `boolean` | `false` | When `true`, adds `<meta name="robots" content="noindex">` to the prerendered HTML. |

---

## 🧭 Navigation: Auto-Indexing vs Manual Sidebar

DocMeDown gives you complete flexibility in how navigation is generated:

### Option A: Automatic Indexing (`autoIndex`)

By default, DocMeDown scans all Markdown files and constructs the sidebar tree automatically based on the filesystem:

```
docs/
├── README.md               -> Slug: README (Overview)
├── getting-started.md      -> Slug: getting-started
└── guides/
    ├── installation.md     -> Category: Guides > Installation (Slug: guides/installation)
    └── advanced.md         -> Category: Guides > Advanced (Slug: guides/advanced)
```

In `docs.json`, you can configure how auto-indexing sorts items:

```json title="docs.json"
{
  "autoIndex": {
    "enabled": true,
    "sort": "natural",
    "defaultCollapsed": false,
    "exclude": ["drafts", "internal"]
  }
}
```

- **`sort: "natural"`**: Respects frontmatter `order` first, then falls back to human-friendly alphabetical ordering.
- **`sort: "frontmatter"`**: Strictly orders by `order` property.
- **`sort: "alphabetical"`**: Strictly orders alphabetically by document title.

---

### Option B: Explicit Manual Sidebar (`sidebar`)

For complete control over grouping, categories, custom ordering, and badges, define the `sidebar` array in `docs.json`:

```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "My Project Docs",
  "sidebar": [
    {
      "title": "Getting Started",
      "icon": "🚀",
      "children": [
        { "title": "Overview", "path": "README.md", "icon": "⚡" },
        { "title": "Quickstart", "path": "getting-started.md", "icon": "🚀", "badge": "Start Here", "badgeType": "success" },
        { "title": "Project Structure", "path": "guides/project-structure.md", "icon": "📁" }
      ]
    },
    {
      "title": "Core Concepts",
      "icon": "🏛️",
      "children": [
        { "title": "Architecture", "path": "guides/architecture.md", "icon": "⚙️" },
        { "title": "Markdown Features", "path": "guides/markdown-features.md", "icon": "📝" }
      ]
    },
    {
      "title": "Advanced",
      "icon": "⚡",
      "collapsed": true,
      "children": [
        { "title": "CLI Reference", "path": "guides/cli-reference.md", "icon": "💻" },
        { "title": "Custom Components", "path": "guides/custom-components.md", "icon": "🧩", "badge": "New", "badgeType": "new" }
      ]
    }
  ]
}
```

> [!TIP]
> **Collapsible Groups**: Set `"collapsed": true` on any category node to have it start collapsed by default. Readers can click the arrow to expand it anytime.

---

## 🪆 Nested Documentation Sites

DocMeDown supports **nested documentation sites**. If any subdirectory inside your documentation directory contains its own `docs.json`, DocMeDown recognizes it as an isolated, independent documentation project:

```
docs/
├── docs.json                 # Parent documentation site
├── README.md
└── examples/
    ├── local-docs/
    │   ├── docs.json         # Nested Site 1 (has independent theme & navigation)
    │   └── README.md
    └── remote-github/
        ├── docs.json         # Nested Site 2 (has independent theme & navigation)
        └── index.html
```

### Why this is powerful:
1. **Isolated Manifests**: Parent site searches and sidebars do not mix with sub-site documents.
2. **Independent Themes**: Nested sites can use different theme families (e.g. parent uses `atlas`, sub-site uses `terminal`).
3. **Offline Inlining**: When building single-file offline bundles, parent sites automatically embed nested sites into the same distributable file!

---

## 🗺️ Next Steps

Continue along the linear documentation journey:

<CardGrid cols={2}>
  <Card
    title="Engine Architecture"
    description="Understand how the virtual loader, Svelte 5 runtime, and offline envelopes work."
    href="#/guides/architecture"
    badge="Next Up"
    badgeType="info"
  />
  <Card
    title="Quickstart & Setup"
    description="Review the initial setup, package scripts, and CLI commands."
    href="#/getting-started"
    badge="Previous"
    badgeType="success"
  />
</CardGrid>
