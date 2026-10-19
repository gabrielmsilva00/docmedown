---
title: Built-in UI Primitives
description: "Complete reference and live props documentation for all 20 built-in Markdown UI elements: CardGrid, Card, Tabs, Tab, Badge, Callout, Button, Media, Kbd, and more."
order: 5
category: Authoring Content
tags: [components, built-in, primitives, card, tabs, badge, callout, button, media, kbd, ui]
---

# Built-in UI Primitives 🧩

DocMeDown includes a comprehensive library of **20 built-in UI primitives** that you can use directly inside standard Markdown without installing packages or writing import statements.

Every element is styled according to the active theme family (`atlas`, `blueprint`, `terminal`, `editorial`, `botanical`, `studio`) and seamlessly adapts to light and dark modes.

---

## 1. Cards & Grids (`<CardGrid>`, `<Card>`)

Organize features, links, guides, and navigation routes into responsive multi-column grids.

### Syntax
```html
<CardGrid cols={2}>
  <Card
    title="Zero-Config Setup"
    description="Drop index.html and write Markdown. No bundlers or build steps."
    href="#/getting-started"
    icon="⚡"
    badge="Fast"
    badgeType="success"
  />
  <Card
    title="Air-Gapped Offline"
    description="Single-file self-extracting HTML with zero external network requests."
    href="#/guides/offline-mode"
    icon="📦"
    badge="Standalone"
    badgeType="warning"
  />
</CardGrid>
```

### Live Render
<CardGrid cols={2}>
  <Card
    title="Zero-Config Setup"
    description="Drop index.html and write Markdown. No bundlers or build steps."
    href="#/getting-started"
    icon="⚡"
    badge="Fast"
    badgeType="success"
  />
  <Card
    title="Air-Gapped Offline"
    description="Single-file self-extracting HTML with zero external network requests."
    href="#/guides/offline-mode"
    icon="📦"
    badge="Standalone"
    badgeType="warning"
  />
</CardGrid>

### `<Card>` Props
| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | *(optional)* | Heading displayed at the top of the card. |
| `description`| `string` | *(optional)* | Body description text. |
| `href` | `string` | *(optional)* | Navigation destination. When set, renders the card as an interactive link. |
| `icon` | `string` | *(optional)* | Emoji or icon displayed next to the title. |
| `badge` | `string` | *(optional)* | Short label rendered as a colored badge. |
| `badgeType` | `string` | `"info"` | Badge color variant: `info`, `success`, `warning`, or `new`. |
| `color` | `string` | `"blue"` | Optional card accent border color (`blue`, `violet`, `amber`, `green`, `rose`). |

---

## 2. Tabs & Code Panels (`<Tabs>`, `<Tab>`)

Display alternative code samples (e.g. `npm` vs `pnpm` vs `bun`), multi-step guides, or platform variations.

DocMeDown supports 4 visual styling variants: `pills`, `underline`, `postit`, and `recessed`.

### 2.1 Pills Style (`type="pills"`)
````html
<Tabs type="pills">
  <Tab label="npm" icon="📦">
```bash
npm install -g docmedown
```
  </Tab>
  <Tab label="pnpm" icon="⚡">
```bash
pnpm add -g docmedown
```
  </Tab>
  <Tab label="bun" icon="🥟">
```bash
bun add -g docmedown
```
  </Tab>
</Tabs>
````

<Tabs type="pills">
  <Tab label="npm" icon="📦">
```bash
npm install -g docmedown
```
  </Tab>
  <Tab label="pnpm" icon="⚡">
```bash
pnpm add -g docmedown
```
  </Tab>
  <Tab label="bun" icon="🥟">
```bash
bun add -g docmedown
```
  </Tab>
</Tabs>

---

### 2.2 Underline Style (`type="underline"`)
````html
<Tabs type="underline">
  <Tab label="JavaScript">
```javascript
console.log("Hello from DocMeDown!");
```
  </Tab>
  <Tab label="TypeScript">
```typescript
const greeting: string = "Hello from DocMeDown!";
console.log(greeting);
```
  </Tab>
</Tabs>
````

<Tabs type="underline">
  <Tab label="JavaScript">
```javascript
console.log("Hello from DocMeDown!");
```
  </Tab>
  <Tab label="TypeScript">
```typescript
const greeting: string = "Hello from DocMeDown!";
console.log(greeting);
```
  </Tab>
</Tabs>

---

## 3. Badges (`<Badge>`)

Inline indicators for versioning, status, or tags.

```html
<Badge type="info">Stable</Badge>
<Badge type="success">Passing</Badge>
<Badge type="warning">Deprecated</Badge>
<Badge type="new">v0.9.0 New</Badge>
```

### Live Render
<Badge type="info">Stable</Badge> &nbsp;
<Badge type="success">Passing</Badge> &nbsp;
<Badge type="warning">Deprecated</Badge> &nbsp;
<Badge type="new">v0.9.0 New</Badge>

---

## 4. Keyboard Shortcuts (`<Kbd>`)

Display clean, platform-aware keyboard shortcuts.

```html
Press <Kbd>⌘K</Kbd> or <Kbd>Ctrl+K</Kbd> to open global search.
Press <Kbd>Ctrl+E</Kbd> or <Kbd>⌘E</Kbd> to open the live split-view markdown editor.
Press <Kbd>Esc</Kbd> to dismiss modals.
```

### Live Render
Press <Kbd>⌘K</Kbd> or <Kbd>Ctrl+K</Kbd> to open global search.  
Press <Kbd>Ctrl+E</Kbd> or <Kbd>⌘E</Kbd> to open the live split-view markdown editor.  
Press <Kbd>Esc</Kbd> to dismiss modals.

---

## 5. Callouts (`<Callout>`)

Complementing GitHub alert blockquotes (`> [!NOTE]`), the `<Callout>` component allows explicit custom titles and collapsible content.

```html
<Callout type="tip" title="Pro Tip: Quick Navigation">
You can jump directly to any document by pressing <Kbd>⌘K</Kbd> and typing its slug or title keywords.
</Callout>
```

### Live Render
<Callout type="tip" title="Pro Tip: Quick Navigation">
You can jump directly to any document by pressing <Kbd>⌘K</Kbd> and typing its slug or title keywords.
</Callout>

---

## 6. Action Buttons (`<Button>`)

Prominent call-to-action buttons for downloads, repository links, or external tools.

```html
<Button href="https://github.com/gabrielmsilva00/docmedown" variant="primary">
  Star on GitHub ⭐
</Button>
<Button href="#/getting-started" variant="secondary">
  Read Quickstart 🚀
</Button>
```

### Live Render
<Button href="https://github.com/gabrielmsilva00/docmedown" variant="primary">
  Star on GitHub ⭐
</Button> &nbsp;
<Button href="#/getting-started" variant="secondary">
  Read Quickstart 🚀
</Button>

---

## 7. Media Component (`<Media>`)

While standard Markdown syntax (`![alt](url)`) supports basic image linking, the `<Media>` primitive provides rich styling options, format auto-detection, fallback handling, audio/video players, and **offline compilation embedding**.

When building the standalone offline bundle (`index.html`), all media referenced by `<Media>` (and standard Markdown images) is automatically converted **losslessly** into offline-compatible Base64 Data URIs, creating a 100% self-contained distributable.

### 7.1 Image & Vector Examples
```html
<!-- Raster image with styling -->
<Media
  src="./assets/hero.png"
  alt="Architecture Overview"
  width="100%"
  maxWidth="720px"
  rounded="md"
  shadow="sm"
  align="center"
  caption="DocMeDown high-performance architecture pipeline"
/>

<!-- Vector SVG with inline DOM embedding -->
<Media
  src="./assets/diagram.svg"
  format="svg"
  embed="inline"
  width="480px"
  align="center"
/>
```

### 7.2 Video & Audio Players with Fallbacks
```html
<!-- Video player with fallback image and custom controls -->
<Media
  src="./assets/demo.mp4"
  type="video/mp4"
  fallback="./assets/poster.jpg"
  poster="./assets/poster.jpg"
  controls={true}
  width="100%"
  maxWidth="800px"
  rounded="lg"
  shadow="md"
/>

<!-- Audio player with textual fallback message -->
<Media
  src="./assets/podcast.mp3"
  format="audio/mpeg"
  fallback="Audio playback is not supported on your browser."
  controls
  align="left"
/>
```

### `<Media>` Props
| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `src` | `string` | `""` | Primary media URL, relative path, or Data URI. |
| `type` / `format` | `string` | `""` | Optional explicit MIME type (e.g. `video/mp4`, `image/png`) or format hint (`image`, `vector`, `video`, `audio`, `svg`). |
| `fallback` | `string` | `""` | Fallback media URL (image/video/audio) or fallback message text if primary media fails. |
| `fallbackText` | `string` | `""` | Custom error message displayed in the fallback card when loading fails. |
| `poster` | `string` | `""` | Poster image URL for video players. |
| `alt` | `string` | `""` | Accessible alternative text. |
| `title` | `string` | `""` | Title tooltip attribute. |
| `width` / `height` | `string \| number` | *(auto)* | Dimensions (e.g. `"100%"`, `"480px"`, `480`). |
| `maxWidth` / `maxHeight` | `string \| number` | *(none)* | Max dimension constraint. |
| `aspectRatio` | `string` | *(none)* | CSS aspect ratio (e.g. `"16/9"`, `"4/3"`, `"1/1"`). |
| `objectFit` | `string` | *(initial)* | Media object-fit (`"contain"`, `"cover"`, `"fill"`, `"none"`, `"scale-down"`). |
| `align` | `string` | `"center"` | Layout alignment: `"left"`, `"center"`, or `"right"`. |
| `rounded` / `radius` | `boolean \| string` | *(none)* | Border radius (`true`, `"sm"`, `"md"`, `"lg"`, `"full"`, or custom `"12px"`). |
| `shadow` | `boolean \| string` | *(none)* | Box shadow (`true`, `"sm"`, `"md"`, `"lg"`, or custom shadow string). |
| `border` | `boolean \| string` | *(none)* | Border (`true` for theme border or custom CSS border). |
| `caption` | `string` | `""` | Caption text rendered in a `<figcaption>`. |
| `captionAlign` | `string` | `"center"` | Caption alignment (`"left"`, `"center"`, `"right"`). |
| `controls` | `boolean` | `true` | Show player playback controls for video and audio. |
| `autoplay` | `boolean` | `false` | Autoplay media playback. |
| `loop` | `boolean` | `false` | Loop media playback. |
| `muted` | `boolean` | `false` | Mute media audio output. |
| `playsinline` | `boolean` | `true` | Play inline on mobile devices. |
| `preload` | `string` | `"metadata"` | Audio/video preload strategy (`"auto"`, `"metadata"`, `"none"`). |
| `embed` | `string \| boolean` | *(auto)* | Embedding mode during offline build: `"base64"` (default), `"inline"` (raw SVG), or `"none"` / `false` to opt out. |
| `zoomable` | `boolean` | `false` | Interactive click-to-zoom for images. |

---

## 🗺️ Next Steps

Continue along the linear documentation journey:

<CardGrid cols={2}>
  <Card
    title="Custom Components (.dmd)"
    description="Author interactive components using Svelte 5, React TSX, or Web Elements."
    href="#/guides/custom-components"
    badge="Next Up"
    badgeType="info"
  />
  <Card
    title="Mermaid Diagrams"
    description="Explore interactive architecture diagrams with automatic theme synchronization."
    href="#/guides/mermaid-diagrams"
    badge="Previous"
    badgeType="success"
  />
</CardGrid>
