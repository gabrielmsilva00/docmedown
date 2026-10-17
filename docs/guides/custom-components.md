---
title: Custom Components (`.dmd/.components/`)
description: Author interactive custom components in Svelte 5, React TSX, or Web Elements, and explore built-in UI primitives.
order: 4
tags: [components, custom-elements, svelte, react, tsx, lit, builtins, interactive]
---

# Custom Components (`.dmd/.components/`) 🧩

DocMeDown provides a **Universal Component Compatibility Layer** that lets you bring interactive widgets into your documentation using **Svelte 5**, **React with TypeScript (TSX)**, or standard **Web Elements (Lit)** — with automatic registration, shared CSS variables, and zero build configuration.

---

## 🏗️ 1. The `.dmd/.components/` Directory

To create a custom component, drop any `.svelte`, `.tsx`, or `.ts` file into `.dmd/.components/` inside your documentation directory (bare `.dmd/` still works as a deprecated fallback):

```
docs/
├── .dmd/.config/docs.json
├── README.md
└── .dmd/.components/
    ├── StatusWidget.svelte       # Svelte 5 component -> <StatusWidget />
    ├── MetricCard.tsx            # React TSX component  -> <MetricCard />
    └── ClusterPill.ts            # Web Element / Lit   -> <ClusterPill />
```

Any component created in `.dmd/.components/` is **immediately available as an HTML-like tag in any Markdown document**:

```markdown
# Live Dashboard

Check our cluster status below:

<StatusWidget environment="production" />
<MetricCard label="Throughput" initial={4500} unit="req/s" />
<ClusterPill status="healthy" region="us-east-1" />
```

---

## 🎨 2. Authoring in Svelte 5 (Native Runes)

Svelte 5 components offer the fastest performance and smallest bundle footprint. Use modern runes (`$state`, `$derived`, `$props`) and declare the custom element tag name:

```svelte title="docs/.dmd/InteractiveCounter.svelte"
<svelte:options customElement="dmd-interactive-counter" />

<script lang="ts">
  let { title = "Counter", step = 1 }: { title?: string; step?: number } = $props();
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>

<div class="counter-box">
  <div class="readout">
    <strong>{title}</strong>: {count} (Doubled: {doubled})
  </div>
  <div class="actions">
    <button onclick={() => count += step}>+{step}</button>
    <button onclick={() => count = 0}>Reset</button>
  </div>
</div>

<style>
  .counter-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-radius: 8px;
    background: var(--dmd-bg-card, #1e1e2e);
    border: 1px solid var(--dmd-border-color, #333);
    margin: 1.5rem 0;
  }
  .readout {
    color: var(--dmd-text-primary, #fff);
    font-size: 0.95rem;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  button {
    padding: 6px 14px;
    border-radius: 6px;
    background: var(--dmd-primary, #6366f1);
    color: white;
    border: none;
    cursor: pointer;
    font-weight: 500;
  }
  button:hover {
    filter: brightness(1.1);
  }
</style>
```

---

## ⚛️ 3. Authoring in React TSX (`.tsx`)

You can write custom components directly in React using TypeScript. DocMeDown automatically parses props, attaches event listeners, and mounts the component into the page:

```tsx title="docs/.dmd/ReactMetricCard.tsx"
import React, { useState } from "react";

export interface MetricCardProps {
  label?: string;
  initial?: number;
  unit?: string;
}

export default function ReactMetricCard({
  label = "Latency",
  initial = 42,
  unit = "ms",
}: MetricCardProps) {
  const [val, setVal] = useState(initial);

  return (
    <div style={{
      padding: "1rem 1.25rem",
      borderRadius: "8px",
      background: "var(--dmd-bg-card, #1e1e2e)",
      border: "1px solid var(--dmd-border-color, #333)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      margin: "1.5rem 0"
    }}>
      <div>
        <span style={{ color: "var(--dmd-text-muted, #888)", fontSize: "0.85rem" }}>{label}</span>
        <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--dmd-text-primary, #fff)" }}>
          {val} <small style={{ fontSize: "0.85rem" }}>{unit}</small>
        </div>
      </div>
      <button
        onClick={() => setVal(val + 5)}
        style={{
          padding: "6px 14px",
          borderRadius: "6px",
          background: "var(--dmd-primary, #6366f1)",
          color: "#fff",
          border: "none",
          cursor: "pointer"
        }}
      >
        Simulate Spike
      </button>
    </div>
  );
}
```

### How React Components Compile:
- **Build-Time AOT Conversion**: During `docmedown build`, standard React components are converted directly into **native Svelte 5 custom elements**. This completely strips the React runtime from your production bundle, delivering zero-runtime overhead!
- **Runtime React Bridge**: For complex components with external React dependencies, DocMeDown automatically falls back to an isolated `createRoot()` bridge, synchronizing props to HTML attributes.

---

## 🌐 4. Authoring Web Elements / Lit (`.ts`, `.js`)

Any standard Custom Element can be registered directly:

```ts title="docs/.dmd/LitStatusBadge.ts"
export class LitStatusBadgeElement extends HTMLElement {
  static get observedAttributes() {
    return ["status", "label"];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const status = this.getAttribute("status") || "operational";
    const label = this.getAttribute("label") || "Service";
    const isOk = status === "operational" || status === "healthy";

    this.innerHTML = `
      <div style="display:inline-flex; align-items:center; gap:8px; padding:4px 10px; border-radius:12px; background:${isOk ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}; border:1px solid ${isOk ? "#10b981" : "#ef4444"}; font-size:0.85rem; color:${isOk ? "#10b981" : "#ef4444"};">
        <span style="width:8px; height:8px; border-radius:50%; background:currentColor;"></span>
        <strong>${label}</strong>: ${status}
      </div>
    `;
  }
}

if (typeof customElements !== "undefined" && !customElements.get("dmd-lit-status-badge")) {
  customElements.define("dmd-lit-status-badge", LitStatusBadgeElement);
}

export default LitStatusBadgeElement;
```

---

## 🎬 5. Performance-Minded Animation Hooks (`docmedown/motion`)

DocMeDown includes a lightweight, hardware-accelerated motion engine powered by `motion/mini`. It allows you to animate your custom components with declarative Svelte actions, React hooks, or imperative helpers — with built-in accessibility compliance.

<MotionDemoWidget />

### Key Features:
- 🚀 **Composite-friendly presets**: `fade`, `slide`, and `scale` animate opacity and transforms. Expanding/collapsing height and scrolling still require layout work; use those only when needed.
- ♿ **Reduced motion**: System `prefers-reduced-motion` is respected; `data-dmd-motion="reduced"`/`"full"` on `<html>` overrides it, followed by the `dmd-motion` localStorage setting.
- ⚡ **Shared runtime**: Custom components reuse the motion helpers shipped with DocMeDown instead of bundling another copy.

---

### 1. Animating Svelte Components (Actions)

Import declarative motion actions directly from `"docmedown/motion"`:

```svelte title="docs/.dmd/AnimatedCard.svelte"
<script lang="ts">
  import { motion, fade, slide, scale } from "docmedown/motion";
</script>

<!-- Custom motion action with initial, animate, and transition options -->
<div use:motion={{
  initial: { opacity: 0, transform: "translateY(20px)" },
  animate: { opacity: 1, transform: "translateY(0px)" },
  transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] }
}}>
  <h4>Smooth Card</h4>
</div>

<!-- Or fast presets -->
<div use:fade={{ duration: 0.3 }}>Fades in</div>
<div use:slide={{ direction: "up", distance: 16 }}>Slides up</div>
<div use:scale={{ from: 0.9 }}>Scales up</div>
```

Presets accept `duration` and `delay` in **seconds**; `slide` also accepts `direction` and `distance` in pixels. Actions support Svelte's `update` lifecycle, so changing their options restarts the animation and cancels the previous one. Use `inView: true` with any preset or `motion` to defer a reveal until it enters the viewport (and disconnect its observer afterward). On reduced-motion devices, the final state appears immediately without an observer or delay.

---

### 2. Animating React TSX Components (`useMotion`)

For React components in `.dmd/`, use the `useMotion` ref callback hook:

```tsx title="docs/.dmd/ReactAnimatedStats.tsx"
import React from "react";
import { useMotion } from "docmedown/motion";

export default function ReactAnimatedStats() {
  const containerRef = useMotion({
    initial: { opacity: 0, transform: "scale(0.95)" },
    animate: { opacity: 1, transform: "scale(1)" },
    transition: { duration: 0.35, ease: "easeOut" }
  });

  return (
    <div ref={containerRef} className="stats-box">
      <h3>Active Clusters</h3>
      <p>99.99% Availability</p>
    </div>
  );
}
```

---

### 3. Imperative Helpers: Expand, Collapse, Smooth Scroll, Stagger

For disclosures, accordions, or smooth scrolling, use performance-minded utility functions:

```ts
import { expand, collapse, smoothScroll, stagger, animate } from "docmedown/motion";

// Smooth accordion expand/collapse measuring real content height (no 1000px max-height hack!)
expand(panelElement, { duration: 250 });
collapse(panelElement, { duration: 200 });

// Cancelable, interruptible smooth scrolling for carousels
smoothScroll(viewportElement, 480, { duration: 380, direction: "x" });

// Stagger a list of elements
stagger(badgeElements, { opacity: [0, 1], transform: ["scale(0.8)", "scale(1)"] }, {
  staggerDelay: 0.05,
  duration: 0.3
});
```

`expand`, `collapse`, and `smoothScroll` take durations in **milliseconds**. Each returns `{ stop, finished }`; `stop()` cancels work, and `finished` resolves after completion or cancellation. Scrolling also stops when the user wheels, touches, clicks, or presses a key in the container. `onComplete` runs only for completed animations.

---

## 🎯 6. Shared Theme Design Tokens (CSS Variables)

To ensure custom components match the active theme family (`atlas`, `blueprint`, `terminal`, `editorial`) and light/dark modes, use DocMeDown's standard CSS tokens:

| Token | Description | Example Value |
| :--- | :--- | :--- |
| `var(--dmd-primary)` | Current family accent/action color | `#6366f1` / `#38bdf8` |
| `var(--dmd-bg-canvas)` | Background canvas color | `#ffffff` / `#0f172a` |
| `var(--dmd-bg-card)` | Surface container / card background | `#f8fafc` / `#1e293b` |
| `var(--dmd-text-primary)` | Primary text color | `#0f172a` / `#f8fafc` |
| `var(--dmd-text-muted)` | Subdued secondary text color | `#64748b` / `#94a3b8` |
| `var(--dmd-border-color)` | Standard border stroke | `#e2e8f0` / `#334155` |
| `var(--dmd-font-sans)` | Primary typography font stack | System Sans / Inter |
| `var(--dmd-font-mono)` | Monospace code font stack | JetBrains Mono / Fira Code |

---

## 🧰 7. Built-in Interactive Components

DocMeDown ships **20 built-in elements** that you can use out of the box without importing anything:

### 1. `<Tabs>` and `<Tab>`
Organize commands or instructions across variants (`recessed`, `pills`, `underline`, `postit`):

```html
<Tabs type="pills">
  <Tab label="npm" icon="📦">npm install docmedown</Tab>
  <Tab label="pnpm" icon="⚡">pnpm add docmedown</Tab>
  <Tab label="yarn" icon="🧶">yarn add docmedown</Tab>
</Tabs>
```

### 2. `<CardGrid>` and `<Card>`
Highlight features or links in responsive grids (auto-converts to a carousel when items exceed columns):

```html
<CardGrid cols={2}>
  <Card
    title="Zero Config"
    description="Drop index.html and browse instantly."
    badge="Instant"
    badgeType="success"
  />
  <Card
    title="100% Offline"
    description="Double-click file:/// HTML manual."
    badge="Air-Gapped"
    badgeType="info"
  />
</CardGrid>
```

### 3. `<Steps>` and `<Step>`
Document sequential tutorials with auto-incrementing numbers:

```html
<Steps>
  <Step title="Run Scaffolder">Run <code>npx docmedown init ./docs</code></Step>
  <Step title="Preview Changes">Run <code>npx docmedown dev</code></Step>
  <Step title="Deploy Anywhere">Host on GitHub Pages or bundle single-file</Step>
</Steps>
```

### 4. `<Badge>`
Label release statuses, stability flags, or tags:

```html
<Badge type="success">STABLE</Badge>
<Badge type="warning">BETA</Badge>
<Badge type="danger">DEPRECATED</Badge>
<Badge type="new">v0.9.0</Badge>
```

### 5. Universal `<Item>`
`<Item>` works across all containers (`<Tabs>`, `<CardGrid>`, `<Steps>`, `<Accordion>`, `<Timeline>`, `<Columns>`) automatically adapting to the nearest parent!

```html
<Steps>
  <Item>Install with npm</Item>
  <Item>Write Markdown</Item>
  <Item>Deploy</Item>
</Steps>
```

### 6. `<Media>`
Embed raster images, vector SVGs, HTML5 video and audio players with full styling, fallbacks, and lossless offline compilation:

```html
<Media
  src="./assets/hero.png"
  alt="Architecture Overview"
  width="100%"
  maxWidth="640px"
  rounded="md"
  shadow="sm"
  caption="DocMeDown high-performance architecture pipeline"
/>
```

---

## 🚀 Explore the Showcase

For live, side-by-side interactive demonstrations of all 20 built-in elements, visit the **[Markdown Syntax & Component Showcase](../showcase.md)**!

---

## 🗺️ Next Steps

Continue along the linear documentation journey:

<CardGrid cols={2}>
  <Card
    title="Next-Gen DX & Editor"
    description="True in-place HMR, split-view in-browser editor (Ctrl+E), and staged previews."
    href="#/guides/developer-experience"
    badge="Next Up"
    badgeType="info"
  />
  <Card
    title="Built-in UI Primitives"
    description="Reference for all 20 elements: CardGrid, Tabs, Badges, Callouts, Media, and Buttons."
    href="#/guides/built-in-components"
    badge="Previous"
    badgeType="success"
  />
</CardGrid>

