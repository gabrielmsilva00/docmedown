---
title: Field Manual
description: A nested documentation site prepared for offline distribution.
order: 1
tags: [offline, portable, nested]
---

# Field Manual

This is a complete documentation site inside the parent documentation repository. Build it once, then carry `.dist/index.html` anywhere and open it with `file:///`.

<PackStatus />

## What ships

- This site's own Markdown corpus.
- Its own `docs.json` configuration.
- Its own `.dmd/components.js` module.
- One standalone `.dist/index.html` artifact.

Read [how to pack this manual](./packing.md).