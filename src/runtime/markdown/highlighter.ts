import Prism from "prismjs";

// Import core languages — expanded set for showcase (+ aliases below)
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-python";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-docker";
import "prismjs/components/prism-diff";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-swift";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-php";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-toml";
import "prismjs/components/prism-ini";
import "prismjs/components/prism-nginx";
import "prismjs/components/prism-graphql";
import "prismjs/components/prism-http";
import "prismjs/components/prism-dart";
import "prismjs/components/prism-scala";

import { encodeDiagramSource } from "./mermaid";

/**
 * Mermaid fences emit a data-driven placeholder. The runtime mounts an
 * interactive MermaidDiagram React component onto it, which owns family-aware
 * theming, zoom/pan, export, and error reporting.
 */
function diagramPlaceholder(code: string): string {
  return `<div class="dmd-diagram-host" data-dmd-diagram="${encodeDiagramSource(code)}"></div>`;
}

// Common aliases → canonical Prism language ids
const LANG_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  rs: "rust",
  golang: "go",
  kt: "kotlin",
  rb: "ruby",
  cs: "csharp",
  "c++": "cpp",
  "c#": "csharp",
  gql: "graphql",
};

export function normalizeLanguage(lang: string): string {
  const clean = lang.trim().toLowerCase();
  return LANG_ALIASES[clean] || clean;
}

export function registerLanguage(name: string, definition: Record<string, unknown>): void {
  Prism.languages[name] = definition as never;
}

export function highlightCode(code: string, lang: string = ""): string {
  const cleanLang = normalizeLanguage(lang);

  if (cleanLang === "mermaid") {
    return diagramPlaceholder(code);
  }

  // Empty or unknown language → no false highlighting, just escape
  if (!cleanLang || cleanLang === "text" || cleanLang === "plain" || cleanLang === "txt") {
    return escapeHtml(code);
  }

  const grammar = Prism.languages[cleanLang];
  if (!grammar) return escapeHtml(code);

  return Prism.highlight(code, grammar, cleanLang);
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderCodeBlock(code: string, infoString: string = ""): string {
  // Parse infoString like: tsx title="App.tsx" {1,3-5} — first token is the language
  const parts = infoString.trim().split(/\s+/);
  const rawLang = parts[0] || "text";
  const lang = normalizeLanguage(rawLang) || "text";

  let title = "";
  const titleMatch = infoString.match(/title=["']([^"']+)["']/);
  if (titleMatch) {
    title = titleMatch[1];
  }

  if (lang.toLowerCase() === "mermaid") {
    return diagramPlaceholder(code);
  }

  const highlighted = highlightCode(code, lang);
  const id = `code-${Math.random().toString(36).substring(2, 9)}`;

  return `
<div class="dmd-code-block-wrapper" data-lang="${lang}">
  <div class="dmd-code-header">
    <div class="dmd-code-header-left">
      <span class="dmd-code-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
      ${title ? `<span class="dmd-code-title">${escapeHtml(title)}</span>` : ""}
    </div>
    <div class="dmd-code-header-right">
      <span class="dmd-code-lang">${lang.toUpperCase()}</span>
      <button class="dmd-copy-btn" data-clipboard-target="#${id}" title="Copy code" onclick="window.__dmdCopyCode && window.__dmdCopyCode(this)">
        <svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        <svg class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Copy</span>
      </button>
    </div>
  </div>
  <pre class="language-${lang}"><code id="${id}" class="language-${lang}">${highlighted}</code></pre>
</div>
`;
}
