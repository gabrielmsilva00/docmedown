---
title: Offline & Single-File Mode
description: Build 100% self-contained, air-gapped single-file HTML documentation bundles that open directly via file:/// without a server.
order: 3
tags: [offline, single-file, air-gapped, file-protocol, standalone, distribution]
---

# Offline & Single-File Bundles 📦

DocMeDown is engineered to run anywhere — including air-gapped secure networks, embedded hardware device manuals, defense environments, field laptops, and local filesystems.

---

## 💻 The Problem with Traditional Doc Generators

Most modern static documentation generators (Docusaurus, VitePress, MkDocs, etc.) produce hundreds of separate HTML, JavaScript chunk files, and CSS stylesheets.

When you attempt to double-click and open these generated files directly from Windows File Explorer or macOS Finder via `file:///C:/my-docs/index.html`:
- The browser triggers **CORS and cross-origin security errors**.
- Browsers explicitly block JavaScript `fetch()` calls to neighboring local files on `file:///` URLs.
- The documentation appears as a broken, blank page with missing styles and unrendered navigation.

---

## ⚡ The DocMeDown Single-File Solution

DocMeDown bundles your entire documentation website — including all Markdown documents, configuration, styles, diagrams, custom components, and Svelte 5 runtime — into **one standalone, self-extracting `index.html` file**:

```bash
npx docmedown build ./docs
```

### The Build Pipeline:
1. **Corpus Extraction**: Crawls all Markdown documents, extracts headings, and indexes content for fuzzy search.
2. **Component Compilation**: Discovers `.dmd/*.{svelte,tsx,ts}` components and precompiles them Ahead-of-Time into self-contained custom elements.
3. **Lossless Media Embedding**: Scans all `<Media>` tags and standard Markdown images, converting raster images, vector SVGs, audio, and video losslessly into self-contained Base64 Data URIs.
4. **Gzip Envelope Serialization**: Compresses the entire documentation corpus, runtime, embedded media, and assets into a compact, base64-encoded gzip payload.
5. **Self-Extracting Bootstrap**: Inlines a tiny bootstrap script using the browser's native `DecompressionStream` to restore and initialize DocMeDown locally in milliseconds.

```
┌─────────────────────────────────────────────────────────────┐
│  standalone index.html (~1.2 MB Gzip)                       │
│  ├─ Self-Extracting DecompressionStream Bootstrap          │
│  ├─ Production Svelte 5 Runtime & Router                    │
│  ├─ Theme Tokens (Atlas, Blueprint, Terminal, Editorial)   │
│  ├─ Offline Mermaid Diagram Engine                         │
│  ├─ Compiled .dmd Custom Components                         │
│  ├─ Losslessly Embedded Media (Images, SVGs, Audio, Video)  │
│  └─ Base64 Gzip Compressed Markdown Corpus & Search Index   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Distribute & Use Single-File Docs

Once compiled, simply distribute `docs/.dmd/.singlefile/index.html` directly (the `docs/index.html` symlink targets the serveable SEO site, not this file):

### 1. The Double-Click Guarantee
- Double-click `index.html` directly from Windows Explorer, macOS Finder, or Linux file managers.
- Opens seamlessly in any modern browser via `file:///.../index.html`.
- **Zero web server required**: Instant search (<Kbd>⌘K</Kbd>), full navigation, interactive Mermaid diagrams, and theme toggles work **100% offline**.

### 2. Primary Use Cases
- **Software Release Attachments**: Attach `my-project-docs.html` directly to GitHub or GitLab releases so users can download and read the manual offline.
- **Embedded Hardware Appliances**: Store on local device memory (routers, NAS units, medical hardware) accessible without an internet connection.
- **Defense & Air-Gapped Intranets**: Deploy in secure environments where outward internet access is strictly prohibited.
- **Field Engineering Manuals**: Distribute on USB thumb drives for off-grid operations.

---

## 📥 In-Browser Offline Export

Every built DocMeDown documentation site includes an automatic **Download** option in the navbar.

When a visitor clicks **Download Offline Copy**:
1. The browser reads the active documentation corpus (`window.__DOCMEDOWN_DATA__`).
2. Compresses the data client-side using `CompressionStream("gzip")`.
3. Downloads a self-contained `<doc-name>-offline.html` file directly to the user's computer.

> [!NOTE]
> The downloaded copy marks itself as an offline artifact; opening it shows an "Offline Copy" indicator in the navbar and disables duplicate download actions.

---

## 🖼️ Media Embedding & Offline Asset Self-Containment

In conventional documentation systems, linked images (`![alt](./image.png)`), audio files, and videos fail to display when an offline HTML file is double-clicked due to browser security restrictions on the `file:///` protocol.

DocMeDown solves this by integrating **lossless offline embedding**:
- **Lossless Fidelity**: Every referenced asset (raster images, vector SVGs, audio clips, and video files) is converted into Base64 Data URIs without re-encoding or lossy compression, preserving byte-for-byte fidelity.
- **Fine-Grained Embedding Control**: The `<Media>` component gives authors explicit control over how embedding is handled:
  - `embed="base64"` *(default)*: embeds the exact file contents as a Base64 Data URI into the standalone bundle.
  - `embed="inline"`: decodes vector SVGs directly into inline `<svg>` elements inside the DOM for theme-adaptive CSS styling.
  - `embed="none"` or `embed={false}`: opts out of embedding, preserving external streaming URLs or live remote endpoints.
- **Fallback Recovery**: If a particular video codec or format is not natively supported by a reader's browser, `<Media fallback="...">` ensures alternative sources or user-facing fallback cards display gracefully.

---

## ⚙️ Configuration Options

In `docs.json`, you can customize offline bundle behavior:

```json title="docs.json"
{
  "name": "Air-Gapped Reference",
  "offline": {
    "embedNestedDocs": true
  }
}
```

- `offline.embedNestedDocs`: If `true` (default), nested documentation sites (directories with their own `docs.json`) are inlined directly into the single-file bundle so sub-sites can be navigated without external file links. Set to `false` if you wish to minimize file size.

### CLI Build Flags:
```bash
# Output offline bundle to custom directory:
npx docmedown build ./docs --out-dir ./dist

# Skip single-file bundle (build static server assets only):
npx docmedown build ./docs --no-single-file
```

---

## 🗺️ Next Steps

Continue along the linear documentation journey:

<CardGrid cols={2}>
  <Card
    title="Dynamic Remote Git"
    description="Stream live documentation directly from GitHub or GitLab without build steps."
    href="#/guides/remote-github"
    badge="Next Up"
    badgeType="info"
  />
  <Card
    title="Static Site (SSG) & SEO"
    description="Learn how static pages are prerendered with full SEO tags and social cards."
    href="#/guides/static-site"
    badge="Previous"
    badgeType="success"
  />
</CardGrid>

