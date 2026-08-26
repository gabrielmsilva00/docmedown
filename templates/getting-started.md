---
title: Getting Started
description: Quick installation and configuration guide for DocMeDown.
order: 2
tags: [setup, cli, quickstart]
---

# Getting Started with DocMeDown

Learn how to initialize, configure, and serve your documentation in less than 30 seconds.

---

## 1. Quick Start via CLI

You can initialize a brand new documentation site with a single command:

```bash
npx docmedown ./docs
```

This scaffolds your documentation directory, creates starter Markdown guides, and starts a live preview server!

---

## 2. Interactive Configuration TUI

Need to customize your site title, theme palette, or configure a remote GitHub repository? Launch the interactive TUI configuration wizard:

```bash
npx docmedown config
```

---

## 3. Remote GitHub Repository Mode

You can document any public (or private) GitHub repository dynamically without hosting any markdown files! Simply configure `docs.json`:

```json title="docs.json"
{
  "name": "Dynamic GitHub Docs",
  "source": {
    "type": "github",
    "repo": "facebook/react",
    "branch": "main",
    "docsDir": "docs"
  }
}
```

Every push to your GitHub repo is immediately reflected on your documentation website live without rebuilds!

---

## 4. Single-File Offline Bundling

To generate a 100% self-contained single-file HTML documentation bundle that works offline via `file:///`:

```bash
npx docmedown build ./docs
```

The standalone artifact is written to `./docs/.dist/index.html`. You can send it by email, save it to USB drives, or distribute it inside air-gapped systems.
