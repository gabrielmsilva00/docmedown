---
title: Custom Components (.dmd)
description: Deep dive into custom elements, the .dmd directory, and built-in interactive widgets.
order: 4
tags: [components, custom-elements, dmd, interactive, widgets]
---

# Custom Components (`.dmd`) 🧩

DocMeDown lets you bring full interactivity into your documentation with **native Svelte 5 custom components** — no complex bundler configurations, no React or Lit dependencies, and zero overhead in production.

---

## 1. Creating Custom Components in `.dmd/`

Custom components are authored as standard Svelte 5 single-file components (`.svelte`) inside the `.dmd/` directory of your documentation folder.

Create your component file, such as `.dmd/InteractiveMetric.svelte`:

```svelte title=".dmd/InteractiveMetric.svelte"
<svelte:options customElement={{ tag: "dmd-interactive-metric" }} />

<script>
  let { label = "API Success Rate", target = 100 } = $props();
  let value = $state(10);
</script>

<div class="metric-panel">
  <div class="metric-readout">
    <strong>{label}</strong>: {value}%
  </div>
  <input
    type="range"
    min="0"
    max={target}
    bind:value
    class="metric-slider"
  />
</div>

<style>
  .metric-panel {
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid var(--dmd-border-color);
    background: var(--dmd-bg-card);
    margin: 1rem 0;
  }
  .metric-readout {
    font-weight: 600;
    color: var(--dmd-text-primary);
  }
  .metric-slider {
    width: 100%;
    margin-top: 8px;
  }
</style>
```

You can now use `<InteractiveMetric label="API Success Rate" />` directly in any `.md` file! The runtime upgrades your PascalCase tags to `dmd-<name>` custom elements automatically.

### Ahead-of-Time (AOT) vs. In-Browser Runtime Compilation

DocMeDown gives you the best of both worlds:

1. **Ahead-of-Time (AOT) Production Builds**:
   When you run `docmedown build`, all `.dmd/*.svelte` components are compiled ahead-of-time during bundling. The compiled code is embedded directly into `_docs.js` and `.dist/index.html`. In production, your documentation loads instantly with **zero runtime compiler overhead**.

2. **In-Browser Runtime Compilation**:
   In local preview or dynamic serve mode (`docmedown serve`), raw `.svelte` components can be fetched dynamically. DocMeDown loads its lightweight compiler engine on-demand (`dist/docmedown-compiler.js`) and compiles components in-browser, linking them directly to active Svelte 5 runtime primitives.

3. **Tag Auto-Derivation**:
   If you omit `<svelte:options customElement={{ tag: "..." }} />`, DocMeDown automatically assigns the canonical `dmd-<kebab-name>` tag matching your component's file name (e.g. `MyWidget.svelte` becomes `<dmd-my-widget>`).

4. **Legacy Compatibility**:
   If you still have existing custom element classes in `.dmd/components.js` or `.dmd/index.js`, DocMeDown continues to bundle and register them seamlessly alongside Svelte components.

---

## 2. Ready-to-Use Built-in Components

DocMeDown includes a rich suite of built-in components ready for use:

### `<Tabs>` and `<Tab>`

Tabs support four visual treatments via the `type` prop — `recessed` (default,
a pressed well with a raised active tab), `underline` (chromeless uppercase
micro-label tabs with a sliding accent bar), `pills` (a centered floating
segmented control with a sliding accent pill), or `postit` (warm amber-tinted
tilted folder tabs that straighten and dock into the panel when active).
`label` is optional: a tab may be icon-only (an accessible
name is derived from `value`/index). The universal `<Item>` works as a `<Tab>`
and forwards its `label`/`icon`:

```html
<Tabs type="postit">
  <Tab label="npm">
    npm install docmedown
  </Tab>
  <Tab label="yarn" icon="🌀">
    yarn add docmedown
  </Tab>
  <Tab icon="⚙️">
    Icon-only tab, no label.
  </Tab>
</Tabs>

<!-- <Item> resolves to a Tab inside <Tabs> -->
<Tabs>
  <Item label="npm">npm install docmedown</Item>
  <Item label="pnpm">pnpm add docmedown</Item>
</Tabs>
```

---

### `<CardGrid>` and `<Card>`

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
    title="Instant Scaffolding"
    description="npx docmedown init ./docs"
    badge="CLI"
    badgeType="info"
  />
  <Card
    title="Hot Live Reloading"
    description="npx docmedown serve ./docs"
    badge="Dev"
    badgeType="success"
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

---

### `<Steps>` and `<Step>`

Step numbers are optional — `<Steps>` auto-numbers each step in order.

```html
<Steps>
  <Step title="Initialize Documentation">
    Run <code>npx docmedown ./docs</code> in your terminal.
  </Step>
  <Step title="Customize Branding">
    Run <code>npx docmedown config</code> or edit <code>docs.json</code>.
  </Step>
  <Step title="Deploy Anywhere">
    Host on GitHub Pages, Vercel, or bundle single-file offline.
  </Step>
</Steps>
```

---

### `<Badge>`

```html
<Badge type="success">STABLE</Badge>
<Badge type="warning">DEPRECATED</Badge>
<Badge type="danger">CRITICAL</Badge>
<Badge type="new">v1.0 NEW</Badge>
```

---

### The Universal `<Item>`

`<Item>` is a single child element that works across every paired container. Inside a
container it behaves exactly like that container's designated child — inheriting all its
props — and it resolves to the **nearest** container ancestor, even through intermediate
wrappers. With no container ancestor it renders as an `<li>` (the child of an unordered
list).

```html
<Accordion>
  <Item title="Is DocMeDown free?" defaultOpen>
    Yes — MIT licensed, forever.
  </Item>
</Accordion>

<Timeline>
  <Item title="0.1.7 — Offline self-containment" subtitle="2026-08-30">
    Nested sites embed into the single-file bundle.
  </Item>
</Timeline>

<Steps>
  <Item>Run <code>npx docmedown ./docs</code></Item>
  <Item>Write Markdown, get navigation and search for free.</Item>
</Steps>

<Columns cols={3} type="card">
  <Item>**Author** in plain Markdown.</Item>
  <Item>**Theme** with four complete families.</Item>
</Columns>

<!-- Inside a CardGrid, Item behaves as a Card: -->
<CardGrid cols={2}>
  <Item title="Zero Build Friction" badge="Fast">Drop an index.html and browse.</Item>
  <Item color="blue">No title required.</Item>
</CardGrid>

<!-- Bare Item with no container → list item -->
<ul>
  <Item>First</Item>
  <Item>Second</Item>
</ul>
```

`<Item>` inherits every property of the child it resolves to (e.g. `title`, `subtitle`,
`defaultOpen`, `step`, `color`, …) and works exactly like writing the concrete child
directly. Inside `<Steps>` it is auto-numbered like `<Step>`.

---

## 3. Pure Svelte 5 Built-in Architecture

As of **v0.3.1**, DocMeDown has completely evicted Lit in favor of a pure **Svelte 5** architecture. All 19 built-in elements (`Tabs`, `Tab`, `CardGrid`, `Card`, `Steps`, `Step`, `Badge`, `Alert`, `Callout`, `Button`, `Kbd`, `Details`, `Accordion`, `AccordionItem`, `Columns`, `Column`, `Timeline`, `TimelineItem`, and `Item`) are compiled natively with `<svelte:options customElement={{ tag: "dmd-..." }} />` using modern runes (`$state`, `$derived`, `$props`).

Built-ins automatically adopt global CSS variables and theme tokens via `adoptSharedStyles()`, ensuring pixel-perfect contrast, instant transitions across Atlas/Blueprint/Terminal/Editorial theme families, and zero dual-framework overhead.

---

## 4. Full Library & Live Showcase

DocMeDown ships 19 built-in components — `Tabs`/`Tab`, `CardGrid`/`Card`, `Steps`/`Step`, `Badge`, `Alert`/`Callout`, `Button`, `Kbd`, `Details`, `Accordion`/`AccordionItem`, `Columns`/`Column`, `Timeline`/`TimelineItem`, and `Item` — every one documented with copy-paste sources next to live renders in the **[Markdown Syntax & Component Showcase](../showcase.md)**.
