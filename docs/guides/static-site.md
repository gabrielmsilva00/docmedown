---
title: Static Site, SEO & AI Context
description: Prerendered static pages, automated SEO head tags, sitemap.xml, llms.txt, SKILL.md, and AI-native documentation distribution.
order: 2
tags: [static, seo, sitemap, robots, llms, ai, mcp, agents, distribution]
---

# Static Site, SEO & AI-Native Context 🌐🤖

DocMeDown is built for both human readers and AI agents.

Every `docmedown build` command produces **two parallel outputs from a single Markdown source**:
1. The **reactive Svelte 5 runtime** for interactive web visitors (hot reload, fuzzy search, theme switching).
2. A **fully prerendered static site** with SEO head tags, sitemaps, and machine-readable AI context files (`llms.txt`, `SKILL.md`).

---

## ⚡ Prerendered Static HTML Pages

When you run `npx docmedown build ./docs`, DocMeDown prerenders every Markdown document into an HTML file:

```
docs/
├── index.html                   # Prerendered home page (from README.md)
├── getting-started/
│   └── index.html               # Prerendered /getting-started/
├── guides/
│   ├── cli-reference/
│   │   └── index.html           # Prerendered /guides/cli-reference/
│   └── custom-components/
│       └── index.html           # Prerendered /guides/custom-components/
├── 404.html                     # Custom 404 error page
├── sitemap.xml                  # Automated XML sitemap
└── robots.txt                   # Search crawler directives
```

### Key Advantages:
- **Instant First Contentful Paint (FCP)**: Visitors see the complete article text, callouts, and syntax-highlighted code blocks before JavaScript even loads.
- **Search Engine Optimization (SEO)**: Googlebot, Bing, and web scrapers crawl complete semantic HTML with zero client-side JavaScript execution requirements.
- **PushState Hydration**: When the runtime script initializes, it automatically hydrates the DOM and handles subsequent page transitions via smooth browser history API (`pushState`) instead of hash reloads.

---

## 🔍 Automated SEO Metadata & Social Cards

DocMeDown generates complete `<head>` metadata for every page based on its YAML frontmatter and `docs.json`:

```html
<!-- Automatically Generated in Every Prerendered Page -->
<title>CLI Command Reference — DocMeDown</title>
<meta name="description" content="Complete guide to DocMeDown CLI commands..." />
<link rel="canonical" href="https://example.com/guides/cli-reference/" />

<!-- Open Graph / Facebook -->
<meta property="og:type" content="article" />
<meta property="og:title" content="CLI Command Reference — DocMeDown" />
<meta property="og:description" content="Complete guide to DocMeDown CLI commands..." />
<meta property="og:url" content="https://example.com/guides/cli-reference/" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="CLI Command Reference — DocMeDown" />

<!-- JSON-LD Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "CLI Command Reference",
  "description": "Complete guide to DocMeDown CLI commands..."
}
</script>
```

### Enabling Sitemap & Robots Generation:
Add your site's canonical domain to `docs.json`:

```json title="docs.json"
{
  "name": "My Project Docs",
  "url": "https://my-docs-domain.com"
}
```

DocMeDown automatically generates:
- `sitemap.xml` with document URLs and available last-modified timestamps.
- `robots.txt` pointing to your `sitemap.xml`.
- Excludes any document with `noindex: true` in its frontmatter.

### Canonical URL parity

Set `url` to the deployed site root, including any project subpath, such as
`https://docs.example.com/project`. Static canonical/social metadata, sitemap
entries, AI context links, and MCP `resolve_url` share document URL generation.

| Logical slug | Public URL with this deployment root |
| :--- | :--- |
| `README` | `https://docs.example.com/project/` |
| `guides/start` | `https://docs.example.com/project/guides/start/` |
| `README.fr` | `https://docs.example.com/project/README.fr/` |
| `guides/café` | `https://docs.example.com/project/guides/caf%C3%A9/` |

Trailing slashes on the configured root are normalized; document URLs end in `/`.
Slugs are logical names, not pre-encoded URLs: each path segment is encoded once,
so spaces, `%`, `#`, and `?` cannot become URL syntax. Localized slugs retain their
own routes; only the exact `README` slug maps to the site root.

Without `url`, AI links and MCP resolution use root-relative paths such as
`/guides/start/`. Absolute canonical metadata, sitemap, and robots output are
omitted. This does not change the interactive reader's hash-based navigation.

### Discovery flags are not access controls

The following table describes automatic discovery for boolean frontmatter flags:

| Output | Ordinary page | `hidden: true` | `noindex: true` |
| :--- | :--- | :--- | :--- |
| Automatic sidebar | Included | Excluded | Included |
| Browser search and sitemap | Included | Excluded | Excluded |
| Static robots metadata | Indexable | `noindex, nofollow` | `noindex, nofollow` |
| AI exports (`llms.txt`, full context, skill, JSON bundle) | Included | Excluded | Included |
| MCP search | Included | Excluded | Included |

An explicitly configured manual sidebar is preserved as authored. Neither flag removes
the page from generated HTML, the embedded/offline corpus, MCP `list_docs`, or direct
MCP `read_doc` access. `noindex` does **not** opt a page out of AI exports. These are
discovery preferences, not authentication or confidentiality controls: do not place
private material in a publicly distributed documentation corpus.

---

## 🤖 AI Context Distribution (`llms.txt`, `SKILL.md`)

Modern developers increasingly consume documentation through AI coding assistants (Cursor, Claude, Copilot, ChatGPT). DocMeDown automatically formats your documentation for AI ingestion on every build:

| AI Asset | Target Audience | Content & Purpose |
| :--- | :--- | :--- |
| **`llms.txt`** | LLMs / Web Crawlers | Adheres to the [llmstxt.org](https://llmstxt.org) standard: concise index of every page with titles, links, and summaries. |
| **`llms-full.txt`** | AI Context Stuffing | The entire documentation corpus compiled into a single clean Markdown file for pasting into chat contexts. |
| **`SKILL.md`** | Agentic Assistants | Antigravity / Claude Agent skill definition enabling AI coding agents to discover and use the docs natively. |
| **`okf.json`** | Machine Indexing | Open Knowledge Format JSON bundle containing structured headings, raw plain text, and metadata. |

---

## 🛠️ Build Customization Flags

```bash
# Standard production build (creates static pages, SEO, AI context, and offline bundle):
npx docmedown build ./docs

# Skip static page prerendering (serveable assets only):
npx docmedown build ./docs --no-static

# Skip single-file offline bundle:
npx docmedown build ./docs --no-single-file
```

> [!NOTE]
> **Custom Shell Protection**: If you maintain a customized `index.html` shell with custom scripts or analytics, DocMeDown detects this and will **never overwrite your custom shell** during builds.

---

## 🗺️ Next Steps

Continue along the linear documentation journey:

<CardGrid cols={2}>
  <Card
    title="100% Offline Single-File Bundles"
    description="Air-gapped self-extracting single-file HTML bundles with zero CORS errors."
    href="#/guides/offline-mode"
    badge="Next Up"
    badgeType="info"
  />
  <Card
    title="Next-Gen DX & Editor"
    description="True in-place HMR, split-view in-browser editor (Ctrl+E), and staged previews."
    href="#/guides/developer-experience"
    badge="Previous"
    badgeType="success"
  />
</CardGrid>

