---
title: Getting Started
description: Quick installation and setup guide for DocMeDown.
order: 2
tags: [getting-started, quickstart, setup]
---

# Getting Started with DocMeDown

DocMeDown can be used in two complementary ways:
1. **As a CLI Tool** (to scaffold, configure, serve, and build your docs).
2. **As a Standalone Web Script** (just an `index.html` file importing our bundle).

---

## ⚡ Method 1: The Single-Line CLI Kickstart

The fastest way to start is using `npx`:

```bash
# Scaffold a new documentation directory and start preview immediately
npx docmedown ./docs
```

This single command:
1. Creates `index.html`, `docs.json`, and starter Markdown files (`README.md`, `getting-started.md`, `guides/`).
2. Creates the `.dmd/` custom React component folder.
3. Automatically launches the local dev server on `http://localhost:3000` with **hot live-reloading**!

---

## 🌐 Method 2: Pure Web Script (No CLI or Node.js Required)

If you already have a folder with Markdown files, you only need to create a single `index.html` file:

```html title="index.html"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Documentation</title>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="dmd-app"></div>
  
  <!-- DocMeDown Web Script Runtime -->
  <script src="https://cdn.jsdelivr.net/npm/docmedown@latest/dist/docmedown.iife.js"></script>
</body>
</html>
```

Open this directory with any web server (or double-click offline), and your documentation is immediately interactive!

---

## 📁 Recommended Folder Structure

```
my-project/
├── docs/
│   ├── index.html               # Entrypoint importing DocMeDown
│   ├── docs.json                # Optional configuration
│   ├── README.md                # Main overview page (#/README)
│   ├── installation.md          # Guide (#/installation)
│   ├── api/
│   │   ├── authentication.md    # Nested route (#/api/authentication)
│   │   └── endpoints.md         # Nested route (#/api/endpoints)
│   └── .dmd/
│       └── components.js        # Browser-loadable global React components
```

> [!NOTE]
> Subdirectories like `api/` automatically become **collapsible category sections** in the sidebar navigation!

---

## 🚀 Serving and Previewing

To start the local development server with file watching and auto-reloading:

```bash
npx docmedown serve ./docs
```

Or simply:

```bash
npx docmedown dev
```

Any changes made to `.md` files, `docs.json`, or `.dmd/components.js` will trigger an instant live refresh in your browser.

Before serving, DocMeDown builds the live documentation assets and `./docs/.dist/index.html`. While the server runs, source changes rebuild both outputs before the preview reloads, so the offline file is always ready to distribute.

---

## 🚢 Deployment

Since DocMeDown runs as a client-side React SPA, deploying your documentation is as simple as hosting static files:

- **GitHub Pages**: Push your `./docs` folder to the `gh-pages` branch or configure GitHub Pages to serve `/docs`.
- **Vercel / Netlify / Cloudflare Pages**: Point the build output to `./docs` (no build command needed).
- **Amazon S3 / Google Cloud Storage**: Copy your folder to an S3 bucket configured for static website hosting.

---

## Next Steps

- Explore the [CLI Command Reference](./guides/cli-reference.md).
- Learn how to document a [Remote GitHub Repository](./guides/remote-github.md) dynamically.
- Check out the [Configuration Reference](./configuration.md) to customize themes and navigation.
