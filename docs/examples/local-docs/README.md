---
title: Orbit Notes
description: A self-contained local documentation example.
icon: 🚀
order: 1
tags: [getting-started, overview, docs]
---

# Orbit Notes

Orbit Notes is a complete local documentation site stored inside the parent DocMeDown documentation. Its pages, configuration, theme, and components belong to this site alone.

> [!TIP]
> This example proves nested documentation isolation: the parent site does not index these pages, and this site does not inherit the parent's `docs.json` or `.dmd` components.

---

## What this example owns

- Its own `docs.json` with the compact `terminal` theme family.
- Its own local Markdown pages and search index.
- Its own `.dmd/components.js` module.
- Its own offline artifact at `.dist/index.html`.

---

## Isolated component

<OrbitCounter label="Nested state" />

---

## Next Steps

Read the [installation guide](./getting-started.md) or open the [component guide](./guides/custom-components.md).
