---
title: Runnable Examples
description: Explore three complete, production-ready reference documentation sites nested inside DocMeDown.
order: 5
tags: [examples, reference-sites, nested-docs, architecture, showcase]
---

# Runnable Reference Examples 🧪

DocMeDown includes **three independent, fully working reference sites** directly inside this repository.

Each example is a self-contained documentation site with its own `.dmd/.config/docs.json`, theme family, custom components, search index, and offline bundle. You can open and inspect each one right now:

---

## 🏗️ Interactive Examples Matrix

| Example Site | Theme Family | Primary Use Case | Key Highlights | Launch |
| :--- | :--- | :--- | :--- | :--- |
| **[Local Engineering Docs](#1-local-engineering-docs)** | `terminal` (dark) | Developer APIs & internal tools | Monospace styling, `.dmd/.components/OrbitCounter.svelte`, nested guides | [Open Live Site](examples/local-docs/index.html) |
| **[Dynamic Remote GitHub](#2-dynamic-remote-github-portal)** | `blueprint` | Open-source libraries & repos | Zero local markdown files, dynamic API tree crawl, live sync | [Open Live Site](examples/remote-github/index.html) |
| **[Offline Air-Gapped Manual](#3-standalone-air-gapped-manual)** | `editorial` | Hardware manuals & field guides | Single-file HTML distributable, zero network requests, book layout | [Open Live Site](examples/single-file-offline/index.html) |

---

## 1. Local Engineering Docs

> **Live Preview:** [Open Local Docs Example (examples/local-docs/index.html)](examples/local-docs/index.html)

This reference site illustrates an operational, developer-centric documentation site styled with the **`terminal`** theme family.

```
examples/local-docs/
├── .dmd/.config/docs.json    # Terminal theme with compact density
├── README.md                 # System overview and quick reference
├── getting-started.md        # CLI & environment setup
├── guides/
│   ├── deployment.md         # Deployment runbooks
│   └── monitoring.md         # Observability & alert thresholds
└── .dmd/.components/
    └── OrbitCounter.svelte   # Interactive particle orbit widget
```

### Configuration (`examples/local-docs/.dmd/.config/docs.json`)
```json title="examples/local-docs/.dmd/.config/docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Local Reference Docs",
  "tagline": "Compact operational documentation",
  "theme": {
    "family": "terminal",
    "density": "compact",
    "defaultMode": "dark"
  },
  "nav": [
    { "label": "Overview", "href": "#/README" },
    { "label": "Getting Started", "href": "#/getting-started" }
  ]
}
```

### Interactive Svelte 5 Widget (`.dmd/OrbitCounter.svelte`)
This site demonstrates custom Svelte 5 runes (`$state`, `$derived`, `$props`) interacting with DocMeDown's terminal theme variables (`--dmd-primary`, `--dmd-bg-card`):

```svelte title="examples/local-docs/.dmd/OrbitCounter.svelte"
<svelte:options customElement="dmd-orbit-counter" />

<script>
  let count = $state(0);
  let speed = $derived(count * 2 + 1);
</script>

<div class="orbit-panel">
  <div class="orbit-center">
    <span>Orbital Velocity: {speed}x</span>
    <button onclick={() => count++}>Accelerate ({count})</button>
  </div>
</div>
```

---

## 2. Dynamic Remote GitHub Portal

> **Live Preview:** [Open Remote GitHub Example (examples/remote-github/index.html)](examples/remote-github/index.html)

This site demonstrates DocMeDown's **zero-hosting** capability. It contains **no Markdown files whatsoever on disk**! Instead, its `docs.json` points directly to an upstream GitHub repository.

```
examples/remote-github/
├── docs.json                 # Points to remote GitHub repository
└── index.html                # Lightweight HTML shell importing docmedown.web.js
```

### Configuration (`examples/remote-github/docs.json`)
```json title="examples/remote-github/docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Dynamic GitHub Reader",
  "tagline": "Live remote repository documentation",
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

### How the runtime behaves:
1. When a reader opens `index.html`, DocMeDown queries the GitHub API to crawl the directory tree of `facebook/react`.
2. The sidebar navigation, routing table, and search index are built **client-side on the fly**.
3. Clicking a page fetches the raw markdown content from `raw.githubusercontent.com` and parses it with full syntax highlighting and callouts.
4. Any commit merged into the remote GitHub repository is immediately visible upon refreshing the browser.

---

## 3. Standalone Air-Gapped Manual

> **Live Preview:** [Open Offline Example (examples/single-file-offline/index.html)](examples/single-file-offline/index.html)

This site is styled with the elegant **`editorial`** theme family (warm paper background, refined serif headings, brick accents). It demonstrates how DocMeDown packages an entire multi-page documentation corpus into a single, self-extracting `.dist/index.html`.

```
examples/single-file-offline/
├── docs.json                 # Editorial theme family
├── README.md                 # Handbook introduction
├── chapters/
│   ├── chapter-1.md          # In-depth guide
│   └── chapter-2.md          # Technical appendix
└── .dist/
    └── index.html            # 100% self-contained distributable (double-clickable)
```

### Configuration (`examples/single-file-offline/docs.json`)
```json title="examples/single-file-offline/docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "Field Engineering Manual",
  "tagline": "100% Offline Single-File Distributable",
  "theme": {
    "family": "editorial",
    "density": "comfortable",
    "defaultMode": "light"
  },
  "offline": {
    "embedNestedDocs": false
  }
}
```

### The Double-Click Guarantee:
Opening `examples/single-file-offline/.dist/index.html` via `file:///`:
- Uses the browser's native `DecompressionStream` to inflate the embedded Markdown corpus and runtime.
- Executes full client-side fuzzy search across all chapters.
- Runs without any network calls, external fonts, or local HTTP server.

---

## 🧩 The Nested Documentation Architecture

How can three completely different documentation websites live inside our own documentation folder without clashing?

```
DocMeDown Root (./docs/docs.json) ─── Atlas Family (Main Website)
  │
  ├── README.md, getting-started.md, guides/
  │
  └── examples/
      ├── local-docs/docs.json ──────── Terminal Family (Isolated Site)
      │     └── OrbitCounter.svelte
      │
      ├── remote-github/docs.json ───── Blueprint Family (Isolated Site)
      │     └── Dynamic GitHub Source
      │
      └── single-file-offline/docs.json  Editorial Family (Isolated Site)
            └── Offline Single-File HTML
```

### The Isolation Contract:
1. **Any folder containing a `docs.json` is a distinct Documentation Root**.
2. The parent scanner detects nested `docs.json` files and **stops crawling into that subdirectory**. This guarantees that the parent site's search index and navigation tree never leak pages or components from child sites.
3. When you run `npx docmedown build ./docs`, DocMeDown recursively builds the parent site and then independently compiles each nested site with its own manifest, prerendered static pages, and `.dist/` offline artifact.
4. **Ideal for**:
   - Monorepos with multiple packages.
   - Versioned documentation (e.g. `docs/v1/`, `docs/v2/`).
   - Micro-documentation embedded in larger product portals.

---

## 🚀 Recreate These Examples in Your Project

To try one of these setups in your own repository:

<Tabs type="postit">
  <Tab label="1. Terminal API Docs">
```bash
npx docmedown init ./api-docs
# Edit docs.json -> set "theme": { "family": "terminal", "density": "compact" }
npx docmedown serve ./api-docs
```
  </Tab>
  <Tab label="2. Remote GitHub Portal">
```bash
mkdir my-github-docs && cd my-github-docs
echo '{"name":"Remote Docs","source":{"type":"github","repo":"your-org/your-repo","branch":"main"}}' > docs.json
npx docmedown serve .
```
  </Tab>
  <Tab label="3. Single-File Distributable">
```bash
npx docmedown build ./docs -o ./dist
# Distribute ./dist/index.html directly!
```
  </Tab>
</Tabs>

---

## 🗺️ Next Steps

You've explored the full documentation journey! Return to the overview or dive back into authoring:

<CardGrid cols={2}>
  <Card
    title="Overview & Philosophy"
    description="Review the four pillars, engine architecture, and feature comparison."
    href="#/README"
    badge="Home"
    badgeType="info"
  />
  <Card
    title="Component Showcase"
    description="Explore live interactive previews and code snippets for all built-in elements."
    href="#/showcase"
    badge="Previous"
    badgeType="success"
  />
</CardGrid>