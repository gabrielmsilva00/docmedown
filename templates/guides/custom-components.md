---
title: Custom Components
description: Learn how to use .dmd custom elements and interactive widgets inside your Markdown.
order: 1
tags: [components, custom-elements, dmd]
---

# Custom Components (.dmd)

DocMeDown supports embedding **custom elements and multi-framework components** directly into your documentation. You can author components using **native Svelte 5**, **React with TypeScript (TSX)**, or standard **Web Elements (Lit)** inside `.dmd/`.

---

## 1. Defining Components in `.dmd/`

Any component placed in the `.dmd/` folder is automatically discovered, compiled, and registered for use in your Markdown.

### Svelte 5 Component (`.dmd/CounterWidget.svelte`)

Your scaffolded project includes a starter Svelte 5 component:

```svelte title=".dmd/CounterWidget.svelte"
<svelte:options customElement={{ tag: "dmd-counter-widget" }} />
<script lang="ts">
  let { title = "Interactive Counter" }: { title?: string } = $props();
  let count = $state(0);
</script>

<div class="dmd-counter-panel">
  <button type="button" class="dmd-counter-btn" onclick={() => count++}>
    {title}: {count}
  </button>
</div>
```

### React TSX Component (`.dmd/ReactMetricCard.tsx`)

You can also drop standard React TSX components into `.dmd/`:

```tsx title=".dmd/ReactMetricCard.tsx"
import React, { useState } from "react";

export default function ReactMetricCard({ label = "Query Rate", initial = 100 }) {
  const [val, setVal] = useState(initial);
  return (
    <button onClick={() => setVal(val + 10)}>
      {label}: {val}
    </button>
  );
}
```

The runtime registers each component as `dmd-<name>` and upgrades PascalCase tags in your Markdown automatically.

---

## 2. Using Custom and Built-in Components

Use your custom component directly inside any Markdown file:

```html
<CounterWidget title="Clicks" />
```

### Tabbed Code Snippets

```html
<Tabs>
  <Tab label="npm">
    npm install docmedown
  </Tab>
  <Tab label="yarn">
    yarn add docmedown
  </Tab>
  <Tab label="pnpm">
    pnpm add docmedown
  </Tab>
</Tabs>
```

### Feature Card Grid

Cards can be fully prop-driven (self-closing) or container-style with arbitrary
Markdown/HTML bodies. `title` is optional; `color` accepts a named variant
(`blue`, `green`, `violet`, `amber`, `red`, `neutral`) or any CSS color, and
`shadow={false}` opts out of the default drop shadow. Grids containing more
cards than columns automatically become a carousel with prev/next controls,
position dots, and wrap-around cycling: one position per card, so the last card
leads its own window and wraps back to the first.

Container-style cards can also name themselves. When `title`, `description`, and
`footer` are left out, the first heading above `###` (an `#` or `##`) becomes the
card title, the deeper heading right after it becomes the subtitle, and a
trailing blockquote — or an `######` heading — becomes the footer. Everything
else, including `###` and deeper headings, stays in the body; an explicit prop
always wins for its own slot.

```html
<CardGrid cols={2}>
  <Card
    title="Zero Build Friction"
    description="Drop index.html and start browsing immediately."
    badge="Fast"
    badgeType="success"
  />
  <Card
    title="Remote GitHub Repos"
    description="Document remote git repositories live."
    badge="Live"
    badgeType="new"
  />
</CardGrid>
```

Container-style card with a Markdown body:

```html
<Card color="blue" title="Quick start">
  Install with **npm**, then write Markdown:

  - zero config
  - hot reload

  <Badge type="success">STABLE</Badge>
</Card>
```

A heading-led body is adopted as card chrome, so no props are needed at all:

```html
<Card color="blue">
  ## Quick start
  ### Install with **npm**, then write Markdown

  - zero config
  - hot reload

  > Ships as a single `docmedown.web.js` file.
</Card>
```
