# Changelog

All notable changes to DocMeDown are documented here.

## Unreleased

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