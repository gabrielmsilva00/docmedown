---
title: Custom Components (.dmd)
description: Deep dive into custom elements, the .dmd directory, and built-in interactive widgets.
order: 4
tags: [components, custom-elements, dmd, interactive, widgets]
---

# Custom Components (`.dmd`) 🧩

DocMeDown lets you bring full interactivity into your documentation with **framework-free custom elements** — no MDX bundler configuration, no React dependency, and components that keep working even outside DocMeDown.

---

## 1. Creating Custom Components in `.dmd/`

Create a browser-loadable `.dmd/components.js` file inside your docs folder exporting `HTMLElement` subclasses:

```js title=".dmd/components.js"
export class InteractiveMetric extends HTMLElement {
  connectedCallback() {
    const label = this.getAttribute("label") || "Metric";
    const target = Number(this.getAttribute("target")) || 100;

    const panel = document.createElement("div");
    panel.style.cssText =
      "padding:1rem;border-radius:8px;border:1px solid var(--dmd-border-color);background:var(--dmd-bg-card);margin:1rem 0;";

    const readout = document.createElement("div");
    readout.style.fontWeight = "600";
    readout.textContent = `${label}: 10%`;

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = String(target);
    slider.value = "10";
    slider.style.cssText = "width:100%;margin-top:8px;";
    slider.addEventListener("input", () => {
      readout.textContent = `${label}: ${slider.value}%`;
    });

    panel.append(readout, slider);
    this.innerHTML = "";
    this.appendChild(panel);
  }
}

export default {
  InteractiveMetric,
};
```

You can now use `<InteractiveMetric label="API Success Rate" />` directly in any `.md` file! The runtime registers every export as a `dmd-<name>` custom element and upgrades the PascalCase tags in your Markdown automatically.

When you run `docmedown build`, the generated `_docs.js` and `.dist/index.html` bundle this entry module with its relative JavaScript imports. Keep browser-only code in the component graph; server-only Node APIs cannot run in either static or offline documentation output.

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

## 3. Full Library & Live Showcase

DocMeDown ships 12+ built-in components — `Tabs`, `CardGrid`/`Card`, `Steps`/`Step`, `Badge`, `Alert`/`Callout`, `Button`, `Kbd`, `Details`, `Accordion`/`AccordionItem`, `Columns`/`Column`, and `Timeline`/`TimelineItem` — every one documented with copy-paste sources next to live renders in the **[Markdown Syntax & Component Showcase](../showcase.md)**.
