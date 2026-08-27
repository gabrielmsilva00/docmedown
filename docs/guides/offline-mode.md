---
title: Offline & Single-File Mode
description: Learn how to generate 100% self-contained offline documentation bundles.
order: 3
tags: [offline, single-file, file-protocol, standalone]
---

# Offline & Single-File Bundles 📦

DocMeDown is engineered to work anywhere — including air-gapped environments, secure internal networks, embedded device manuals, and local offline filesystems.

---

## 💻 The Problem with Traditional Doc Generators

Most modern documentation engines (Docusaurus, VitePress, etc.) produce hundreds of separate HTML and JS files with relative chunk loaders. Opening these via `file:///` causes browser CORS errors because browsers restrict `fetch()` requests on local file systems.

---

## ⚡ The DocMeDown Single-File Solution

DocMeDown can bundle your entire documentation website, complete with all Markdown documents, configuration, styles, and interactive React runtime into **a single `index.html` file**:

```bash
npx docmedown build ./docs
```

### What Happens During Build:
1. **Manifest Inlining**: Scans all `.md` files and extracts headings and metadata.
2. **Document Inlining**: Encodes the manifest and Markdown corpus into a parser-safe payload that initializes the offline runtime without network requests.
3. **Component Bundling**: Bundles `.dmd/components.js` and its relative JavaScript imports before inlining, so custom components remain available from a `file:///` URL.
4. **Runtime Inlining**: Embeds the full standalone React SPA runtime, Mermaid renderer, and CSS directly into the HTML file.

Mermaid support makes the runtime larger because every diagram renderer is kept inside the artifact. This is intentional: no chart, component, font, or syntax-rendering behavior depends on a network request when the bundle is opened from `file:///`.

---

## 🚀 How to Use Single-File Docs

Once built, simply **double-click `index.html`**:
- Opens seamlessly in any modern browser via `file:///C:/.../index.html`.
- Full navigation, built-in and custom React components, Mermaid diagrams, dark/light theme switching, typography, and instant search work **100% offline without a web server**.
- Serveable and `.dist/index.html` output use the same local font stacks, so they do not depend on Google Fonts or another network font provider.
- Ideal for:
  - Software release attachments (`.zip` / `.tar.gz`)
  - Embedded hardware device user manuals
  - Internal defense or air-gapped enterprise environments
  - Portable documentation on USB flash drives

## Nested sites

Each directory with its own `docs.json` is built as an independent site. A parent build does not merge its Markdown into the parent search index; instead, it generates that nested site's own `index.html` and `.dist/index.html`.
