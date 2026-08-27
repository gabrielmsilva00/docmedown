---
title: Custom React Components
description: Learn how to use .dmd components and interactive widgets inside your Markdown.
order: 1
tags: [components, react, dmd]
---

# Custom React Components (.dmd)

DocMeDown supports embedding custom React components directly into your documentation.

---

## 1. Defining Global Components

Place a browser-loadable module at `.dmd/components.js`. DocMeDown exposes React as `window.React` inside that module:

```js title=".dmd/components.js"
const { createElement, useState } = window.React;

export function InteractiveButton({ label = 'Click Me' }) {
  const [count, setCount] = useState(0);
  return createElement(
    'button',
    { onClick: () => setCount((value) => value + 1) },
    `${label}: ${count}`
  );
}

export default {
  InteractiveButton,
};
```

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
