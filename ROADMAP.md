# DocMeDown Roadmap: The Pure Svelte Architecture

> **A Unified Svelte Engine.** DocMeDown is transitioning to an end-to-end, compiler-oriented architecture powered exclusively by Svelte 5.
> We eliminate the dual-framework burden of Lit, bringing the same reactive, expressive, and lightweight authoring experience to both internal built-in components and community-authored `.dmd` widgets.
> With build-time AOT compilation for static sites and single-file offline bundles, paired with in-browser JIT compilation for dynamic deployments, DocMeDown delivers unparalleled developer ergonomics and sub-millisecond document performance.

---

## The Vision: Svelte Everywhere

### 1. Why Pure Svelte?

In earlier versions, DocMeDown relied on React and TSX for its runtime and widget interfaces. While expressive, React required a heavy virtual DOM runtime, substantial client bundles, and complex hydration logic. We migrated the app shell to Svelte 5, drastically cutting runtime overhead and unlocking instantaneous page routing.

However, an architectural compromise remained: **built-in components (`<Card>`, `<Tabs>`, `<Alert>`) and custom `.dmd` components were built using Lit (Web Components)**.

This created clear drawbacks:
- **Dual Framework Overhead**: Shipping both Svelte 5 runtime primitives and the Lit 3.3 runtime added unnecessary kilobytes to every bundle.
- **Degraded Developer Experience (DX)**: Target documentation authors were forced to write imperative Web Components (`class extends HTMLElement`, `connectedCallback()`, manual attribute parsing, slot change listeners) instead of simple, modern, declarative components.
- **Styling Friction**: Managing shared theme variables across Shadow DOM boundaries or manually managing light-DOM styles required complex boilerplate.

### 2. Svelte as a Runtime-Loadable Intermediate Representation

Svelte fits the dynamic documentation model more naturally than any other framework because **Svelte is fundamentally a compiler**:
- `.svelte` source compiles directly into highly specialized JavaScript instructions that surgically manipulate the DOM.
- There is no heavy virtual DOM diffing engine; runtime primitives are minimal helpers from `svelte/internal/client`.
- Svelte's compiler is pure JavaScript and runs natively inside the browser (powering the official Svelte Playground).
- Scoped CSS is built into the compilation step, guaranteeing zero style leakage without Shadow DOM encapsulation headaches.

By adopting Svelte across the entire stack, DocMeDown treats `.svelte` source code as an **on-demand, runtime-loadable intermediate representation**.

---

## Architectural Pillars

### 1. In-Browser Dynamic Compilation & Module Linker
For serve-able documentation websites, live dev servers, and remote GitHub repositories, DocMeDown implements a tiny, high-performance in-browser compiler pipeline:

```
Splash Screen
    │
    ▼
Load Svelte Compiler (`svelte/compiler`)
    │
    ▼
Fetch `.svelte` Component Sources (`.dmd/*.svelte` or manifest)
    │
    ▼
┌────────────────── Hash Cache Check ──────────────────┐
│                                                      │
│  Match SHA-256 against IndexedDB                     │
│  ├── [HIT]  ──► Load compiled ESM chunk from storage │
│  └── [MISS] ──► compile(source, { generate: "client" })
│                   ↓                                  │
│                 Persist compiled ESM to IndexedDB    │
└──────────────────────────────────────────────────────┘
    │
    ▼
Dynamic Module Linker
    ├── Rewrite `svelte` & `svelte/internal/client` to exposed runtime primitives
    ├── Recursively fetch and compile imported sibling `.svelte` components
    └── Create ESM Blob URLs (`URL.createObjectURL(new Blob([code], { type: "text/javascript" }))`)
    │
    ▼
Evaluate via `import(blobUrl)` & Mount via Svelte 5 `mount()`
    │
    ▼
Crossfade Splash Screen & Reveal Ready Application
```

#### Erasable TypeScript Dialect
Runtime components support `<script lang="ts">` directly, strictly scoped to **erasable TypeScript**:
- Interfaces and type aliases
- Variable and function type annotations
- Generics and type assertions (`as Type`)
- `import type` declarations

Because erasable TypeScript requires no semantic AST transforms or full `tsc` pipelines, Svelte's compiler strips type annotations instantaneously in the browser.

### 2. Static-First Engine & Single-File AOT Parity
DocMeDown maintains strict 100% visual and functional parity across all output modes:

1. **Static-Served Sites (`dmd build`)**:
   - Prerenders every Markdown document into static HTML (`<slug>/index.html`).
   - SEO metadata, Open Graph, Twitter cards, JSON-LD, sitemap, and AI context (`llms.txt`, `llms-full.txt`, `SKILL.md`, `okf.json`).
   - Precompiles all `.dmd/*.svelte` components Ahead-Of-Time (AOT) using Node.js during the build step.
2. **Single-File Offline Bundles (`.dist/index.html`)**:
   - A single, self-extracting, air-gapped HTML file with a gzip-compressed payload.
   - **Crucial Optimization**: Because custom `.svelte` components are pre-compiled during `dmd build`, the single-file offline artifact **does not need to bundle `svelte/compiler`**.
   - Offline bundles save ~800 KB of compiler weight while rendering identical reactive Svelte components.
3. **Drop-in / Dynamic Mode**:
   - Compiles `.svelte` components Just-In-Time (JIT) using the in-browser compiler, falling back gracefully when pre-built artifacts are unavailable.

---

## Architectural Comparison

| Dimension | React + TSX (Legacy) | Lit Web Components (0.3.0a) | Pure Svelte 5 (Target) |
| :--- | :--- | :--- | :--- |
| **Runtime Engine** | React + ReactDOM (~130 KB gzip) | Lit 3.3 (~16 KB gzip) + Svelte | Shared Svelte 5 runtime (~8 KB gzip) |
| **Component Source** | `.tsx` | TypeScript classes (`.ts`) | Declarative `.svelte` |
| **Authoring DX** | High | Low (imperative DOM callbacks) | Exceptional (Runes, scoped CSS, snippets) |
| **Browser Compilation** | `esbuild-wasm` (~2.5 MB) | None (needs pre-bundling) | `svelte/compiler` (~200 KB gzip) |
| **Component Styles** | CSS modules or external CSS | Lit `css` tagged template | Native scoped `<style>` |
| **Reactivity Model** | Virtual DOM reconciliation | Property getters / requestUpdate | Fine-grained signals (Runes `$state`) |
| **Offline Footprint** | Heavy | Moderate | Featherweight (AOT precompiled) |
| **Import Resolution** | Bundler required | Native browser imports | Lightweight dynamic Blob linker |

---

## Milestones & Release Path

```
v0.3.0a ──────► v0.3.1-v0.3.x ──────► v0.4.0 ──────► v0.5.0 ──────► v0.6.0 ──────► v0.7.0 ──────► v0.8.0 ──────► v1.0.0
 (Alpha           (Svelte Builtins      (Runtime        (Custom .dmd    (Static AOT      (CLI &          (UX, A11y &     (Production
 Checkpoint)       & Lit Eviction)      Compiler)        Authoring)      Parity)         MCP)            Performance)     Release)
```

---

### v0.3.0a — Alpha Checkpoint (Current State)
*Shipped to GitHub as a safe, permanent baseline.*

- [x] **Svelte 5 runtime shell**: Runes-based reactive context, instant navigation cache, theme management.
- [x] **On-demand Mermaid engine**: Externalized `docmedown-mermaid.js` loaded lazily; critical path dropped to ~533 KB gzip.
- [x] **KaTeX font pruning**: Pruned legacy woff/ttf font formats, retaining woff2 and saving ~1 MB raw per bundle.
- [x] **App-shell splash preview**: Inline zero-dependency skeleton with theme bootstrap before first paint.
- [x] **Static site compilation**: Prerendered HTML pages, canonical URLs, JSON-LD, sitemap, robots.txt, and AI context files (`llms.txt`, `SKILL.md`, `okf.json`).
- [x] **Model Context Protocol (MCP)**: Native `docmedown mcp` stdio server.
- [x] **Test suite**: 155 automated tests passing (typecheck, lint, bundle budgets, offline artifacts).

---

### v0.3.x — Svelte Builtins & Complete Lit Eviction
**Goal:** Migrate all in-house Markdown components to Svelte 5 and remove Lit from dependencies.

- [ ] **Convert 18 built-in components from Lit to Svelte 5**:
  - [ ] `Alert.svelte` (note, info, tip, warning, caution, success, danger)
  - [ ] `Card.svelte` (title, description, footer, inferred Markdown heading chrome)
  - [ ] `CardGrid.svelte` & `carousel.svelte` (wrapping loop window, clone slides, swipe gestures)
  - [ ] `Tabs.svelte` & `Tab.svelte` (recessed, underline, pills, post-it notes, sync group IDs)
  - [ ] `Badge.svelte` & `Button.svelte`
  - [ ] `Columns.svelte` & `Details.svelte`
  - [ ] `Accordion.svelte` & `Item.svelte`
  - [ ] `Timeline.svelte` & `Step.svelte` / `Steps.svelte`
  - [ ] `Kbd.svelte`
- [ ] **Component Mounting Strategy**:
  - [ ] Leverage Svelte 5 custom element compilation (`<svelte:options customElement=... shadow="none" />`) or direct Svelte `mount()` in Markdown renderer.
  - [ ] Preserve light-DOM theme styling and slot projection.
- [ ] **Evict Lit from package**:
  - [ ] Remove `lit` from `package.json` dependencies.
  - [ ] Eliminate Lit styles and decorators.
  - [ ] Verify bundle size reduction in `tests/bundle-size.test.ts`.

---

### v0.4.0 — Runtime Svelte Compiler & Dynamic Module Linker
**Goal:** Enable in-browser compilation of `.svelte` files with dependency resolution and persistent caching.

- [ ] **In-Browser `SvelteRuntime` Module Loader**:
  - [ ] Lazy-load `svelte/compiler` during splash screen / background idle.
  - [ ] Implement `runtime.import(url)` for dynamic `.svelte` fetching and compilation.
  - [ ] Handle nested relative `.svelte` imports (e.g., `import Card from "./Card.svelte"` inside `Home.svelte`).
- [ ] **Dynamic ESM Blob Linker**:
  - [ ] Export runtime primitives (`svelte`, `svelte/internal/client`) to an internal module registry.
  - [ ] Rewrite bare imports in compiled code to point to exposed runtime blobs or window bindings.
  - [ ] Generate `Blob` URLs (`URL.createObjectURL`) for native browser `import()`.
- [ ] **SHA-256 + IndexedDB Compilation Cache**:
  - [ ] Compute hash of `.svelte` source code before compilation.
  - [ ] Store compiled JavaScript in IndexedDB keyed by `sha256(source)`.
  - [ ] Subsequent page visits and application restarts bypass compilation entirely.
- [ ] **Splash Lifecycle Synchronization**:
  - [ ] Keep splash preview active while initial critical components compile.
  - [ ] Smooth 400ms crossfade once critical components are ready.

---

### v0.5.0 — Developer Experience & Custom Component Authoring
**Goal:** Empower documentation authors to create rich, reactive `.svelte` components with zero build steps.

- [ ] **`.dmd/*.svelte` Discovery Convention**:
  - [ ] Automatically discover and register components placed in `.dmd/` (e.g. `.dmd/Counter.svelte` → `<Counter />`).
  - [ ] Support PascalCase and kebab-case tag invocation directly inside Markdown.
- [ ] **Erasable TypeScript Dialect**:
  - [ ] Full support for `<script lang="ts">` with interfaces and type annotations.
  - [ ] Clear runtime error reporting pointing to exact line/column of syntax errors.
- [ ] **Component Theme Integration**:
  - [ ] Direct access to CSS tokens (`--dmd-bg-card`, `--dmd-accent`, `--dmd-border-color`).
  - [ ] Reactive access to theme state (theme family, light/dark mode, density) via Svelte context or runes.
- [ ] **Backward Compatibility**:
  - [ ] Support legacy `components.js` custom elements alongside `.svelte` components.
  - [ ] Provide simple CLI codemod / migration guide to upgrade legacy components.

---

### v0.6.0 — Static Engine & Single-File AOT Parity
**Goal:** Full Ahead-of-Time compilation for static sites and ultra-lean single-file offline bundles.

- [ ] **Build-Time AOT Compiler**:
  - [ ] CLI scan of `.dmd/*.svelte` during `dmd build`.
  - [ ] Precompile all detected components to production ESM/CJS bundles.
  - [ ] Generate Server-Side Rendered (SSR) HTML for static prerendered pages.
- [ ] **Featherweight Single-File Offline Bundles**:
  - [ ] Embed precompiled Svelte component code into the compressed `.dist/index.html` envelope.
  - [ ] Omit `svelte/compiler` from offline single-file bundles (saving ~800 KB).
  - [ ] 100% offline reactivity, state preservation, and visual fidelity.
- [ ] **Differential Serving**:
  - [ ] Static builds load precompiled chunks without JIT compiler overhead.
  - [ ] Dynamic / local-serve mode seamlessly uses in-browser JIT compiler.

---

### v0.7.0 — CLI Diagnostics & MCP Productionization
**Goal:** Professional tooling, validation, and production-ready AI context integration.

- [ ] **CLI Diagnostics**:
  - [ ] `dmd validate [dir]`: Validate Markdown links, frontmatter, and `docs.json` schema.
  - [ ] `dmd doctor [dir]`: Diagnose Node version, missing assets, `.dmd` component compilation errors.
- [ ] **MCP Server Productionization**:
  - [ ] Comprehensive stdio transport integration tests.
  - [ ] SSE transport option (`--port`, `--allow-origins`).
  - [ ] Verify `npx -y docmedown mcp` zero-install invocation.

---

### v0.8.0 — UI/UX Overhaul, Accessibility & Core Web Vitals
**Goal:** Flawless reading experience on all viewports, full accessibility, and Lighthouse 90+.

- [ ] **Refined UI & Micro-Animations**:
  - [ ] Structural shimmer skeletons matching article layout.
  - [ ] Mobile navigation drawer with swipe gestures.
  - [ ] Debounced search with match highlighting and recent queries.
  - [ ] Sticky breadcrumbs, smooth scroll-spy TOC, and interactive code copy feedback.
- [ ] **Accessibility (WCAG 2.1 AA)**:
  - [ ] Focus trap and restoration in search modal and mobile drawer.
  - [ ] Skip-to-content navigation link.
  - [ ] Systematically verified contrast ratios across all theme families (Atlas, Blueprint, Terminal, Editorial).
- [ ] **Performance Benchmarks**:
  - [ ] Largest Contentful Paint (LCP) < 2.0s.
  - [ ] Cumulative Layout Shift (CLS) < 0.05.
  - [ ] First Input Delay (FID) / Interaction to Next Paint (INP) < 150ms.

---

### v1.0.0 — Production General Availability
**Goal:** Rock-solid production release meeting all stability, performance, and ecosystem criteria.

- [ ] **Zero-Lit Footprint**: Entire runtime and component ecosystem powered exclusively by Svelte 5.
- [ ] **Bundle Budget**:
  - [ ] Served runtime: < 500 KB gzip initial.
  - [ ] Single-file offline bundle: < 1.2 MB gzip total.
- [ ] **Full Test Coverage**: ≥ 180 tests covering CLI, static compiler, Svelte runtime, offline envelopes, and MCP server.
- [ ] **Complete Documentation**: Comprehensive API references, migration guides from Docusaurus/VitePress, and deployment tutorials.
- [ ] **Community Verification**: Validated in production across diverse open-source and enterprise documentation sites.
