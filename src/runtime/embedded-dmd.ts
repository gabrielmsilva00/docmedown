import { DMD_TRANSLATIONS } from "./embedded-dmd-locales";
import {
  BUILTIN_LOCALES,
  canonicalLocale,
  defaultLocale,
  documentVariant,
  localizedSlug,
  projectLocales,
} from "./i18n";
import type { DocConfig } from "./types";

/**
 * Default embedded documentation for DocMeDown (DMD).
 *
 * Included by default in _docs.js and offline bundles.
 * Accessible exclusively through the documentation footer ("Documented with DocMeDown ⚡").
 */

export const DMD_NAV_GUIDE_MARKDOWN = `---
title: DocMeDown Navigation Guide
description: Quick reference on how to explore, search, and navigate documentation sites generated with DocMeDown.
hidden: true
noindex: true
---

# Navigating DocMeDown Documentation

Welcome to documentation generated with **DocMeDown**! This guide summarizes the navigation features, keyboard shortcuts, and interactive tools available throughout this site.

> [!TIP]
> Are you looking to document your own project? Check out the **[DocMeDown for Developers](DMD/for-developers)** subpage for a complete kickstart and configuration guide.

---

## 🔍 Fast Full-Text Search

Press <kbd>Ctrl</kbd> + <kbd>K</kbd> (or <kbd>Cmd</kbd> + <kbd>K</kbd> on macOS) anywhere on the page to open the **Search Modal**.

- **Fuzzy Matching**: Type keywords to search across page titles, section headings, tags, and document content.
- **Keyboard Navigation**: Use <kbd>↑</kbd> and <kbd>↓</kbd> to cycle through matching results, and <kbd>Enter</kbd> to navigate directly to the selected page or section.
- **Instant Filtering**: Hit <kbd>Esc</kbd> anytime to dismiss the search dialog.

---

## 🧭 Sidebar & Mobile Drawer

The left sidebar gives you an organized overview of the entire documentation hierarchy.

- **Hierarchical Categories**: Folders and categories can be expanded or collapsed to focus on what you need.
- **Active Page Indicator**: The current document is highlighted so you never lose your context.
- **Mobile Touch Gestures**: On mobile devices and tablets:
  - **Open**: Swipe right from the left screen edge (< 30px) or tap the hamburger menu.
  - **Close**: Swipe left anywhere on the drawer, tap the backdrop, or press <kbd>Esc</kbd>.

---

## 📑 On This Page (Table of Contents)

On desktop screens, the right rail displays a sticky **Table of Contents** corresponding to the headings in the current article.

- **Active Heading Tracking**: As you scroll through the article, the table of contents automatically highlights the current section.
- **Smooth Anchor Scrolling**: Clicking any heading smoothly animates the view directly to that section.
- **Target Highlighting**: Targeted headings briefly flash an accent highlight so you immediately spot the anchor destination.

---

## 🍞 Interactive Breadcrumbs

The breadcrumb trail at the top of each page displays your exact location within the documentation tree.

- **Hover Dropdowns**: Hover over any breadcrumb segment to reveal a dropdown menu listing sibling documents and sections.
- **Fast Traversal**: Jump across parallel guides or back to parent sections with a single click.

---

## 📊 Reading Progress & Time Estimations

- **Progress Bar**: A discreet progress bar at the very top of the content area tracks how far you have read through the active document.
- **Reading Time Badge**: Every article includes an estimated reading time badge calculated from the content word count.
- **Tag Exploration**: Documents can define topic tags. Clicking any tag chip opens the **Tag Modal** to discover all related pages sharing that tag.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> | Open / Close Search Modal |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>E</kbd> | Toggle 2-Way Markdown Editor (in preview / local sessions) |
| <kbd>Esc</kbd> | Close active modal, dropdown, or mobile sidebar |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Accessible keyboard focus navigation |

---

## 📋 Code Blocks & Multi-Format Tables

DocMeDown enhances standard Markdown elements with interactive developer utilities:

### Code Blocks
- Click the **Copy** button on the top-right corner of any code block to copy the full snippet to your clipboard.
- Select specific lines with your mouse to copy only the highlighted lines.

### Tables
- Every table includes a responsive header toolbar.
- Click the **Copy table** menu to export table data in your preferred format:
  - **Markdown**: Formatted GitHub-flavored markdown table.
  - **CSV**: Comma-separated values ready for spreadsheets.
  - **TSV**: Tab-separated values for database and terminal workflows.

---

## 🌙 Dark & Light Themes

Use the theme toggle in the top navigation bar to switch between:
- **Light Mode**: Crisp, high-contrast readability for bright environments.
- **Dark Mode**: Sleek, eye-friendly palette designed for prolonged reading.
- **System Sync**: Automatically matches your operating system preference.

---

## 🚀 For Developers

Want to create documentation like this for your own codebase, API, or project?

👉 **[Read the DocMeDown for Developers Guide](DMD/for-developers)** to learn how to kickstart and configure DocMeDown in seconds!
`;

export const DMD_FOR_DEVELOPERS_MARKDOWN = `---
title: DocMeDown for Developers
description: Complete guide on kickstarting, configuring, and deploying documentation with DocMeDown.
hidden: true
noindex: true
---

# DocMeDown for Developers

[← Back to Navigation Guide](DMD)

**DocMeDown** is a lightweight, zero-config Markdown documentation engine and static-site compiler. It turns a folder of Markdown files into a high-performance, searchable documentation site with built-in dark mode, custom component support, and offline capability.

---

## ⚡ Quickstart

You can start using DocMeDown immediately without installing anything globally.

### 1. Instant Live Preview (Zero-Config)
If you already have a \`docs/\` directory or a \`README.md\` in your repository:

\`\`\`bash
npx docmedown serve ./docs
\`\`\`

DocMeDown will automatically index your markdown files, start a live development server with Hot Module Replacement (HMR), and open your browser.

### 2. Scaffold a New Project
To create a clean, organized documentation workspace with interactive templates:

\`\`\`bash
npx docmedown init ./docs
\`\`\`

The interactive wizard sets up:
- Standard project structure with sample guides
- \`docs.json\` configuration
- Pre-configured GitHub Pages deployment workflow
- Sample custom component in \`.dmd/\`

---

## 📁 Recommended Project Structure

\`\`\`text
my-project/
├── docs/
│   ├── docs.json               # Optional site configuration
│   ├── README.md               # Home page / site overview
│   ├── getting-started.md      # Top-level article
│   ├── guides/                 # Categorized sub-pages
│   │   ├── installation.md
│   │   └── configuration.md
│   └── .dmd/                   # Custom Svelte / TSX interactive components
│       └── CustomWidget.svelte
└── package.json
\`\`\`

> [!NOTE]
> If your project root has a \`README.md\`, DocMeDown automatically unifies root markdown files with your \`./docs/\` folder by default.

---

## ⚙️ Configuration (\`docs.json\`)

Create a \`docs.json\` file in your documentation directory to customize appearance, navigation, and features:

\`\`\`json
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "My Project Docs",
  "description": "Comprehensive developer guide and API documentation.",
  "tagline": "Build faster with DocMeDown",
  "version": "1.0.0",
  "url": "https://my-org.github.io/my-project",
  "theme": {
    "family": "atlas",
    "density": "comfortable",
    "defaultMode": "auto",
    "accentColor": "#6366f1",
    "accentColorDark": "#818cf8"
  },
  "search": {
    "enabled": true,
    "placeholder": "Search docs (Ctrl+K)..."
  },
  "footer": {
    "copyright": "© 2026 My Organization. All rights reserved.",
    "showBuiltWith": true
  }
}
\`\`\`

### Key Configuration Options:
- **\`name\` / \`tagline\` / \`version\`**: Displayed in the navbar and header splash.
- **\`theme.family\`**: Choose between curated design systems (\`"atlas"\`, \`"blueprint"\`, \`"terminal"\`, \`"editorial"\`, \`"botanical"\`, \`"studio"\`).
- **\`theme.accentColor\`**: Brand primary color in hex, HSL, or CSS format.
- **\`footer.showBuiltWith\`**: Defaults to \`true\`. Displays the *Documented with DocMeDown* link that leads to the navigation guide.
- **\`url\`**: Setting your production URL automatically generates valid \`sitemap.xml\` and \`robots.txt\` files.

---

## 🛠️ CLI Commands Reference

| Command | Description |
| :--- | :--- |
| \`docmedown serve [dir]\` | Start live development server with in-browser 2-way editor (<kbd>Ctrl</kbd>+<kbd>E</kbd>) and HMR |
| \`docmedown build [dir]\` | Compile static site prerenders, \`_docs.js\`, single-file offline bundle, and AI context |
| \`docmedown init [dir]\` | Interactive setup questionnaire to scaffold documentation |
| \`docmedown doctor [dir]\` | Diagnose project health, check links, and inspect configuration |
| \`docmedown validate [dir]\` | Validate Markdown syntax, internal anchors, and \`docs.json\` schema |
| \`docmedown mcp [dir]\` | Start a Model Context Protocol (MCP) server for instant AI assistant integration |

---

## 🧩 Interactive Components (\`.dmd/\`)

You can embed rich interactive components directly into your Markdown files.

### Built-in Components
DocMeDown includes built-in components ready to use in any document:

\`\`\`markdown
<Card title="Quick Tip" description="Use cards to highlight key information.">
  Cards automatically adapt to dark and light modes!
</Card>
\`\`\`

### Custom Svelte & TSX Components
Place \`.svelte\` or \`.tsx\` files in the \`.dmd/\` directory inside your documentation root. They are compiled ahead-of-time and available as custom tags in your Markdown:

\`\`\`html
<MyCustomWidget initialCount="5" />
\`\`\`

---

## 🚢 Production Deployment

### GitHub Pages (Recommended)
Add a workflow file at \`.github/workflows/pages.yml\`:

\`\`\`yaml
name: Deploy Documentation
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx docmedown build ./docs
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./docs
      - uses: actions/deploy-pages@v4
\`\`\`

### Standalone Offline Bundle
Every \`docmedown build\` generates a single self-contained HTML file at \`.dist/index.html\`:
- Completely offline and zero-dependency
- Embeds compressed documentation, media, and runtime
- Double-clickable directly from USB drives or air-gapped systems

---

## 🤖 AI-Native Documentation

DocMeDown automatically emits LLM-friendly context files during build:
- **\`llms.txt\`**: Concise summary of all pages for AI models.
- **\`llms-full.txt\`**: Complete consolidated corpus for full repository context.
- **\`SKILL.md\`**: Ready-to-use skill file for agentic AI tools.
- **Built-in MCP Server**: Run \`npx docmedown mcp ./docs\` to give Claude, Cursor, and AI agents instant search and retrieval tools over your documentation!
`;

const ENGLISH_EMBEDDED_DOCS: Record<string, string> = {
  DMD: DMD_NAV_GUIDE_MARKDOWN,
  "DMD.md": DMD_NAV_GUIDE_MARKDOWN,
  "DMD/for-developers": DMD_FOR_DEVELOPERS_MARKDOWN,
  "DMD/for-developers.md": DMD_FOR_DEVELOPERS_MARKDOWN,
};

const dmdConfig = {
  i18n: { defaultLocale: "en", locales: [...BUILTIN_LOCALES], fallbackToDefault: true, showUntranslated: false },
};

export function embeddedDmdVariant(slug: string, config?: DocConfig | null) {
  const effective = {
    i18n: {
      ...dmdConfig.i18n,
      locales: [...BUILTIN_LOCALES, ...projectLocales(config)].filter(
        (item, index, all) => all.findIndex((entry) => entry.code === item.code) === index,
      ),
    },
  };
  const variant = documentVariant(slug, effective);
  if (variant.docId !== "DMD" && variant.docId !== "DMD/for-developers") return undefined;
  const requested = variant.explicit ? variant.locale : defaultLocale(config);
  const locale = DMD_TRANSLATIONS[requested] ? requested : "en";
  return {
    ...variant,
    locale,
    slug: localizedSlug(variant.docId, requested, effective),
    path: `${variant.docId}.${locale.toLowerCase()}.md`,
  };
}

export function getEmbeddedDmdDoc(slug: string, locale?: string): string | undefined {
  let clean = slug.replace(/^\.?\//, "").replace(/\.(md|mdx|html)$/i, "");
  const suffix = clean.match(/\.([^./]+)$/)?.[1];
  if (suffix) {
    try {
      locale = canonicalLocale(suffix);
      clean = clean.slice(0, -(suffix.length + 1));
    } catch {
      return undefined;
    }
  }
  if (clean !== "DMD" && clean !== "DMD/for-developers") return undefined;
  let code = "en";
  try {
    code = canonicalLocale(locale ?? "en");
  } catch {
    return undefined;
  }
  const translated = DMD_TRANSLATIONS[code];
  if (!translated) return ENGLISH_EMBEDDED_DOCS[clean];
  const body = clean === "DMD" ? translated.navigation : translated.developers;
  const title = body.split("\n")[0].replace(/^# /, "");
  return `---\ntitle: ${JSON.stringify(title)}\nhidden: true\nnoindex: true\n---\n\n${body.replace(/\]\(DMD(?=[/)])/g, "](/DMD")}`;
}

/** Includes only project languages plus unconditional English fallback. Never creates fake translated content. */
export function embeddedDmdDocs(config?: DocConfig): Record<string, string> {
  const docs: Record<string, string> = {};
  const locales = config ? projectLocales(config) : BUILTIN_LOCALES;
  for (const id of ["DMD", "DMD/for-developers"]) {
    docs[id] = getEmbeddedDmdDoc(id, defaultLocale(config))!;
    docs[`${id}.md`] = docs[id];
    for (const { code } of [{ code: "en" }, ...locales]) {
      const key = `${id}.${code.toLowerCase()}`;
      docs[key] = getEmbeddedDmdDoc(id, code)!;
      docs[`${key}.md`] = docs[key];
    }
  }
  return docs;
}

export const DEFAULT_EMBEDDED_DOCS = embeddedDmdDocs();
