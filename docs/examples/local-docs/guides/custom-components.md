---
title: Custom React Components
description: Learn how to use .dmd components and interactive widgets inside your Markdown.
order: 1
tags: [components, react, dmd]
---

# Orbit components

This example uses a component that belongs only to Orbit Notes. It demonstrates that a nested `.dmd` directory stays isolated from the parent documentation site.

---

## 1. Defining a local component

Place browser-loadable modules inside `.dmd/components.js`:

```js title=".dmd/components.js"
const { createElement, useState } = window.React;

export function OrbitCounter({ label = 'Orbit count' }) {
  const [count, setCount] = useState(0);
  return createElement('button', { onClick: () => setCount(count + 1) }, `${label}: ${count}`);
}
```

---

## 2. Using it in Markdown

<OrbitCounter label="Component-local count" />

The parent site has no `OrbitCounter`; this tag is resolved by the `.dmd/components.js` file in this directory.
