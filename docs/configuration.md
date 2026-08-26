---
title: Configuration Reference (docs.json)
description: Complete reference for docs.json, theme presets, navigation, and options.
order: 3
tags: [config, reference, themes, json]
---

# Configuration Reference (`docs.json`)

While DocMeDown works zero-config out of the box, `docs.json` allows you to customize branding, color palettes, navbar links, repository links, search behavior, and custom routes.

---

## 📄 Full `docs.json` Example

```json title="docs.json"
{
  "name": "DocMeDown",
  "tagline": "The simplest MarkDown documenter yet",
  "description": "Next-generation documentation toolkit",
  "version": "1.0.0",
  "rootDoc": "README.md",
  "theme": {
    "preset": "indigo",
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

## 🎨 Theme Presets

DocMeDown includes 7 hand-curated theme presets designed with high contrast and sleek glassmorphism:

| Preset Name | Accent Hex | Visual Identity |
| :--- | :--- | :--- |
| `"indigo"` *(default)* | `#6366f1` | Clean, modern, developer-first |
| `"emerald"` | `#10b981` | High-tech, fresh, terminal vibe |
| `"sunset"` | `#f59e0b` | Warm amber and energy |
| `"violet"` | `#8b5cf6` | Vibrant, creative purple |
| `"rose"` | `#f43f5e` | Bold, stylish quartz |
| `"slate"` | `#64748b` | Minimalist monochrome |
| `"cyberpunk"` | `#00f0ff` | Neon glow & deep contrast |

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
    "preset": "violet",
    "defaultMode": "dark"
  }
}
</script>
```
