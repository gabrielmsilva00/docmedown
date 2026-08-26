---
title: Getting Started
description: Quick installation and configuration guide for DocMeDown.
order: 2
tags: [setup, cli, quickstart]
---

# Install Orbit Notes

This site is intentionally nested under another documentation root. Build or serve this directory directly to keep its configuration and components isolated.

---

## 1. Build this nested site

You can initialize a brand new documentation site with a single command:

```bash
npx docmedown build ./docs/examples/local-docs
```

This creates this site's `_manifest.json`, `_docs.js`, runtime, and `.dist/index.html` without mixing its pages into the parent documentation index.

---

## 2. Serve this nested site

Run the nested site on its own preview server:

```bash
npx docmedown serve ./docs/examples/local-docs
```

---

## 3. Open the offline version

After a build, open `.dist/index.html` directly from the file system. It contains this site's pages and configuration only.

```bash
./docs/examples/local-docs/.dist/index.html
```

The parent site can link here, but it cannot replace this site’s config or component registry.
