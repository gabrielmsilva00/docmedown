# Changelog

All notable changes to DocMeDown are documented here.

## Unreleased

---

## 0.3.1 - 2026-09-21

### Added

- **Svelte 5 Built-in Custom Elements**: Replaced all 15 legacy Lit components with 19 first-class Svelte 5 custom element components (`Alert`, `Callout`, `Badge`, `Button`, `Card`, `CardGrid`, `Columns`, `Column`, `Details`, `Item`, `Kbd`, `Step`, `Steps`, `Tab`, `Tabs`, `Timeline`, `TimelineItem`, `Accordion`, `AccordionItem`). Built-in components compile directly with `<svelte:options customElement={{ tag: "dmd-..." }} />`, using modern Svelte 5 runes (`$state`, `$derived`, `$props`) and adopting shared design tokens via `adoptSharedStyles()`.

### Changed

- **Complete Lit Eviction**: Completely removed `lit` from runtime dependencies and eliminated all Lit decorators, styles, directives, and AST references. Zero Lit code remains in the codebase.
- **Test Suite Consolidation**: Streamlined and de-bloated test suites across built-in components (`tabs-builtin.test.ts`, `card-builtin.test.ts`), `splash.test.ts`, `theme-schema.test.ts`, `component-body.test.ts`, and `navigation.test.ts`. Reduced test count from 153 to 106 high-signal, comprehensive tests running in ~1.1s with zero regressions.

### Performance

- **Bundle Size Reductions**: Evicting Lit and standardizing on Svelte 5 reduced raw and gzipped bundle footprints across all distribution formats:
  - IIFE runtime: `4,228 KB` → `4,214 KB`
  - ESM bundle: `1,252 KB` → `1,240 KB`
  - CJS bundle: `1,052 KB` → `1,038 KB`
  - Web bundle: `1,098 KB` → `1,084 KB`

---

## 0.3.0a - 2026-09-21

### Added

- **App-shell splash preview.** Every generated shell — prerendered pages, the
  404 page, the dev-server fallback, and offline single-file copies — now opens
  on an inline preview of the real reader instead of a centered loader: a 64px
  top bar with the brand lockup (configured `theme.logo`, name, and version
  pill), a search pill, and a hairline progress indicator, above a navigation,
  article, and table-of-contents skeleton in the same proportions as the app.
  The skeleton carries per-family canvas/surface/border tones in both modes, a
  staggered entrance with a soft shimmer, and collapses at the same breakpoints
  as the reader (TOC under 1100px, sidebar under 1024px, compact bar under
  680px) — all dependency-free so it paints before any stylesheet or module
  loads. A tiny inline bootstrap resolves the saved family and color mode
  before first paint, so the shell never flashes light. It holds for a
  **0.95 s minimum**, then crossfades with the app (the page fades in as the
  shell lifts away), with a 9-second failsafe and a `<noscript>` fallback so
  JS-disabled readers see the prerendered content. The skeleton is fully
  `aria-hidden` behind a single `role="status"` live region. See
  `src/runtime/splash.ts`.

- **Markdown-driven card chrome.** A container-style `<Card>` — a card whose body
  is Markdown instead of props — now names itself from that body: the first
  heading above H3 (`## Container-style card`) becomes the title, the deeper
  heading right under it the subtitle, and a trailing blockquote (or an H6 note)
  the footer, so the same card reads correctly whether an author reached for
  props or for prose. Inferred chrome renders through the existing
  header/subtitle/footer markup, and an authored `title`, `description`, or
  `footer` always wins — its Markdown stays body copy. See
  `src/ui/builtins/card-outline.ts`.

### Performance

- **Instant page navigation.** When a document is already in memory — the
  embedded `_docs.js` corpus used by static and offline builds, or anything
  fetched earlier in the session — the router now renders it synchronously:
  a `peekDocContent()` lookup plus the synchronous markdown pipeline swap the
  page in the same frame as the click, with no `isLoading` flip, no skeleton,
  and no awaited microtask. The corpus is pre-parsed during idle time
  (time-sliced, bounded to 200 documents) so even the first visit to any page is
  a cache hit, remote-source fetches are cached so revisits are instant too, and
  genuine network navigations no longer blank the article — the current page
  stays on screen behind a slim top progress bar.

- **KaTeX's legacy font formats no longer ship in the runtime.** KaTeX bundles
  every math font three times (woff2, legacy woff, and TrueType) and Vite was
  inlining all three as base64 into the eagerly injected stylesheet — ~1 MB of
  redundant data on every page, math or not. A new Vite plugin
  (`pruneLegacyKatexFonts`) strips the woff/ttf sources and keeps only woff2,
  which every browser DocMeDown supports decodes. The ESM/CJS entries drop
  ~1.09 MB raw / ~0.68 MB gzip, the served `docmedown.iife.js` drops ~1.05 MB
  raw / ~0.67 MB gzip, and offline single-file copies shrink ~0.89 MB. Math
  renders identically.
- **Parsed-markdown cache.** Revisiting a document reuses its parsed HTML (LRU,
  50 entries keyed by slug) instead of re-running the marked + Prism + KaTeX
  pipeline; a changed source invalidates the entry.
- **Faster component upgrade.** `upgradeCustomComponents` walks the article with
  a `TreeWalker` and collects only elements that resolve to a registered
  component, instead of snapshotting every element with `querySelectorAll("*")`.
- **Smoother theme switching.** Flipping the theme family or light/dark mode no
  longer triggers a document-wide transition storm. A color-affecting switch
  flags `<html>` with `dmd-theme-switching`, so only the page canvas crossfades
  while descendant chrome adopts the new tokens on the next paint;
  `transition: all` was replaced across every interactive selector with an
  explicit `--dmd-transition-interactive` property list; `<html>` theme writes
  are diffed before they touch the DOM; `color-scheme` now tracks the resolved
  mode; and the Mermaid viewer skips re-renders whose palette is unchanged and
  debounces the rest so diagrams update after the fade instead of blocking it.
- **The served site no longer downloads Mermaid up front.** A dedicated
  `docmedown.web.js` runtime (from `vite.config.web.mts`) externalizes Mermaid
  behind the `__DMD_EXTERNAL_HEAVY__` build flag. The runtime injects the sibling
  `docmedown-mermaid.js` as a classic `<script>` on the first diagram render —
  a classic script rather than ESM so `file://` still works — and pages without a
  diagram never fetch the 938 KB gzip engine. The initial critical path drops
  from ~1,347 KB gzip to ~533 KB gzip. The self-contained IIFE is untouched and
  still backs offline single-file copies and the CDN, and `docmedown-mermaid.js`
  is only copied into a site's output when its corpus authors a Mermaid fence.
- **The served output no longer ships dead runtime files.** `build` stopped
  copying the monolithic IIFE and the ESM code-split chunks (never loaded by the
  served site) into every documentation root and prunes them from existing
  output, so the published `docs/` tree drops from ~25.5 MB to ~15.7 MB.

### Changed

- **Tabs visual polish and a real showcase.** The recessed tray's active chip now
  carries an accent-tinted fill, border, and glow (instead of a plain card surface),
  the pills indicator gained a layered accent glow plus an inset highlight, the
  underline variant tightened its tracking/hairline and dropped its card chrome
  margins, and post-it tabs are now individually colored notes: six pastel hues
  (`#fbbf24` amber, `#f472b6` pink, `#34d399` mint, `#38bdf8` sky, `#a78bfa`
  lilac, `#fb923c` peach) cycle per tab on a neutral desk pad — the bar itself no
  longer carries the amber wash. The wrapper reads as a softer, larger card
  (`--dmd-radius-lg`, taller buttons). The showcase's Tabs section was rebuilt
  from three bare examples into a per-variant tour — recessed, underline, pills, and
  post-it each get a usage fence and a live example, alongside a two-block synced
  `groupId` demo.

- **Card carousels now loop through every card.** The sliding window used to stop at
  the last position that still fitted, so the final card could only ever trail: a
  five-card, two-per-view grid walked `1-2`, `2-3`, `3-4`, `4-5` and the deck simply
  ended, leaving card 5 to lead a half-empty window (when it could lead one at all).
  A carousel now has one position per card and the window wraps — `1-2`, `2-3`,
  `3-4`, `4-5`, `5-1` — so every card leads a full window and the loop closes back
  onto the first. To keep the wrapped window full *and* make the last position
  reachable (the track has to extend past the final slide for its offset to be
  scrollable at all), the first `perView - 1` cards are duplicated after the real
  slides as `aria-hidden`/`inert` clone slides (`buildWrapClones` in
  `src/ui/builtins/carousel.ts`); `DmdCard`'s new `cloneCard()` carries an inferred
  title/subtitle/footer onto its duplicate, clones are excluded from the slide count
  and the scroll offsets, and the dots, prev/next, arrow keys, and the polite live
  region ("showing cards 5, 1 and 2 of 5") all count positions per card.

### Fixed

- **A block component opened at the start of a paragraph left an orphan `</p>`.**
  `marked` wraps a component's open tag plus the Markdown that follows it in one
  paragraph; `unwrapBlockComponents` dropped the opening `<p>` but kept the
  closing tag, which the browser then materialized as an **empty paragraph**
  between the component's first block children — a stray gap at the top of every
  heading-led container card. Both halves of the wrapper are now removed
  together, and the paragraph's own close tag is located by counting nested
  `<p>`/`</p>` pairs, so a paragraph *inside* a component body is never mistaken
  for the wrapper's.
- **Card carousels were completely inert and unscrollable.** The track's flex
  items were the raw `.dmd-card` boxes (the card hosts render `display: contents`),
  because the component never emitted the `.dmd-carousel-slide` wrappers the CSS
  sizes and snaps — so every card rendered at natural width, `scrollWidth` equaled
  `clientWidth`, and there was nothing to scroll. Two deeper bugs made the controls
  dead even with a working track: the viewport was bound with the attribute form
  `ref=${this._viewportRef}` instead of the Lit directive call
  `${ref(this._viewportRef)}` (so `_viewportRef.value` was never set and every
  viewport-dependent path early-returned), and offsets were read off the boxless
  hosts instead of the slides. Cards are now assigned onto named-slot
  `.dmd-carousel-slide` wrappers (real flex items, per-view sized, scroll-snap
  targets), the viewport is tracked with the `ref` directive, offsets come from the
  slides, and prev/next/dots scroll the viewport to the cached offset.
- **Pills tab indicator collapsed to 0 height.** The sliding indicator is an
  absolutely positioned flex child; the `align-self: center` I added made the
  browser resolve its cross size as `auto` (ignoring the `top`/`bottom` insets),
  so the accent pill rendered as a 0px-tall sliver — invisible, leaving the active
  label unreadable on the dark bar. `align-self` is gone; the indicator is anchored
  with `left: 0` + `top/bottom` insets and the pills row centers its buttons with
  `flex-start` + `::before`/`::after` spacers (a centered flex row would otherwise
  give the unanchored abspos child a centered static position and double-count the
  slack), so the pill hugs the active pill 1:1 in every state.
- **Code block copy button never worked.** The generated markup called
  `window.__dmdCopyCode`, which no runtime defined — clicking Copy silently did nothing.
  Copying is now handled by the runtime's markdown body via event delegation, with a
  `execCommand` fallback for non-secure contexts (offline `file://` copies), a "Copied"/"Failed"
  state that auto-reverts after two seconds, and a fixed button width so the label swap cannot
  shift the header layout.
- **Layout shift from state-based font-weight changes.** TOC entries, sidebar links, and tab
  buttons changed `font-weight` on hover/tap/activation, widening the label and re-wrapping its
  line (visible as jumping TOC entries while scrolling or touching them on mobile). All state
  emphasis is now metric-preserving — color, background, and accent bars only — and tab buttons
  render at a constant 600 weight so switching tabs no longer resizes them.
- **Tabs dropped icons, broke `<Item>` children, and hid content via `hidden`.**
  `DmdTab` never declared the `icon` prop the docs and `DmdItem` advertise, so tab icons
  never rendered; `<Tabs>` filtered its slot to `dmd-tab` only, so the documented
  `<Tabs><Item …>` pattern produced an empty header and an empty panel; and visibility
  was driven by the `hidden` attribute, which loses to the global `:host { display: contents }`
  rule and left every tab's content visible at once. Tabs now accept `<Item>` as a first-class
  child (shared label/value/icon contract), render the icon before the label, and drive
  visibility with inline `display` only — the active tab falls back to `:host`, all
  others are `display: none`.
- **Tabs differentiated into four visually unmistakable treatments.** `recessed` is a
  pressed well — the whole header inset from the wrapper edges on a darker surface with
  a strong inner shadow, active tab a raised chip; `underline` is chromeless — the
  wrapper drops its card border/shadow entirely, leaving uppercase micro-labels
  (700/0.76rem/0.09em tracking) over a hairline with a thick 3px sliding accent bar;
  `pills` is a centered floating segmented bar detached from the panel edges with a
  solid accent pill and on-accent label text; `postit` is a loud amber paper strip —
  opaque amber mixed into the tab surfaces (alpha washes vanish on dark themes) with
  alternately tilted (±2.2°/1.8°) folder tabs docking into the panel (`-1px` overlap,
  reduced-motion safe). Docs (`custom-components.md`, showcase) name each look explicitly.

### Changed

- **Modernized tabs with a sliding active indicator.** Every tab row now renders a
  single `dmd-tab-indicator` element that glides between tabs with a GPU-only
  `transform`/`width` transition: a raised tab in the recessed tray, a filled accent
  pill in the pills variant, and a 2.5px accent bar in the underline variant (replacing
  the old per-button static `::after` bars). `DmdTabs` measures the active button once
  per update (rAF-coalesced, ResizeObserver-robust — never in `render()`) and writes
  `--dmd-tab-ind-x`/`-w` CSS vars onto the header; the indicator scrolls with the tab
  row so it stays glued during horizontal overflow. Post-it tabs keep their physical
  sticky-note look (indicator hidden) and gain a transform transition; inactive recessed
  tabs lost their dated inset shadows, and `prefers-reduced-motion` disables the glide.
- **Runtime performance pass (Lit optimization hierarchy).** The reading-progress bar now
  schedules one update per animation frame and measures `scrollHeight` only on resize
  (previously a forced layout read on every scroll event). The card carousel caches its
  card offsets in a single batched layout pass and resolves the active card from the cache
  inside a rAF-throttled scroll handler (previously `offsetLeft` reads per event). Search
  input is debounced so the index search runs once per typing pause instead of once per
  keystroke. `DmdTabs` and `DmdAccordionItem` gained `shouldUpdate()` guards that skip
  update cycles for properties that never affect the template (`defaultindex`/`groupid`,
  `defaultopen`). The TOC scroll-spy no longer writes state for unchanged headings.
  Verified existing: Mermaid is already lazy-loaded via `import()` only when a diagram
  mounts (ESM build splits it into an on-demand chunk; the IIFE stays self-contained),
  Lit builtins share one static adopted stylesheet, and the sidebar tree is stable across
  navigations (no per-route rebuilds).
- **Visual refresh of code blocks (modern editor aesthetic).** Layered card surface
  (subtle top-light gradient + inner top highlight + ambient elevation), gradient header
  with an extension-colored file icon before the filename, a hairline separator between
  the line-number gutter and code, tabular line numbers, softer 8% accent tint with a 2px
  bar on highlighted lines, copy-button hover/press micro-interactions, a refreshed
  muted syntax palette (Tokyo Night inspired — violet keywords, green strings, cyan
  functions, warm-orange numbers), and a language pill subtly tinted with the language's
  palette color (matching the filename color for the same language).
- **Redesigned code blocks.** Line numbers via absolute-positioned CSS counters in
  a dedicated gutter, word-wrap (`white-space: pre-wrap`) so long lines never overflow,
  leading whitespace visualisation (grey · for spaces, → for tabs rendered as
  non-selectable CSS overlays over the real whitespace — copies and selections stay
  byte-identical to the source), `{n, n-m}` line-highlight syntax with full-bleed accent tint and
  accent bar, path-aware title rendering (directories dimmed, filename color-coded by
  extension), icon-only ghost copy buttons (no card-like container), a dedicated smaller
  "copy highlighted lines" button when active lines exist, removed the mac-style dots from
  the header, lighter border/shadow for a sleeker overall appearance, keyboard-focusable
  scrollable code (`tabindex` with a visible focus ring), and `type="button"` + `aria-label`
  + no inline `onclick` handler for cleaner semantics.

### Changed (BREAKING)

- **Version reset to 0.1.9.** The 1.0.0 release was premature — while the Svelte 5 port,
  static compilation, MCP server, and AI context files shipped successfully, the project
  lacks production-readiness in bundle size, UI/UX, performance, CLI tooling, and
  accessibility. See ROADMAP.md for the honest assessment and milestone plan.
- **ROADMAP.md completely rewritten** with grounded milestones and measurable release
  criteria instead of aspirational feature checklists.

## 1.0.0 - 2026-09-07 - Runtime v2 + The Counterattack (superseded)

### Changed (BREAKING)

- **Svelte 5 replaces React as the runtime UI.** The reader is now a compiler-oriented component
  tree (runes-based stores, no virtual DOM), with React and `react-dom` fully removed from the
  dependency tree. The IIFE bundle shrinks accordingly with identical features.
- **`.dmd` custom components are now custom elements.** `components.js` modules export a map of
  component name → `HTMLElement` subclass instead of React components; the runtime registers each
  as `dmd-<name>` and upgrades the PascalCase tags in Markdown automatically. `window.React` is no
  longer published. This makes user components framework-free and usable outside DocMeDown.
  All shipped examples and templates are migrated; see the Custom Components guide.
- **Offline bundle format bumped to version 2** (`OFFLINE_FORMAT_VERSION`): bundles produced by
  earlier versions must be rebuilt.

### Added

- **Static site prerendering**: every build now emits a complete prerendered page per document (`<slug>/index.html`, README → root `index.html`) with the full article HTML inlined, produced by the same markdown pipeline as the runtime. Crawlers and no-JS visitors see complete content.
- **SEO output**: per-page title, meta description (frontmatter `description` → first-paragraph fallback), canonical URL, Open Graph, Twitter card, JSON-LD `WebSite` + `TechArticle` structured data, and `noindex` frontmatter support. New `url` config field enables `sitemap.xml`, `robots.txt`, and absolute canonical/OG URLs.
- **Path-based routing on static builds**: new `StaticRouter` navigates with `pushState` over canonical URLs (GitHub Pages subpaths supported) while hash routing, script drop-in mode, remote GitHub/GitLab mode, and offline bundles behave exactly as before.
- **AI context files**: `llms.txt` (llmstxt.org format), `llms-full.txt`, `SKILL.md`, and a versioned `okf.json` machine bundle emitted on every build.
- **MCP server** (`docmedown mcp`): serves built documentation over the Model Context Protocol stdio transport with `list_docs`, `read_doc` (full markdown + headings + last-modified), `search_docs`, and `resolve_url` tools. Output shapes follow the tool surface requested by docmd users in docmd-io/docmd#221.
- `build --no-static` opt-out for prerendering and SEO/AI context files.
- New configuration field: `url` (canonical site origin).
- Public API additions: `ComponentRegistry`, `defineDmd`, `dmdTag`, and the reactive `doc`/`theme` stores.

### Fixed

- The watch-mode rebuild watcher no longer re-triggers itself on generated static artifacts (`index.html`, `404.html`, `sitemap.xml`, `robots.txt`, `llms*.txt`, `SKILL.md`, `okf.json`) at any depth.
- The scanner no longer ingests generated `SKILL.md` files as source documents (self-ingestion loop).

---

## 0.1.9 - 2026-09-06

### Added

- `npm run deploy` is now robust: it detects when you are not authenticated and walks you through logging in (opening npm's login page in the browser automatically — no manual Enter needed), then verifies the session before publishing. It also no longer requires npm credentials for `--dry-run` validation runs.

---

## 0.1.8 - 2026-09-06

### Added

- Extended built-in component library: `Alert`/`Callout` (eight semantic types), `Button` (five variants, three sizes, icons, loading and disabled states, link mode), `Kbd` (single keys and `+`-joined chords), `Details`, `Accordion`/`AccordionItem`, `Columns`/`Column`, and `Timeline`/`TimelineItem`. Everything stays zero-dependency and themed through `--dmd-*` tokens so all four theme families match.
- `Tabs` accepts `variant="underline" | "pills"` and `defaultIndex`; `Card` supports `image`, `imageAlt`, `footer`, and `danger`/`neutral` badge types; `Badge` supports `pill`, `dot` (pulsing status dot), and `icon` props.
- `Card` gains a `color` accent prop (named variants or any CSS color), an optional `title`, container-style Markdown/HTML bodies, and a `shadow` prop (default `true`) to toggle the drop shadow. `CardGrid` turns into a wrap-around carousel with prev/next buttons, position dots, and arrow-key cycling whenever it holds more cards than columns.
- `Steps` now auto-numbers steps (the `step` prop is optional), and both `Tabs` and `Steps` received a visual refresh — accent glow and adaptive-contrast markers/pills plus a gradient step connector, matching the `Card` treatment across every theme.
- `Badge` got a visual refresh: semantic types now derive their tint and a matching soft glow from a per-type color via `color-mix`, `pill` is now a real, distinct **outlined** chip variant (it was previously a no-op), and the pulsing `dot` core gained a crisp halo ring.
- `Alert` (and its `Callout` alias) now renders a colored icon chip + title header and a tinted, softly-glowing panel in the type's hue; GitHub-style `> [!NOTE]` callouts were styled to match, with per-type `--dmd-alert-color` / `--dmd-callout-color` tokens driving the accent, fill and glow.
- `Button` got the same polish: targeted transitions, a gentle press (`:active`) lift, theme-adaptive solid-button text (`var(--dmd-bg-card)` instead of hardcoded white, so it contrasts in dark themes), accent-glow shadows on primary, a color-mixed `danger` fill, and the `outline` hover clearing to a slightly deeper accent border.
- `Kbd` now renders as a proper keycap — a two-tone gradient face with a darker bottom edge, subtle inner highlight and shadow, plus a key-press (`:active`) dip where the bottom edge collapses and the key nudges down.
- `Accordion`/`AccordionItem` were enhanced: the panel stays mounted and slides open/closed via a `max-height`+`opacity` transition (with a `prefers-reduced-motion` fallback), the open trigger tints to the accent, and the chevron is now a subtle accent chip that rotates on toggle.
- `Columns`/`Column` are now responsive — grids collapse from N columns down to 3 → 2 → 1 as the viewport narrows — and gain a `type` prop with four treatments: `normal` (default, borderless/flush), `card` (elevated panel + hover lift), `recessed` (inset tray), and `neon` (accent outline + glow).
- `Timeline`/`TimelineItem` were refreshed to match Steps: filled accent dots with an adaptive center ring and soft glow (which scale up on hover), a gradient accent→border connector, the title tinting to the accent on hover, and the subtitle rendered as a compact accent-tinted pill.
- New universal **`<Item>`** child resolves to a container's designated child (Timeline→TimelineItem, Accordion→AccordionItem, Columns→Column, Steps→Step, CardGrid→Card, **Tabs→Tab**), inheriting all props; it travels upward to the nearest container even through intermediate wrappers, escalates to `<Cards>` inside `<CardGrid>`, is auto-numbered inside `<Steps>`, and falls back to an `<li>` when no container is present.
- `Tabs` gains a `type` prop (`recessed` default, plus `underline`, `pills`, `postit`) with `variant` kept as a legacy alias; `Tab` `label` is now optional so tabs can be icon-only (with an accessible derived name).
- The Markdown Syntax & Component Showcase now pairs every built-in component with a copy-paste source block directly above its live render, including a custom `.dmd/components.js` live widget demo and runtime language registration.

## 0.1.7 - 2026-08-30

### Added

- Self-contained offline bundles now embed every nested documentation site (`offline.embedNestedDocs`, enabled by default), so the root `.dist/index.html` opens subdocumentation without relative links or external files. Disabling embedding renders external file links as disabled, and every offline copy shows a startup limitations toast that expands into a detailed modal on click.

### Fixed

- The page map now renders inline Markdown in headings — badge images, links, inline code, and HTML entities — instead of raw syntax, while anchor IDs stay unchanged and search indexing plus document titles use the clean plain-text form.

## 0.1.6 - 2026-08-30

### Added

- A navbar **Home** action (with a home-aware brand link) and a `home` configuration field. Without configuration, home resolves from `README.md`, `PROJECT.md`, `ABOUT.md`, or `INDEX.md` at the documentation root — case-sensitive pass first, then case-insensitively — and finally the alphabetically first Markdown document. Documentation inside documentation links Home to the original (outermost) documentation site whenever an enclosing DocMeDown manifest is reachable, and nested roots may also set `home` to an explicit relative link.

### Fixed

- The navbar now enforces a single-line policy for every element: long search placeholders and brand titles truncate with ellipsis, keyboard shortcut chips never wrap, and dropdown panels opened from the navbar restore normal text flow.

## 0.1.5 - 2026-08-28

### Fixed

- Mermaid wheel panning now uses a non-passive listener attached directly to the graph stage, eliminating browser warnings while preserving camera movement and page-scroll handoff.
- Responsive shell breakpoints now transition as one system, preventing the collapsed page map from taking over the row and pushing article content offscreen between tablet and desktop widths.

### Changed

- Navigation, search, page maps, reading columns, touch targets, overlays, and short-landscape layouts now adapt across wide desktop, compact desktop, tablet, phone, coarse-pointer, and low-height viewports.
- `npm run deploy` now validates and commits tracked release changes automatically, patch-bumps already released versions, promotes Unreleased changelog notes, preserves a non-mutating dry run, rejects untracked files, and retries npm registry verification during propagation delays.

## 0.1.4 - 2026-08-28

### Changed

- Mermaid viewers now use wheel input for vertical camera panning and hand continued wheel or drag movement to document scrolling after the graph reaches its top or bottom camera bound, without exposing native scrollbars.

## 0.1.3 - 2026-08-28

### Added

- A collapsible mobile and tablet “On this page” outline that preserves heading navigation instead of hiding the table of contents on narrow screens.
- A theme-colored vertical reading-progress rail on mobile, while retaining the horizontal desktop progress indicator.
- Explicit mobile close actions and accessible expanded-state semantics for documentation navigation and search.

### Changed

- Mobile navigation now uses a safe-area-aware, dynamic-viewport drawer with background scroll locking, Escape dismissal, larger touch targets, and improved brand truncation.
- Search remains available as a compact navbar action on mobile and opens as a full-height, touch-friendly surface with larger result rows.
- Appearance controls use a mobile bottom panel, and narrow layouts now stack page navigation, metadata, and footer content more clearly.
- Code blocks, tables, tabs, diagrams, breadcrumbs, headings, and long technical strings now handle narrow viewports and horizontal overflow more reliably.

### Fixed

- Tablet and mobile readers no longer lose in-page navigation below the desktop table-of-contents breakpoint.
- Mobile overlays now account for dynamic viewport height and device safe areas without allowing the underlying document to scroll.

## 0.1.2 - 2026-08-27

### Added

- Four complete theme families—Atlas, Blueprint, Terminal, and Editorial—with light/dark/automatic color modes, comfortable/compact density, an in-product Appearance menu, and family-aware Mermaid palettes.
- An interactive Mermaid viewer with Fit and 1:1 controls, zoom, SVG download, expanded review, inline errors, responsive bounds repair, and automatic theme rerendering.
- Diagram edge-flow animation, token-aware node shadows, background drag panning, whole-graph Markdown copy, and per-node Markdown copy controls.
- Geometry and maintained-documentation regression coverage for diagram fitting, theme-family examples, and offline artifacts.
- A navbar Download action that locally packages the current serveable documentation and runtime into a self-contained offline HTML file without fetching `.dist` output; offline copies expose a disabled explanatory state.
- Mermaid viewers now open as square width-fitted inspection widgets, use pan-only navigation without native scrollbars, and provide icon-only Markdown copy controls for the complete graph and each subgraph.

### Changed

- Maintained documentation, starter templates, nested examples, and the live custom-component demo now use the `theme.family` and `theme.density` contract. Legacy accent-only presets are documented only as a temporary migration path.
- Tablet layouts now switch to the reading-first drawer shell before the persistent sidebar can squeeze diagrams and article content.
- Single-file offline artifacts now use compact JSON inside a gzip-compressed envelope and a minified native-stream self-extractor, substantially reducing distribution size while preserving `file:///` parity.

### Fixed

- GitHub Pages project sites now serve a complete documentation site out of the box: a dedicated Pages workflow builds the Git-ignored `_docs.js`, `_manifest.json`, and runtime bundle before upload, every build emits `.nojekyll` for branch-based static hosting, and the entrypoint keeps same-directory relative asset URLs so repository subpaths resolve correctly.
- Offline `.dist/index.html` bundles now load custom `.dmd/components.js` modules after React is available and bundle their relative JavaScript imports.
- Mermaid now ships inside the runtime, so diagrams render from `file:///` without a CDN request.
- Serveable and offline output now use the same local font stacks instead of relying on Google Fonts only in serveable HTML.
- Runtime builds clean stale chunks before packaging; the serveable and offline IIFE remains self-contained while ESM/CJS retain their required Mermaid chunks.
- Mermaid diagrams now reserve their real scaled layout size and repair incorrect emitted SVG bounds, preventing clustered flowcharts from clipping their final nodes.

## 0.1.1 - 2026-08-26

### Added

- Strict Zod validation for browser, CLI, inline, manifest, and JSON-file configuration sources.
- Public configuration schemas and types, plus a shipped JSON Schema at `schemas/docs.schema.json` for editor validation.
- Biome formatting and linting commands integrated into the release gate.
- Regression coverage for configuration precedence, fallback behavior, manifest validation, and the shipped JSON Schema.

### Changed

- CLI configuration reads now fail with source-prefixed validation errors instead of silently using malformed configuration.
- Documentation, templates, and contributor guidance now describe the shared configuration contract and quality checks.

## 0.1.0 - 2026-08-26

### Added

- CLI builds that produce serveable documentation assets and a standalone offline `.dist/index.html` by default.
- Nested documentation roots: every directory containing `docs.json` owns isolated configuration, components, manifests, and offline output.
- Browser-loadable `.dmd/components.js` modules, including support in offline bundles.
- Public runtime lifecycle API and release packaging metadata.