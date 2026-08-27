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
2. **Compact Serialization**: Serializes the manifest and Markdown corpus as compact JSON instead of development-formatted output.
3. **Component Bundling**: Bundles `.dmd/components.js` and its relative JavaScript imports before inlining, so custom components remain available from a `file:///` URL.
4. **Gzip Compression**: Compresses the complete corpus, custom-component module, production React runtime, Mermaid renderer, and CSS into one base64-encoded gzip envelope.
5. **Minified Self-Extractor**: Adds a small inline bootstrap that uses the browser's native `DecompressionStream` to restore and start DocMeDown locally.

Mermaid support still accounts for most of the uncompressed runtime because every diagram renderer is available offline. Gzip removes most of that repetition while retaining the no-network guarantee: no chart, component, font, or syntax-rendering behavior depends on a request when the bundle is opened from `file:///`.

---

## 🚀 How to Use Single-File Docs

Once built, simply **double-click `index.html`**:
- Opens seamlessly in any modern browser via `file:///C:/.../index.html`.
- Full navigation, built-in and custom React components, interactive Mermaid viewers, all four theme families, light/dark/automatic modes, reading density, typography, and instant search work **100% offline without a web server**.
- Serveable and `.dist/index.html` output use the same local font stacks, so they do not depend on Google Fonts or another network font provider.
- Ideal for:
  - Software release attachments (`.zip` / `.tar.gz`)
  - Embedded hardware device user manuals
  - Internal defense or air-gapped enterprise environments
  - Portable documentation on USB flash drives

## Download from the serveable site

Every built serveable site includes a **Download** button in the navbar. Selecting it:

1. Reads `window.__DOCMEDOWN_DATA__`, which is the documentation corpus already loaded by the current page.
2. Reads the current `docmedown.iife.js` runtime identified by `data-docmedown-runtime`.
3. Serializes and gzip-compresses both locally in the browser.
4. Downloads `<documentation-name>-offline.html` directly.

The action does **not** fetch or proxy `.dist/index.html`. A downloaded file marks itself as an offline copy before DocMeDown starts; its navbar shows a greyed-out **Offline copy** control with an explanation that no second download is needed.

Browser-side export requires native `CompressionStream("gzip")` support. Opening an offline copy requires `DecompressionStream("gzip")`; current Chromium, Firefox, and Safari releases provide these stream APIs.

## Nested sites

Each directory with its own `docs.json` is built as an independent site. A parent build does not merge its Markdown into the parent search index; instead, it generates that nested site's own `index.html` and `.dist/index.html`.
