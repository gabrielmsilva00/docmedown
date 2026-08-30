---
title: Configuration Reference (docs.json)
description: Complete reference for docs.json, theme families, navigation, and runtime options.
order: 3
tags: [config, reference, themes, json]
---

# Configuration Reference (`docs.json`)

While DocMeDown works zero-config out of the box, `docs.json` allows you to customize branding, complete theme families, reading density, navbar links, repository links, search behavior, and custom routes.

---

## Validation and editor support

DocMeDown validates every configuration source (`docs.json`, `dmd.json`, inline configuration, and embedded manifests) with its Zod schema before use. Invalid configuration reports the exact field path and is never silently merged into the runtime configuration.

For JSON-aware editors, add this as the first property of `docs.json` to enable completion and validation:

```json
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "My documentation"
}
```

The portable JSON Schema is included in the npm package at `schemas/docs.schema.json`. Runtime consumers can also import the executable Zod schema from `docmedown` as `docConfigSchema` or parse unknown configuration with `parseDocConfig`.

Unknown properties are rejected. GitHub and GitLab sources require a `repo` in `owner/repository` form; raw sources require an absolute `baseUrl`. When loading in the browser, an invalid higher-precedence source is reported and skipped so DocMeDown can use the next valid source: global config, inline config, `docs.json`, `dmd.json`, `_manifest.json`, then defaults.

---

## 📄 Full `docs.json` Example

```json title="docs.json"
{
  "$schema": "https://raw.githubusercontent.com/gabrielmsilva00/docmedown/main/schemas/docs.schema.json",
  "name": "DocMeDown",
  "tagline": "The simplest MarkDown documenter yet",
  "description": "Next-generation documentation toolkit",
  "version": "1.0.0",
  "rootDoc": "README.md",
  "home": "README.md",
  "theme": {
    "family": "atlas",
    "density": "comfortable",
    "defaultMode": "auto",
    "codeTheme": "github",
    "logo": {
      "light": "/assets/logo-light.svg",
      "dark": "/assets/logo-dark.svg",
      "alt": "DocMeDown Logo"
    }
  },
  "nav": [
    { "label": "Overview", "href": "#/README" },
    { "label": "Getting Started", "href": "#/getting-started" },
    { "label": "API", "href": "#/api/overview" },
    { "label": "GitHub", "href": "https://github.com/facebook/react", "external": true }
  ],
  "socials": [
    { "type": "github", "url": "https://github.com/facebook/react" },
    { "type": "discord", "url": "https://discord.gg/react" }
  ],
  "autoIndex": {
    "enabled": true,
    "sort": "natural",
    "defaultCollapsed": false,
    "exclude": ["node_modules", ".git", ".dmd"]
  },
  "search": {
    "enabled": true,
    "placeholder": "Search documentation (⌘K)...",
    "maxResults": 10
  },
  "footer": {
    "copyright": "© 2026 DocMeDown Team. All rights reserved.",
    "showBuiltWith": true
  }
}
```

---

## 🏠 Documentation home

The navbar exposes a **Home** action, and the brand link points to the same
place, so readers can always return to the documentation home. Pin it to a
specific document with `home`:

```json title="docs.json"
{
  "home": "PROJECT.md"
}
```

`home` accepts a document path or slug (`"PROJECT.md"`, `"PROJECT"`,
`"guides/intro"`). Documentation inside documentation may also set `home` to an
explicit relative link — for example `"../../index.html#/"` — to send readers
back to the site that contains it.

When `home` is not configured, DocMeDown resolves it automatically from the
files at the root of the documentation folder, in this order:

1. `README.md`, `PROJECT.md`, `ABOUT.md`, or `INDEX.md` — a case-sensitive pass
   over all four names first.
2. The same names again case-insensitively (for example `readme.md` or
   `Project.MD`).
3. Otherwise, the alphabetically first Markdown document in the corpus.

Nested documentation roots are covered automatically as well: when a nested
documentation site is served inside an outer DocMeDown site, the Home action
links to the **original** (outermost) documentation home instead of the nested
one, so there is always a way back.

---

## 🎨 Theme Families

DocMeDown ships four complete visual **families**. A family is not an accent
color: it redefines canvas, surface structure, borders, geometry, typography
rhythm, elevation strategy, and motion feel — consistently across light and
dark modes.

| Family | Character | Geometry | Display type |
| :--- | :--- | :--- | :--- |
| `atlas` *(default)* | Neutral mineral canvas, cobalt actions | Medium radius, quiet shadows | Sans |
| `blueprint` | Cool technical canvas, coral signals | Squared, visible drafting rules | Sans |
| `terminal` | Dark-first operational console | Sharp corners, flat surfaces | Mono |
| `editorial` | Warm paper reading surface, brick accents | Soft radius, generous rhythm | Serif |

```json title="docs.json"
{
  "theme": {
    "family": "terminal",
    "density": "compact",
    "defaultMode": "auto",
    "codeTheme": "one-dark"
  }
}
```

### Reading density

`theme.density` accepts `"comfortable"` (default) or `"compact"`. Compact trims
the navbar height, panel widths, and section rhythm across every family. The
**Appearance** menu in the navbar exposes family, mode, and density at runtime;
preferences persist locally and invalid saved values are discarded safely.

### Brand accent override

Families choose a harmonious action color for you. To force your brand color:

```json title="docs.json"
{
  "theme": {
    "family": "atlas",
    "accentColor": "#0ea5e9",
    "accentColorDark": "#38bdf8"
  }
}
```

`accentColorDark` applies while dark mode is resolved, falling back to
`accentColor`.

### Theme field reference

| Field | Values | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `family` | `atlas`, `blueprint`, `terminal`, `editorial` | `atlas` | Selects the complete visual system. |
| `defaultMode` | `auto`, `light`, `dark` | `auto` | Chooses the initial color mode; users may override it in Appearance. |
| `density` | `comfortable`, `compact` | `comfortable` | Controls shell widths, control height, and reading rhythm. |
| `codeTheme` | `github`, `one-dark`, `dracula`, `synthwave` | `github` | Selects syntax-highlight colors for fenced code. |
| `accentColor` | CSS hex color | Family default | Overrides the action color in light mode and as the dark fallback. |
| `accentColorDark` | CSS hex color | `accentColor` | Optional higher-contrast action color for dark mode. |

The runtime writes the resolved state to `<html>` as `data-dmd-theme`,
`data-dmd-mode`, and `data-dmd-density`. Custom components should consume the
documented `--dmd-*` CSS tokens rather than hard-coding a family palette.

### Legacy presets

The old accent-only `preset` option is deprecated and accepted for one release
cycle. It maps automatically onto the matching family:

| Legacy preset | Resolved family |
| :--- | :--- |
| `indigo`, `emerald`, `violet` | `atlas` |
| `slate` | `blueprint` |
| `cyberpunk` | `terminal` |
| `sunset`, `rose` | `editorial` |

---

## 🌐 Dynamic Remote Source Configuration

To dynamically document a remote Git repository:

```json title="docs.json"
{
  "name": "Live GitHub Docs",
  "source": {
    "type": "github",
    "repo": "owner/repository-name",
    "branch": "main",
    "docsDir": "docs",
    "token": "ghp_optionalTokenForPrivateRepos"
  }
}
```

For GitLab repositories:

```json title="docs.json"
{
  "name": "Live GitLab Docs",
  "source": {
    "type": "gitlab",
    "repo": "owner/repository-name",
    "branch": "main",
    "docsDir": "docs"
  }
}
```

---

## 📝 Embedding Configuration in HTML

If you prefer a single `index.html` file without a separate `docs.json`, you can embed your configuration directly in a `<script>` tag:

```html title="index.html"
<script id="dmd-config" type="application/json">
{
  "name": "Embedded Docs",
  "theme": {
    "family": "editorial",
    "density": "comfortable",
    "defaultMode": "dark"
  }
}
</script>
```
