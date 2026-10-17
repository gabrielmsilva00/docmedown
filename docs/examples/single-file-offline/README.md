---
title: Field Manual
description: A nested documentation site prepared for offline distribution.
order: 1
tags: [offline, portable, nested]
---

# Field Manual

This is a complete documentation site inside the parent documentation repository. Build it once, then carry `.dmd/.singlefile/index.html` anywhere and open it with `file:///`.

<PackStatus />

## What ships

- This site's own Markdown corpus.
- Its own `.dmd/.config/docs.json` configuration.
- Its own `.dmd/.components/components.js` module.
- One standalone `.dmd/.singlefile/index.html` artifact.

Read [how to pack this manual](./packing.md).