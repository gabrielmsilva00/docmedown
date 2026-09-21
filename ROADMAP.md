# DocMeDown Roadmap

> **Honest reset.** This document replaces the previous 1.0.0 "Counterattack" roadmap.
> The 1.0.0 version bump was premature — we shipped foundational infrastructure
> (Svelte 5 port, static compilation, MCP server) but the project is not production-ready.
> This roadmap is grounded in the actual codebase state and user-facing gaps, not ambition.

---

## Current Reality (September 2026)

### What works well
- **Svelte 5 runtime**: fully ported from React, runes-based stores, Lit 3.3 custom elements
- **Static site compilation**: prerendered pages with SEO tags, sitemap, robots.txt
- **AI context files**: `llms.txt`, `llms-full.txt`, `SKILL.md`, `okf.json`
- **MCP server**: `list_docs`, `read_doc`, `search_docs`, `resolve_url` over stdio
- **Offline bundles**: self-contained single-file `.dist/index.html` with gzip envelope
- **94 passing tests**: typecheck, lint, unit tests, offline artifacts
- **`.dmd` custom elements**: Lit-based builtins (18 components), user CEs via `components.js`

### What's NOT production-ready

| Area | Severity | Gap |
|------|----------|------|
| **Bundle size** | 🟠 Improving | Served runtime = **1.16 MB raw / 0.48 MB gzip** initial (Mermaid externalized, fetched only by pages with a diagram); self-contained IIFE = 4.2 MB / 1.29 MB gzip for offline/CDN. Still heavy: KaTeX, Prism, Lit, Svelte are inlined in the served runtime. |
| **MCP server** | 🟡 Significant | Only tested via `InMemoryTransport`. No stdio transport tests. No `npx -y docmedown mcp` path verified. Missing `--version`/`--help` on mcp subcommand. |
| **Performance** | 🟡 Significant | `parseMarkdown()` serves an LRU cache, `upgradeCustomComponents()` uses a `TreeWalker`, theme switching crossfades the canvas, and Mermaid loads on demand on the served site. Still open: KaTeX is eagerly loaded on pages without math, and the Prism language set is fixed. |
| **UI/UX quality** | 🟡 Significant | Loading skeleton is minimal (3 gray bars). Error page has no details/retry. No empty state. Mobile sidebar lacks swipe gesture. Search has no debounce. TOC scroll-spy highlights only one heading at a time. Code blocks lack "copy" button. No navbar scroll shadow. No theme transition animation. |
| **CLI maturity** | 🟡 Significant | Missing `validate`, `doctor`, `migrate` commands. Config validation is basic. No link checking. No upgrade path from Docusaurus/VitePress. |
| **Accessibility** | 🟠 Needs work | Focus management in modals is incomplete. No skip-to-content link. Keyboard navigation gaps. Color contrast not systematically verified. |
| **Mobile UX** | 🟠 Needs work | Sidebar covers full screen (no drawer). Search modal not optimized for touch. Table of Contents collapses to a tiny button. No swipe gestures. |
| **Missing features** | 🟠 Needs work | `{{env:VAR}}` substitution. Label overrides. Plugin hooks. `.nojekyll` config option. Custom 404 pages. Breadcrumb customization. |
| **Documentation** | 🟠 Needs work | API reference incomplete. Missing migration guide from 0.1.x. No deployment guide for Vercel/Netlify. No troubleshooting guide. |

---

## v0.1.x Series — Foundation stabilization (current)

The version stays at **0.1.x** until all critical and significant issues are resolved.
Each release ships measurable improvements to production readiness.

### v0.2.0 — Bundle size & performance
**Goal:** served initial payload < 1.8 MB raw, parse cache, lazy loading

- [x] **Lazy-load Mermaid on the served site** — a separate `docmedown-mermaid.js`
      classic script loads on the first diagram render (`vite.config.web.mts` +
      `mermaid-loader.ts`). The self-contained IIFE still inlines Mermaid so
      offline copies and the CDN stay standalone.
  - [x] `MermaidDiagram.svelte` resolves the engine lazily on mount
  - [x] The served runtime excludes Mermaid from the main chunk (`__DMD_EXTERNAL_HEAVY__`)
  - [x] A separate `docmedown-mermaid.js` bundle is loaded on demand (classic script, so `file://` works)
  - [x] All 20+ diagram types remain available; just not loaded upfront
  - [x] Served critical path 1,347 KB → **533 KB gzip**; the engine ships only when a corpus authors a diagram
- [ ] **Lazy-load KaTeX** — same pattern for math rendering
  - [ ] `renderMath()` becomes async, imports katex on first call
  - [ ] Pages without `$...$` or `$$...$$` never pay the KaTeX tax
- [x] **Prune KaTeX legacy fonts** — keep only woff2 (drop the duplicated woff/ttf
      sources Vite was inlining as base64) via `pruneLegacyKatexFonts` in vite.config
  - [x] ESM/CJS entries −1.09 MB raw (−0.68 MB gzip)
  - [x] Served IIFE −1.05 MB raw (−0.67 MB gzip); offline copy −0.89 MB
- [ ] **Prune Prism languages** — bundle only the 10 most common languages by default
  - [ ] Remaining languages (Rust, Go, Kotlin, etc.) lazy-loaded via `import()` on first use
  - [ ] Config option to preload additional languages in `docs.json`
- [x] **Markdown parse cache** — LRU cache keyed by slug
  - [x] Invalidate on rebuild event from watcher
  - [x] Cache size configurable (default 50 entries)
- [x] **Optimize `upgradeCustomComponents()`** — replace `querySelectorAll("*")` with `TreeWalker`
  - [x] Or use a `MutationObserver`-based approach for incremental upgrades
- [ ] **Search index** — deduplicate addDoc calls (already has guard, verify correctness)
- [x] **Bundle size regression test** — assert the runtime bundles stay within budget, fail CI if exceeded
      (`tests/bundle-size.test.ts`, wired into `test:release`)

### v0.3.0 — UI/UX overhaul
**Goal:** Delightful reading experience on every device

- [ ] **Loading states**
  - [x] Branded inline splash replaces the blank first paint (theme-aware, 1.25 s minimum beat, crossfades with the app, `<noscript>` fallback)
  - [x] Instant in-memory page navigation (synchronous parse + idle-warmed cache, no skeleton flash)
  - [ ] Shimmer skeleton that matches article structure (title, headings, paragraphs)
  - [ ] Skeleton for sidebar tree while manifest loads
  - [ ] Skeleton for search results
- [ ] **Error states**
  - [ ] Show error details with stack trace in dev mode
  - [ ] Retry button for network errors
  - [ ] Fallback suggestions (home page, search, similar pages)
  - [ ] Offline-aware error messaging
- [ ] **Empty state**
  - [ ] Friendly illustration when no docs configured
  - [ ] Quick-start guide embedded in empty state
  - [ ] Link to docs.json documentation
- [ ] **Mobile UX**
  - [ ] Sidebar as a drawer overlay (not full-screen replacement)
  - [ ] Swipe-to-close sidebar gesture
  - [ ] Bottom-sheet search on mobile
  - [ ] Larger touch targets (44px minimum)
  - [ ] Responsive TOC that slides in from right
- [ ] **Search improvements**
  - [ ] 300ms debounce on input
  - [ ] Keyboard shortcut hint visible on mobile
  - [ ] Search result highlighting (bold matching terms)
  - [ ] Category filters in search results
  - [ ] Recent searches (localStorage)
- [ ] **Table of Contents**
  - [ ] Multiple simultaneous active headings (when viewport spans sections)
  - [ ] Smooth scroll-to-heading animation
  - [ ] Collapsible sub-sections
  - [ ] "Back to top" button
- [ ] **Code blocks**
  - [ ] "Copy" button on hover (currently inline onclick — make proper Svelte component)
  - [ ] Optional line numbers (config toggle)
  - [ ] Language badge always visible
  - [ ] Code block title from `title="..."` info string
  - [ ] Wrapping toggle for long lines
- [ ] **Navbar**
  - [ ] Scroll shadow on scroll down
  - [ ] Hide on scroll down, show on scroll up (optional)
  - [ ] Sticky breadcrumbs in content header
- [ ] **Theme transitions**
### v0.4.0 — MCP server maturity
**Goal:** Production-ready MCP with full test coverage and npx invocation

- [ ] **Stdio transport tests**
  - [ ] Spawn `docmedown mcp` as child process, communicate via stdin/stdout
  - [ ] Test all four tools over real stdio transport
  - [ ] Test error handling (missing doc, invalid args, empty corpus)
  - [ ] Test graceful shutdown (SIGTERM, SIGINT)
- [ ] **npx invocation**
  - [ ] Verify `npx -y docmedown mcp ./docs` works end-to-end
  - [ ] Add `--version` flag to mcp subcommand
  - [ ] Add `--help` with tool descriptions
  - [ ] Document npx pattern in README and CLI reference
- [ ] **MCP server enhancements**
  - [ ] `--port` flag for SSE transport (alternative to stdio)
  - [ ] `--allow-origins` for SSE CORS
  - [ ] Tool descriptions with argument schemas in MCP introspection
  - [ ] Resource templates for doc content (if MCP SDK supports)
- [ ] **Error resilience**
  - [ ] Graceful degradation when `_manifest.json` is missing
  - [ ] Clear error messages for common misconfigurations
  - [ ] Logging to stderr (not stdout — that's the protocol channel)
- [ ] **Documentation**
  - [ ] MCP integration guide for AI assistants
  - [ ] Example: Claude Desktop configuration
  - [ ] Example: Cline/Cursor MCP settings

### v0.5.0 — CLI tooling & developer experience
**Goal:** Professional CLI with validation, diagnostics, and migration

- [ ] **`dmd validate [dir]`**
  - [ ] Validate `docs.json` schema with detailed error paths
  - [ ] Check all internal markdown links resolve to existing docs
  - [ ] Check external links respond (optional, opt-in)
  - [ ] Report warnings (missing descriptions, oversized images, broken anchors)
  - [ ] Exit codes: 0 = clean, 1 = warnings, 2 = errors
- [ ] **`dmd doctor [dir]`**
  - [ ] Check Node.js version meets minimum
  - [ ] Verify `docs.json` is valid JSON and passes schema
  - [ ] Check `.dmd/components.js` exists and is valid JS
  - [ ] Verify `index.html` has `data-docmedown-runtime` attribute
### v0.6.0 — Missing features
**Goal:** Feature parity with expectations for a 1.0 documentation tool

- [ ] **`{{env:VAR}}` substitution** in `docs.json` and markdown frontmatter
  - [ ] Build-time replacement from environment variables
  - [ ] `.env` file support
  - [ ] Type-safe defaults: `{{env:VAR:default}}`
  - [ ] Documented in configuration guide
- [ ] **Label overrides** in `docs.json`
  - [ ] Customize UI strings: search placeholder, nav labels, TOC heading, etc.
  - [ ] `ui.labels.searchPlaceholder`, `ui.labels.onThisPage`, etc.
  - [ ] `ui.labels.previousPage`, `ui.labels.nextPage`
  - [ ] `ui.labels.editThisPage`
- [ ] **`.nojekyll` config option**
  - [ ] `githubPages.nojekyll: true` — auto-create `.nojekyll` on build
  - [ ] Document for GitHub Pages users
- [ ] **Custom 404 page**
  - [ ] `404.md` in doc root → custom 404.html
  - [ ] Frontmatter `layout: 404` for dedicated page
  - [ ] Runtime 404 when doc slug not found
- [ ] **Breadcrumb customization**
  - [ ] `breadcrumb.home: "Docs"` → configurable home label
  - [ ] `breadcrumb.hideHome: false` → optionally hide home crumb
  - [ ] `breadcrumb.maxDepth: 3` → truncate deep paths
- [ ] **Plugin hooks v1**
  - [ ] Build-time: `onScan(docs)`, `onRender(html, doc)`, `onEmit(manifest)`
  - [ ] Runtime: `onNavigate(slug)`, `onReady(instance)`, `onDestroy()`
  - [ ] Plugin config in `docs.json` under `plugins[]`
  - [ ] Example plugins: analytics injection, last-updated git dates, OpenAPI spec renderer

### v0.7.0 — Accessibility & i18n foundations
**Goal:** WCAG 2.1 AA compliance, localization framework

- [ ] **Accessibility audit**
  - [ ] Automated testing with axe-core
  - [ ] Manual keyboard navigation audit
  - [ ] Screen reader testing (NVDA, VoiceOver)
  - [ ] Color contrast verification for all theme families
- [ ] **Accessibility fixes**
  - [ ] Skip-to-content link
### v0.8.0 — Performance optimization
**Goal:** Lighthouse scores ≥ 90 on desktop and mobile

- [ ] **Core Web Vitals optimization**
  - [ ] Largest Contentful Paint (LCP) < 2.5s
  - [ ] First Input Delay (FID) / Interaction to Next Paint (INP) < 200ms
  - [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] **Runtime performance**
  - [ ] Virtual scrolling for large sidebar trees (500+ items)
  - [ ] Deferred rendering for off-screen content
  - [ ] Web Worker for search indexing
  - [ ] Optimize Mermaid rendering (cache SVGs, debounce re-renders)
- [ ] **Build performance**
  - [ ] Parallel document processing
  - [ ] Incremental builds (only re-process changed files)
  - [ ] Build cache between runs
- [ ] **Performance regression tests**
  - [ ] Parse time benchmark (< 50ms per doc)
  - [ ] Render time benchmark (< 100ms for full page)
  - [ ] Search time benchmark (< 10ms for typical query)
  - [ ] Bundle size budget enforcement

### v0.9.0 — Documentation & polish
**Goal:** Complete documentation, examples, and release readiness

- [ ] **API reference**
  - [ ] Full TypeScript API documentation
  - [ ] `DocMeDown.init()` options reference
  - [ ] `ComponentRegistry`, `defineDmd()`, `dmdTag()` reference
  - [ ] `doc` and `theme` store API
  - [ ] Config schema reference with examples
- [ ] **Migration guides**
  - [ ] 0.1.x → 0.9.x migration (React → Svelte, components.js changes)
  - [ ] Docusaurus migration guide
  - [ ] VitePress migration guide
  - [ ] GitBook migration guide
- [ ] **Deployment guides**
  - [ ] GitHub Pages (with and without custom domain)
  - [ ] Netlify
  - [ ] Vercel
  - [ ] Cloudflare Pages
  - [ ] Docker / self-hosted
  - [ ] Offline / USB / air-gapped
- [ ] **Tutorials**
  - [ ] "Your first DocMeDown site in 5 minutes"
  - [ ] "Custom components with Lit"
  - [ ] "Remote GitHub docs without CI"
  - [ ] "Offline documentation for field workers"
  - [ ] "Using the MCP server with AI assistants"
- [ ] **Troubleshooting guide**
  - [ ] Common build errors
  - [ ] Runtime errors and solutions
  - [ ] Browser compatibility notes
  - [ ] FAQ

---

## v1.0.0 — Production release

Only when ALL of the following are true:

- [ ] **Bundle:** IIFE ≤ 2.0 MB raw (≤ 500 KB gzip), ESM/CJS ≤ 800 KB
- [ ] **MCP:** Full stdio test coverage, npx invocation verified, documented
- [ ] **Performance:** Parse cache active, lazy loading working, Lighthouse ≥ 90
- [ ] **UI/UX:** Loading/error/empty states for every view, mobile UX polished, search debounced
- [ ] **CLI:** `validate`, `doctor`, `migrate` commands ship
- [ ] **Features:** `{{env:VAR}}`, label overrides, plugin hooks v1, `.nojekyll`, custom 404
- [ ] **Accessibility:** WCAG 2.1 AA, keyboard nav audit, screen reader tested
- [ ] **Docs:** API reference, migration guides, deployment guides, troubleshooting
- [ ] **Tests:** ≥ 150 tests, bundle size regression, MCP stdio, performance benchmarks
- [ ] **Stability:** No regressions in 2 weeks of active use across all modes
- [ ] **Community:** At least 3 external users/projects using DocMeDown in production

---

## v1.x.x — Post-1.0 ecosystem

- [ ] First-party plugins: OpenAPI renderer, analytics injection, git last-updated dates
- [ ] Programmatic API: `build()`, `serve()`, `validate()` from the package
- [ ] Deploy generators: one-command deploy to Vercel/Netlify/Docker
- [ ] VS Code extension: preview docs locally, code snippets, config validation
- [ ] GitHub App: auto-build docs on push, PR preview deployments
- [ ] Theme marketplace: community themes, theme gallery
- [ ] CLI completions (bash/zsh/fish)

## v2.x.x — Stretch goals

- [ ] **Multi-version docs** — version selector in navbar, versioned sidebar tree
- [ ] **Multi-repo workspace** — aggregate docs from multiple repositories
- [ ] **i18n content** — translate docs content (not just UI)
- [ ] **Live editing** — edit docs in-browser with preview
- [ ] **AI-powered search** — semantic search via local embeddings
- [ ] **PDF export** — generate PDF from selected docs
- [ ] **API docs generation** — from OpenAPI/TypeDoc/JSDoc

## Won't build (unless the world changes)

RAG AI assistant / BYOK chat (see docmd #222's bug trail), Cloud hosting platform,
multi-repo workspace switcher (before v2), i18n framework (before v2), PDF export
(before v2).

**Revisit triggers:** >50 confirmed user requests, or a paying-customer contract.

---

## Milestone progression

```
v0.1.x ─── v0.2.0 ─── v0.3.0 ─── v0.4.0 ─── v0.5.0 ─── v0.6.0 ─── v0.7.0 ─── v0.8.0 ─── v0.9.0 ─── v1.0.0
  (now)   (perf/bundle) (UI/UX)   (MCP)      (CLI)     (features) (a11y)    (perf)    (docs)    (release)
```

Each milestone is a tagged npm release with its own CHANGELOG entry.
Milestones may ship concurrently if resourcing allows.
Any milestone can be fast-tracked based on user demand.

**Version scheme:** `0.<milestone>.<patch>` — breaking changes reset patch to 0.
Pre-1.0 breaking changes are expected and documented in CHANGELOG.




