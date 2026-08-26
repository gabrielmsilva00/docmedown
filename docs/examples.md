---
title: Runnable Examples
description: Independent documentation sites nested inside the DocMeDown documentation.
order: 5
tags: [examples, nested-docs, configuration, components]
---

# Runnable examples

Each example below is a complete DocMeDown site. It owns its own `docs.json`, `.dmd/` component directory, manifest, runtime, and offline bundle. The parent documentation intentionally does **not** index the Markdown inside these directories.

## Local documentation site

[Open the local documentation example](examples/local-docs/index.html)

Use this site to see local Markdown pages, a separate theme, and an interactive component loaded from `examples/local-docs/.dmd/components.js`.

## Remote GitHub site

[Open the remote GitHub example](examples/remote-github/index.html)

This nested site has no local Markdown corpus. Its own `docs.json` points the runtime at a GitHub repository and keeps that remote configuration separate from the parent site.

## Offline documentation site

[Open the offline example](examples/single-file-offline/index.html)

This site is built from its own source documents. Its distributable single-file version is available at `examples/single-file-offline/.dist/index.html` after the standard build.

## Nested documentation rule

A directory containing `docs.json` is a documentation root. Builds discover it, create its own artifacts, and stop the parent manifest from crossing into it. This allows documentation sites to live inside other documentation repositories without leaking pages, configuration, search indexes, or `.dmd` components across sites.