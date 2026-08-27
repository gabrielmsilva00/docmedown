import Prism from "prismjs";

// Import core languages
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

import { encodeDiagramSource } from "./mermaid";

/**
 * Mermaid fences emit a data-driven placeholder. The runtime mounts an
 * interactive MermaidDiagram React component onto it, which owns family-aware
 * theming, zoom/pan, export, and error reporting.
 */
function diagramPlaceholder(code: string): string {
  return `<div class="dmd-diagram-host" data-dmd-diagram="${encodeDiagramSource(code)}"></div>`;
}

export function highlightCode(code: string, lang: string = ""): string {
  const cleanLang = lang.trim().toLowerCase();

  if (cleanLang === "mermaid") {
    return diagramPlaceholder(code);
  }

  const grammar = Prism.languages[cleanLang] || Prism.languages.javascript;
  const highlighted = grammar ? Prism.highlight(code, grammar, cleanLang || "javascript") : escapeHtml(code);

  return highlighted;
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
  // Parse infoString like: tsx title="App.tsx" {1,3-5}
  const parts = infoString.trim().split(/\s+/);
  const lang = parts[0] || "text";

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
