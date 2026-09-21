---
title: Custom Components
description: Learn how to use .dmd components and interactive widgets inside your Markdown.
order: 1
tags: [components, custom-elements, dmd]
---

# Orbit components

This example uses a component that belongs only to Orbit Notes. It demonstrates that a nested `.dmd` directory stays isolated from the parent documentation site.

---

## 1. Defining a local component

Place your custom Svelte 5 components under `.dmd/*.svelte`:

```svelte title=".dmd/OrbitCounter.svelte"
<svelte:options customElement={{ tag: "dmd-orbit-counter" }} />

<script>
  let { label = "Orbit count" } = $props();
  let count = $state(0);
</script>

<button
  type="button"
  onclick={() => count++}
  style="padding:0.6rem 0.9rem;border:1px solid var(--dmd-accent);border-radius:6px;background:var(--dmd-accent-subtle);color:var(--dmd-text-primary);cursor:pointer;font-weight:700;"
>
  {label}: {count}
</button>
```

---

## 2. Using it in Markdown

<OrbitCounter label="Component-local count" />

The parent site has no `OrbitCounter`; this tag is resolved by the `.dmd/` directory in this documentation root.
