---
title: Custom React Components (.dmd)
description: Deep dive into custom React components, .dmd directory, and built-in interactive widgets.
order: 4
tags: [components, react, dmd, interactive, widgets]
---

# Custom React Components (`.dmd`) ⚛️

DocMeDown allows you to bring full React interactivity into your documentation without requiring MDX bundler configurations.

---

## 1. Creating Custom Components in `.dmd/`

Create a browser-loadable `.dmd/components.js` file inside your docs folder. React is provided as `window.React`:

```js title=".dmd/components.js"
const { createElement, useState } = window.React;

export function InteractiveMetric({ label, target = 100 }) {
  const [value, setValue] = useState(10);

  return createElement('div', { style: {
      padding: '1rem',
      borderRadius: '8px',
      border: '1px solid var(--dmd-border-color)',
      background: 'var(--dmd-bg-card)',
      margin: '1rem 0'
    }},
    createElement('div', { style: { fontWeight: 600 } }, `${label}: ${value}%`),
    createElement('input', {
      type: 'range', min: 0, max: target, value,
      onChange: (event) => setValue(Number(event.target.value)),
      style: { width: '100%', marginTop: '8px' }
    })
  );
}

export default {
  InteractiveMetric,
};
```

You can now use `<InteractiveMetric label="API Success Rate" />` directly in any `.md` file!

When you run `docmedown build`, the generated `_docs.js` and `.dist/index.html` bundle this entry module with its relative JavaScript imports. Keep browser-only code in the component graph and use `window.React`; server-only Node APIs cannot run in either static or offline documentation output.

---

## 2. Ready-to-Use Built-in Components

DocMeDown includes a rich suite of built-in components ready for use:

### `<Tabs>` and `<Tab>`

Tabs support four visual treatments via the `type` prop — `recessed` (default,
inset buttons in a pressed tray), `underline`, `pills`, or `postit` (rotated
sticky-note tabs). `label` is optional: a tab may be icon-only (an accessible
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
position dots, and wrap-around cycling.

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

## 3. Full Library & Live Showcase

DocMeDown ships 12+ built-in components — `Tabs`, `CardGrid`/`Card`, `Steps`/`Step`, `Badge`, `Alert`/`Callout`, `Button`, `Kbd`, `Details`, `Accordion`/`AccordionItem`, `Columns`/`Column`, and `Timeline`/`TimelineItem` — every one documented with copy-paste sources next to live renders in the **[Markdown Syntax & Component Showcase](../showcase.md)**.
