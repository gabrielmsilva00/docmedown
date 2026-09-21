---
title: Custom Components
description: Learn how to use .dmd custom elements and interactive widgets inside your Markdown.
order: 1
tags: [components, custom-elements, dmd]
---

# Custom Components (.dmd)

DocMeDown supports embedding **custom elements** directly into your documentation — framework-free, so components work in any host page, the offline bundle, and even outside DocMeDown.

---

## 1. Defining Global Components

Place a browser-loadable module at `.dmd/components.js` exporting a map of component name → `HTMLElement` subclass:

```js title=".dmd/components.js"
export class InteractiveButton extends HTMLElement {
  connectedCallback() {
    let count = 0;
    const button = document.createElement("button");
    button.textContent = "Click Me: 0";
    button.addEventListener("click", () => {
      count += 1;
      button.textContent = `Click Me: ${count}`;
    });
    this.innerHTML = "";
    this.appendChild(button);
  }
}

export default {
  InteractiveButton,
};
```

The runtime registers each export as `dmd-<name>` (for example `dmd-interactive-button`) and upgrades the PascalCase tags you write in Markdown automatically.

`docmedown build` bundles this module and its relative JavaScript imports into both `_docs.js` and `.dist/index.html`, so the same component behavior works from a static host and `file:///` offline bundle.

---

## 2. Using Custom and Built-in Components

DocMeDown comes with built-in interactive components ready to use:

```html
<InteractiveButton label="Count clicks" />
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
