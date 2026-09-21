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

Place browser-loadable modules inside `.dmd/components.js` exporting `HTMLElement` subclasses:

```js title=".dmd/components.js"
export class OrbitCounter extends HTMLElement {
  connectedCallback() {
    const label = this.getAttribute("label") || "Orbit count";
    let count = 0;
    const button = document.createElement("button");
    button.textContent = `${label}: 0`;
    button.addEventListener("click", () => {
      count += 1;
      button.textContent = `${label}: ${count}`;
    });
    this.innerHTML = "";
    this.appendChild(button);
  }
}

export default { OrbitCounter };
```

---

## 2. Using it in Markdown

<OrbitCounter label="Component-local count" />

The parent site has no `OrbitCounter`; this tag is resolved by the `.dmd/components.js` file in this directory.
