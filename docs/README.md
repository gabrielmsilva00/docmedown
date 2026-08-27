---
title: Welcome to DocMeDown
description: The simplest MarkDown documenter yet. Dual CLI Tool & Web Script React SPA.
order: 1
tags: [overview, philosophy, features]
---

# Welcome to DocMeDown ⚡
### *The simplest MarkDown documenter yet!*

**DocMeDown** is a developer tool designed to eliminate documentation friction completely. It gives you the full aesthetic polish and reactive power of **Docusaurus**, **VitePress**, or **Mintlify** — without the complex configuration, heavy build pipelines, or static site dependencies.

> [!TIP]
> **Zero Configuration Out of the Box**: DocMeDown automatically crawls all your Markdown files and subfolders, creating navigation trees, route links, and instant fuzzy search with zero manual setup.

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    subgraph Sources ["1. Documentation Sources"]
        A[Local .md Files]
        B[Remote GitHub Repository]
        C[Remote GitLab Repository]
    end

    subgraph DocMeDown ["2. DocMeDown Engine"]
        D[Zero-Config Auto-Indexer]
        E[Markdown & Math Parser]
        F[React SPA Runtime]
        G[Custom .dmd Components]
    end

    subgraph Output ["3. Target Outputs"]
        H[Live Dev Server with Hot-Reload]
        I[Static Web Hosting / GitHub Pages]
        J[100% Offline Single-File HTML]
    end

    Sources --> D
    D --> E
    E --> F
    G --> F
    F --> Output
```

---

## ⚡ Feature Comparison

| Feature | **DocMeDown** | Docusaurus | Docsify | Sphinx |
| :--- | :---: | :---: | :---: | :---: |
| **Setup Time** | **< 10 seconds** | ~5-10 mins | ~2 mins | ~15 mins |
| **Zero-Config Mode** | **Yes** ⚡ | No | Partial | No |
| **React SPA Runtime** | **Yes** ⚛️ | Yes | No (Vanilla) | No (Static HTML) |
| **Dynamic Remote GitHub Docs** | **Yes** 🌐 | No | Partial | No |
| **100% Offline Single-File HTML** | **Yes** 📦 | No | No | No |
| **Interactive Terminal TUI** | **Yes** 🛠️ | No | No | No |
| **Global Custom React Components** | **Yes (`.dmd/`)** | Yes (MDX) | Plugins | Extensions |
| **Built-in Fuzzy Search (⌘K)** | **Yes** 🔍 | Plugin required | Plugin required | Basic |
| **Mermaid & KaTeX Math** | **Built-in** 📊 | Plugins | Plugins | Plugins |

---

## 🎨 Interactive Live Demo

Below are live interactive components loaded from `docs/.dmd/components.js`:

<InteractiveThemeDemo />

<CounterWidget title="Live React State Widget in Markdown" />

---

## 🚀 Quick Navigation

- 📖 **[Getting Started](./getting-started.md)**: Install and run DocMeDown in under 30 seconds.
- 🛠️ **[CLI Command Reference](./guides/cli-reference.md)**: Explore `init`, `serve`, `build`, and `config`.
- 🌐 **[Dynamic Remote GitHub Docs](./guides/remote-github.md)**: Document remote repositories without hosting markdown files.
- 📦 **[Offline Single-File Bundler](./guides/offline-mode.md)**: Build single-file offline HTML bundles.
- ⚛️ **[Custom Components Guide](./guides/custom-components.md)**: Learn how to use `.dmd` React widgets.
- 📝 **[Markdown & Math Features](./guides/markdown-features.md)**: Alerts, Prism syntax highlighting, Mermaid, and KaTeX.
- ⚙️ **[Configuration Reference](./configuration.md)**: Detailed `docs.json` options.
- 🧪 **[Runnable Examples](./examples.md)**: Open independent nested documentation sites for local, remote, and offline workflows.
