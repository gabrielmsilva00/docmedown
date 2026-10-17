# DocMeDown Roadmap: Universal Svelte Architecture & Multi-Framework Compatibility

> **A Unified Svelte Engine with Universal Component Interoperability.** DocMeDown is powered end-to-end by an application shell and built-in components built exclusively with Svelte 5.
> Building on this foundation, DocMeDown introduces a **Universal Component Compatibility Layer**: documentation authors can write custom `.dmd` widgets in **native Svelte 5**, **React with TypeScript (TSX)**, or standard **Web Elements (Lit)**.
> Using a **Hybrid Compiler + Adapter** architecture, standard React TSX components are compiled Ahead-of-Time into native Svelte 5 custom elements at build time for maximum performance and a featherweight footprint, while runtime adapters (`ReactBridge`, `ElementBridge`) and in-browser TSX/TS compilers guarantee 1:1 behavioral parity for arbitrary components.

---

## Native internationalization — delivery status (2026-10-16)

- [x] Filename-suffix variants (`guide.pt-br.md`), configurable originals, canonical
  language tags, locale routes, fallback notices, navigation/search isolation and
  physical-source tracking. Directories remain categories.
- [x] Six curated language presets: English, Brazilian Portuguese, Spanish,
  French, German and Simplified Chinese. Interactive creation supports selection,
  original-language choice and additional named language tags.
- [x] Engine-provided `DMD` and `DMD/for-developers` guides have six authored language
  versions, project-language export selection and unconditional English fallback.
- [x] Local, remote-source and offline reader lookup for built-in guides;
  configured guide variants are prerendered with hidden/noindex metadata.
- [x] Served runtime raw budget approved at **1.5 MiB**; its gzip budget remains
  **480 KiB**. Other bundle budgets remain unchanged.
- [ ] Complete translation of **every existing documentation page** into all six
  preset languages, including the configuration/CLI references, technical guides,
  nested examples and repository-facing contributor documents. Native fallback is
  not translation coverage; do not mark this milestone complete from configuration alone.
- [ ] Extract every remaining reader/editor/component message into the UI catalog
  and translate it for all six presets.
- [ ] Finish keyboard/mobile/theme browser checks and cross-mode release validation.

Language setup does not machine-translate a user's project. Future language packs
should follow the existing suffix mechanism and preserve the English DMD fallback.
See the internationalization guide (`docs/guides/internationalization.md`).

## The Vision: Svelte as Host, Multi-Framework at the Edge

### 1. Svelte Shell with Universal Interoperability

In earlier versions, DocMeDown relied on React and TSX for its runtime shell. We migrated the shell and all built-in components to pure Svelte 5, drastically cutting runtime overhead, eliminating virtual DOM diffing, and unlocking instantaneous page routing.

However, modern engineering teams maintain vast component libraries in **React** and **Web Components (Lit)**. Forcing authors to rewrite mature widgets into Svelte creates adoption friction.

DocMeDown solves this by turning Svelte 5 into the **host and component orchestration layer**, while Svelte, React, Lit, and native Custom Elements become interchangeable implementation backends.

### 2. The Hybrid Compiler + Adapter Pipeline

Rather than relying solely on lossy source-to-source transpilers or heavy runtime wrappers, DocMeDown implements a **hybrid compiler + adapter architecture**:

```
React TSX / Lit TS / Svelte
           │
           ▼
    Framework Detection
┌──────────────────────────────────────────────┐
│ React (Standard) ──► React-to-Svelte AOT     │ ──► Native Svelte 5 Custom Element (0 KB React)
│ React (Complex)  ──► ReactBridge Adapter     │ ──► React 18 createRoot() + Full Hook Parity
│ Lit / Web Element──► ElementBridge Adapter   │ ──► Native Custom Elements & Property Sync
│ Svelte 5 (.svelte)─► Svelte Compiler         │ ──► Native Svelte 5 Custom Element
└──────────────────────────────────────────────┘
           │
           ▼
  Unified Component API (<Dynamic component={...} />)
           │
           ▼
  Svelte Application Host & Browser DOM
```

- **Build-Time Svelte Base Conversion**: At build time (`dmd build`), standard React TSX components (`useState`, `useEffect`, props, JSX) are semantically converted into native Svelte 5 custom elements. React and ReactDOM are omitted from the production bundle, attaining **maximum performance and minimal distributable size** (both in single-file offline HTML and serveable sites).
- **Runtime Component Translation Layer**: When React components use advanced hooks (`useContext`, `useReducer`, third-party React libraries) that cannot be cleanly transpiled, the `ReactBridge` mounts them inside a custom element facade using React's official `createRoot()` container lifecycle. The React component retains 100% semantic fidelity, while `root.unmount()` provides leak-free cleanup on element disconnect.
- **Web Elements / Lit Interoperability**: Lit components are standard Custom Elements. Svelte renders them natively (`<user-card />`), while `ElementBridge` normalizes HTML attributes, JS property reflection, slot projection, and CustomEvent bubbling.

---

## Architectural Pillars

### 1. In-Browser Dynamic Compilation & Persistent Caching
For serve-able documentation websites, live dev servers, and remote GitHub repositories, DocMeDown implements an on-demand in-browser compiler pipeline supporting `.svelte`, `.tsx`, `.jsx`, and `.ts`:

```
Component Source (.svelte / .tsx / .ts)
                 │
                 ▼
┌────────────────── Hash Cache Check ──────────────────┐
│                                                      │
│  Match SHA-256 against IndexedDB                     │
│  ├── [HIT]  ──► Load compiled ESM chunk from storage │
│  └── [MISS] ──► Compile (Svelte 5 / TSX transpile)   │
│                   ↓                                  │
│                 Persist compiled ESM to IndexedDB    │
└──────────────────────────────────────────────────────┘
                 │
                 ▼
Dynamic Module Linker & Bridge Adapter
├── ReactBridge: createRoot() + prop synchronization
├── ElementBridge: property reflection + event bubbling
└── Svelte Linker: wire window.__DOCMEDOWN_SVELTE__
                 │
                 ▼
Evaluate via import(blobUrl) & Upgrade Custom Element
```

### 2. Static-First Engine & Single-File AOT Parity
DocMeDown maintains strict 100% visual and functional parity across all output modes:

1. **Static-Served Sites (`dmd build`)**:
   - Prerenders every Markdown document into static HTML (`<slug>/index.html`).
   - SEO metadata, Open Graph, Twitter cards, JSON-LD, sitemap, and AI context (`llms.txt`, `llms-full.txt`, `SKILL.md`, `okf.json`).
   - Scans `.dmd/` for `.svelte`, `.tsx`, `.jsx`, `.ts`, `.js`.
   - Converts React TSX components into Svelte base when possible, bundles complex React via ReactBridge, and compiles all components synchronously to ESM chunks.
2. **Single-File Offline Bundles (`.dist/index.html`)**:
   - A single, self-extracting, air-gapped HTML file with a gzip-compressed payload.
   - **Crucial Optimization**: Because custom components are pre-compiled during `dmd build`, the single-file offline artifact **does not need to bundle `svelte/compiler` or runtime TSX compilers** (saving ~800 KB+).
   - Offline bundles retain full multi-framework interactivity with minimal byte footprint.
3. **Drop-in / Dynamic Mode**:
   - Compiles `.svelte`, `.tsx`, and `.ts` components Just-In-Time (JIT) using the in-browser compiler with IndexedDB caching, falling back gracefully when pre-built artifacts are unavailable.

---

## Architectural Comparison

| Dimension | Pure Svelte 5 Only | Dual-Framework Lit (Legacy) | Universal Host + Multi-Framework (Current) |
| :--- | :--- | :--- | :--- |
| **Host Runtime** | Svelte 5 (~8 KB gzip) | Lit 3.3 (~16 KB) + Svelte | Featherweight Svelte 5 host shell |
| **Component Support**| Only `.svelte` | Lit Web Components | **Svelte 5, React TSX, Web Elements / Lit** |
| **React TSX DX** | Not supported | Not supported | **1:1 React hook parity + full TypeScript logic** |
| **Build-Time AOT** | `.svelte` to custom element | None | **Converts React TSX to native Svelte base** |
| **Runtime Fallback** | Dynamic JIT Svelte | Manual scripts | **`ReactBridge` (`createRoot`) & `ElementBridge`** |
| **In-Browser Cache** | In-memory | None | **SHA-256 + IndexedDB persistent cache** |
| **Offline Footprint**| Lean (~570 KB gzip) | Moderate | **Featherweight (AOT Svelte-base precompiled)** |

---

## Milestones & Release Path

```
v0.3.0a ──► v0.3.1-v0.3.x ──► v0.4.0 ──► v0.5.0 ──► v0.6.0 ──► v0.7.0 ──► v0.8.0 ──► v0.9.0 ──► v1.0.0-rc01 ──► v1.0.0
 (Alpha       (Svelte Builtins  (Runtime    (Custom      (Static AOT  (CLI &      (UX, A11y &  (Next-Gen    (Release        (Production
 Checkpoint)   & Lit Eviction)  Compiler)    .dmd)       Parity)      MCP)        Perf)        DX & HMR)    Candidate 1)    Release)
```

---

### v0.3.0a — Alpha Checkpoint (Released)
*Shipped to GitHub as a safe, permanent baseline.*

- [x] **Svelte 5 runtime shell**: Runes-based reactive context, instant navigation cache, theme management.
- [x] **On-demand Mermaid engine**: Externalized `docmedown-mermaid.js` loaded lazily; critical path dropped to ~533 KB gzip.
- [x] **KaTeX font pruning**: Pruned legacy woff/ttf font formats, retaining woff2 and saving ~1 MB raw per bundle.
- [x] **App-shell splash preview**: Inline zero-dependency skeleton with theme bootstrap before first paint.
- [x] **Static site compilation**: Prerendered HTML pages, canonical URLs, JSON-LD, sitemap, robots.txt, and AI context files (`llms.txt`, `SKILL.md`, `okf.json`).
- [x] **Model Context Protocol (MCP)**: Native `docmedown mcp` stdio server.
- [x] **Test suite**: 155 automated tests passing (typecheck, lint, bundle budgets, offline artifacts).

---

### v0.3.1 — Svelte Builtins & Complete Lit Eviction (Released)
**Goal:** Migrate all in-house Markdown components to Svelte 5 and remove Lit from dependencies.

- [x] **Convert 19 built-in components from Lit to Svelte 5**:
  - [x] `Alert.svelte` & `Callout.svelte` (note, info, tip, warning, caution, success, danger)
  - [x] `Card.svelte` (title, description, footer, inferred Markdown heading chrome)
  - [x] `CardGrid.svelte` & `carousel.ts` (wrapping loop window, clone slides, swipe gestures)
  - [x] `Tabs.svelte` & `Tab.svelte` (recessed, underline, pills, post-it notes, sync group IDs)
  - [x] `Badge.svelte` & `Button.svelte`
  - [x] `Columns.svelte` & `Column.svelte`
  - [x] `Details.svelte`
  - [x] `Accordion.svelte` & `AccordionItem.svelte` & `Item.svelte`
  - [x] `Timeline.svelte` & `TimelineItem.svelte` & `Step.svelte` / `Steps.svelte`
  - [x] `Kbd.svelte`
- [x] **Component Mounting Strategy**:
  - [x] Leverage Svelte 5 custom element compilation (`<svelte:options customElement={{ tag: "dmd-..." }} />`) with shadow root style adoption via `adoptSharedStyles`.
  - [x] Preserve theme styling and slot projection across variants.
- [x] **Evict Lit from package**:
  - [x] Remove `lit` from `package.json` dependencies.
  - [x] Eliminate Lit styles and decorators.
  - [x] Verify bundle size reduction in `tests/bundle-size.test.ts`.
- [x] **Test suite optimization**:
  - [x] Consolidated bloated micro-tests across built-ins, splash, theme schema, and loaders into 106 high-signal tests.

---

### v0.4.0 — Universal Runtime Component Layer & Dynamic Linker (Completed)
**Goal:** Enable multi-framework in-browser compilation and execution for Svelte 5, React TSX, and Web Elements (Lit).

- [x] **Universal Runtime Bridge Architecture**:
  - [x] `createReactBridge`: mounts arbitrary React components via React 18 `createRoot()`, supporting full React hooks (`useState`, `useEffect`, `useContext`, `useReducer`), reactive attribute synchronization, custom event dispatching, and `root.unmount()` teardown.
  - [x] `createElementBridge`: wraps Custom Elements and Lit components with normalized property reflection, shadow root style adoption, and event bubbling.
  - [x] `detectComponentKind` & unified `DynamicComponent` API (`kind: 'svelte' | 'react' | 'element'`).
- [x] **In-Browser `SvelteRuntime` & Dynamic TSX Compiler**:
  - [x] Dynamic TSX/TypeScript transpile engine (`compileTsx`) for live dev server and browser compilation.
  - [x] On-demand engine bundle for `svelte/compiler` (`dist/docmedown-compiler.js`, 834 KB).
  - [x] Implement dynamic `.svelte`, `.tsx`, and `.ts` fetching, compiling, and custom element registration.
- [x] **Dynamic ESM Blob Linker**:
  - [x] Export runtime primitives (`svelte`, `svelte/internal/client`) to `window.__DOCMEDOWN_SVELTE__`.
  - [x] Rewrite bare imports in compiled code to point to exposed runtime primitives (`linkSveltePrimitives`).
  - [x] Generate `Blob` URLs (`URL.createObjectURL`) for native browser `import()`.
- [x] **SHA-256 + IndexedDB Compilation Cache**:
  - [x] Compute cryptographic SHA-256 hash of component source code before compilation.
  - [x] Store compiled JavaScript in IndexedDB (`DocMeDownComponentCache`) keyed by `sha256(source + salt)`.
  - [x] Subsequent page visits and application restarts bypass compilation entirely.

---

### v0.5.0 — Multi-Framework Custom Component Authoring & DX (Completed)
**Goal:** Empower documentation authors to create rich, reactive components in Svelte 5, React TSX, or Web Elements with zero build steps.

- [x] **Multi-Framework `.dmd/` Discovery Convention**:
  - [x] Automatically discover and register `.svelte`, `.tsx`, `.jsx`, `.ts`, and `.js` components placed in `.dmd/` (e.g. `.dmd/ReactMetricCard.tsx` → `<ReactMetricCard />`, `.dmd/LitStatusBadge.ts` → `<LitStatusBadge />`).
  - [x] Support PascalCase and kebab-case tag invocation directly inside Markdown.
- [x] **Full TypeScript Logic Support**:
  - [x] Full support for `<script lang="ts">` in Svelte 5.
  - [x] Full support for typed interfaces, generic props, and TypeScript logic in React TSX components.
- [x] **Component Theme Integration**:
  - [x] Direct access to CSS tokens (`--dmd-bg-card`, `--dmd-accent`, `--dmd-border-color`).
  - [x] Host block-level display layout (`:host { display: block; }`).
- [x] **Backward Compatibility**:
  - [x] Support legacy `components.js` custom elements alongside Svelte and React components.

---

### v0.6.0 — Static Engine, Build-Time Svelte Base Conversion & AOT Parity (Completed)
**Goal:** Full Ahead-of-Time compilation for static sites and ultra-lean single-file offline bundles with zero React runtime overhead.

- [x] **Build-Time React-to-Svelte Base Compiler (`convertReactToSvelte`)**:
  - [x] Automatic semantic conversion of standard React TSX components (`useState`, `useEffect`, props, JSX) into native Svelte 5 custom elements.
  - [x] Eliminates React and ReactDOM from production bundles, achieving maximum performance and minimum file size.
  - [x] Seamless fallback to `ReactBridge` bundling for arbitrary/complex React components with 100% behavioral parity.
- [x] **Build-Time Multi-Framework AOT Compiler**:
  - [x] CLI scan of `.dmd/*.{svelte,tsx,jsx,ts,js}` during `dmd build`.
  - [x] Precompile all detected components synchronously into custom element ESM modules via `svelte/compiler` and `esbuild`.
  - [x] Auto-derive canonical `dmd-<kebab>` tags from component filenames.
- [x] **Featherweight Single-File Offline Bundles**:
  - [x] Embed precompiled multi-framework component code into `_docs.js` and the compressed `.dist/index.html` envelope.
  - [x] Omit `svelte/compiler` and runtime compilers from offline single-file bundles (saving ~800 KB+).
  - [x] 100% offline reactivity, state preservation, and visual fidelity.
- [x] **Differential Serving**:
  - [x] Static builds load precompiled chunks without JIT compiler overhead.
  - [x] Dynamic / local-serve mode seamlessly uses on-demand in-browser compiler.

---

### v0.7.0 — CLI Diagnostics & MCP Productionization (Completed)
**Goal:** Professional tooling, validation, and production-ready AI context integration.

- [x] **CLI Diagnostics**:
  - [x] `dmd validate [dir]`: Validate Markdown links, frontmatter, and `docs.json` schema.
  - [x] `dmd doctor [dir]`: Diagnose Node version, missing assets, `.dmd` component compilation errors.
- [x] **MCP Server Productionization**:
  - [x] Comprehensive stdio transport integration tests.
  - [x] SSE transport option (`--port`, `--allow-origins`).
  - [x] Verify `npx -y docmedown mcp` zero-install invocation.

---

### v0.8.0 — UI/UX Overhaul, Accessibility & Core Web Vitals (Completed)
**Goal:** Flawless reading experience on all viewports, full accessibility, and Lighthouse 90+.

- [x] **Refined UI & Micro-Animations**:
  - [x] Structural shimmer skeletons matching article layout.
  - [x] Mobile navigation drawer with swipe gestures.
  - [x] Debounced search with match highlighting and recent queries.
  - [x] Sticky breadcrumbs, smooth scroll-spy TOC, and interactive code copy feedback.
- [x] **Accessibility (WCAG 2.1 AA)**:
  - [x] Focus trap and restoration in search modal, mobile drawer, and editor modal.
  - [x] Skip-to-content navigation link.
  - [x] Systematically verified contrast ratios across all theme families (Atlas, Blueprint, Terminal, Editorial).
- [x] **Performance Benchmarks**:
  - [x] Largest Contentful Paint (LCP) < 2.0s.
  - [x] Cumulative Layout Shift (CLS) < 0.05.
  - [x] First Input Delay (FID) / Interaction to Next Paint (INP) < 150ms.

---

### v0.9.0 — Next-Gen DX: Live HMR, 2-Way Markdown Editing & Staged Previews (Completed - Current Baseline)
**Goal:** Supercharge developer and documentation author velocity with zero-reload updates, in-browser live editing, and preview staging.

- [x] **True In-Place Hot-Reload (HMR)**:
  - [x] Zero-page-reload document updates over WebSocket without losing scroll position, expanded callouts, or active tabs.
  - [x] Targeted `hmr:update` and `hmr:config` payload events streamed directly from dev server file watcher.
  - [x] Dynamic in-memory loader cache invalidation via `localLoader.setDocContent()`.
  - [x] Reactive Svelte 5 document updates (`updateDocContent`, `applyHmrUpdate`) updating `MarkdownBody` and `TableOfContents` in-place.
- [x] **2-Way Markdown In-Browser Editing**:
  - [x] Interactive in-browser split-view Markdown editor modal (`Ctrl+E` / `⌘E` shortcut and navbar pencil action).
  - [x] Live keystroke Markdown parsing and split-view preview rendering.
  - [x] Direct persistence to source files (`POST /__dmd_api__/save` target: `source`).
  - [x] Keyboard accessibility: `Ctrl+S` / `Cmd+S` to save, `Esc` to close, `Tab` indentation handling.
- [x] **Staged Previews & Differential Serving**:
  - [x] Staged `.preview/` directory persistence (`POST /__dmd_api__/save` target: `preview`).
  - [x] Dev server preview mode toggle (`--preview`, `--mode <preview|production>`, or in-browser switch).
  - [x] Differential static file resolution: `.preview/` documents transparently overlay source files when in preview mode.
  - [x] In-browser preview management: One-click "Publish Preview" (`POST /__dmd_api__/publish-preview`) and "Discard Preview" (`POST /__dmd_api__/discard-preview`).
- [x] **Rich In-Line Block Editing**:
  - [x] Click-to-edit inline headings and callouts.
  - [x] Markdown table visual editor.
  - [x] Frontmatter metadata form editor with schema validation.
- [x] **Automatic Root Markdown Detection & Unified Default Linking**:
  - [x] Auto-detect markdown files directly at project root (`README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `ROADMAP.md`, etc.) upon running `docmedown`.
  - [x] Link root markdown files directly into the default `./docs/` folder without creating an artificial `./docs/` folder subdivision.
  - [x] Full watcher, live HMR, and build pipeline integration for linked root documents with transparent fallback to hard links or copies.
  - [x] Automated stale symlink cleanup on document removal or rename.
- [x] **Interactive Scaffold Tree Preview & Confirmation Prompt**:
  - [x] Visual directory preview tree rendered in `docmedown init` and quickstart mode before file creation.
  - [x] Interactive confirmation prompt with `-y, --yes` flag support for non-interactive and CI environments.
  - [x] Automated project name and description detection from `package.json` for customized initialization.

---

### v1.0.0-rc01 — Release Candidate 1 (Next Step: Stabilization & Dogfooding)
**Goal:** Rigorous real-world validation, ecosystem stabilization, bug hardening, and zero-defect triage to guarantee v1.0.0 GA is truly bug-free.

- [ ] **Ecosystem Dogfooding & Cross-Platform Validation**:
  - [ ] Validate on complex enterprise repositories with deep document hierarchies and hundreds of markdown pages.
  - [ ] Cross-browser validation (Chrome, Firefox, Safari, Edge, mobile Safari/Chrome) ensuring zero CSS, layout, or font rendering glitches.
  - [ ] Verify full touch-gesture parity for mobile drawer navigation and `<CardGrid>` carousel swiping.
- [ ] **Multi-Framework Edge Case Hardening**:
  - [ ] Stress-test edge cases in `.dmd` custom components: nested React components within Svelte custom elements, complex hook dependencies, and SSR/AOT translation boundaries.
  - [ ] Benchmark IndexedDB dynamic compiler cache performance under concurrent component loads.
- [ ] **Deployment & Protocol Verification**:
  - [ ] Verify zero-configuration deployment across static hosts: GitHub Pages, Cloudflare Pages, Netlify, and Vercel.
  - [ ] Verify Model Context Protocol (MCP) clients (Claude Desktop, Cursor, Windsurf) across stdio and SSE transports in production environments.
  - [ ] Air-gapped single-file offline bundle verification on isolated environments without internet access.
- [ ] **Zero-Defect Release Gate**:
  - [ ] Immediate triage and hotfixing of any issues reported during the release candidate period.
  - [ ] Strict zero-known-bug policy before advancing to official 1.0.0 GA.

---

### v1.0.0 — Production General Availability
**Goal:** Rock-solid production release meeting all stability, performance, and ecosystem criteria.

- [x] **Zero-Lit Footprint**: Entire runtime and component ecosystem powered exclusively by Svelte 5.
- [x] **Bundle Budget**:
  - [x] Served runtime: < 500 KB gzip initial (`docmedown.web.js` at ~454 KB gzip).
  - [x] Single-file offline bundle: < 1.2 MB gzip total (self-contained offline `index.html` at ~647 KB gzip).
- [x] **Full Test Coverage**: ≥ 180 tests covering CLI, static compiler, Svelte runtime, offline envelopes, and MCP server (213 unit + 32 MCP integration tests passing 100%).
- [x] **Complete Documentation**: Comprehensive API references, migration guides from Docusaurus/VitePress, architecture blueprints, and deployment tutorials.
- [ ] **Release Candidate Promotion**: Successful completion and bug-free sign-off of v1.0.0-rc01.
- [ ] **Community Verification**: Validated in production across diverse open-source and enterprise documentation sites.

