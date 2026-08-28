# Changelog

All notable changes to DocMeDown are documented here.

## Unreleased

---

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