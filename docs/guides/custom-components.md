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

---

## 2. Ready-to-Use Built-in Components

DocMeDown includes a rich suite of built-in components ready for use:

### `<Tabs>` and `<Tab>`

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

---

### `<CardGrid>` and `<Card>`

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

---

### `<Steps>` and `<Step>`

```html
<Steps>
  <Step title="Initialize Documentation" step={1}>
    Run <code>npx docmedown ./docs</code> in your terminal.
  </Step>
  <Step title="Customize Branding" step={2}>
    Run <code>npx docmedown config</code> or edit <code>docs.json</code>.
  </Step>
  <Step title="Deploy Anywhere" step={3}>
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
