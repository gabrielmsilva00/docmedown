import Prism from "prismjs";

// Import core languages only (10 most common). Less common languages like
// Rust, Go, SQL, Docker, Diff, C/C++/C#, Java, Kotlin, Swift, PHP, Ruby,
// TOML, INI, Nginx, GraphQL, HTTP, Dart, Scala are NOT bundled by default.
// They can be registered at runtime via `DocMeDown.registerLanguage()` or
// preloaded via docs.json `prism.languages` config.
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

/** File extension → highlight color for the filename in the code block header. */
const EXT_COLORS: Record<string, string> = {
  ts: "#3178c6",
  tsx: "#3178c6",
  js: "#f7df1e",
  jsx: "#f7df1e",
  mjs: "#f7df1e",
  cjs: "#f7df1e",
  css: "#a855f7",
  scss: "#a855f7",
  less: "#a855f7",
  html: "#f97316",
  htm: "#f97316",
  json: "#eab308",
  jsonc: "#eab308",
  yaml: "#ef4444",
  yml: "#ef4444",
  md: "#94a3b8",
  markdown: "#94a3b8",
  py: "#3b82f6",
  sh: "#22c55e",
  bash: "#22c55e",
  zsh: "#22c55e",
  rs: "#f97316",
  go: "#38bdf8",
  svelte: "#ff3e00",
  vue: "#42b883",
  svg: "#a855f7",
  xml: "#f97316",
  sql: "#a78bfa",
  graphql: "#a855f7",
  gql: "#a855f7",
  dockerfile: "#38bdf8",
  txt: "#64748b",
  toml: "#94a3b8",
  ini: "#94a3b8",
};

/** Canonical language id → pill color. Reuses the extension palette so the
 *  language pill matches the filename color for the same language. */
const LANG_COLORS: Record<string, string> = {
  typescript: EXT_COLORS.ts,
  javascript: EXT_COLORS.js,
  jsx: EXT_COLORS.jsx,
  tsx: EXT_COLORS.tsx,
  python: EXT_COLORS.py,
  bash: EXT_COLORS.sh,
  css: EXT_COLORS.css,
  scss: EXT_COLORS.scss,
  json: EXT_COLORS.json,
  jsonc: EXT_COLORS.json,
  yaml: EXT_COLORS.yaml,
  markdown: EXT_COLORS.md,
  html: EXT_COLORS.html,
  sql: EXT_COLORS.sql,
  svelte: EXT_COLORS.svelte,
  go: EXT_COLORS.go,
  rust: EXT_COLORS.rs,
  graphql: EXT_COLORS.graphql,
  xml: EXT_COLORS.xml,
  toml: EXT_COLORS.toml,
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

/**
 * Renders a path-aware title HTML: directories are dimmed, the filename is
 * color-coded by extension and prefixed with a small file icon that inherits
 * the same color.  Accepts plain names ("index.html") or relative paths
 * ("./docs/src/app.tsx").  The final separator is kept with the path span so
 * filenames never start with a dangling slash.
 */
const FILE_ICON_SVG =
  '<svg class="dmd-code-file-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>';

function renderTitleHtml(title: string): string {
  const normalised = title.replace(/\\/g, "/");
  const lastSlash = normalised.lastIndexOf("/");
  if (lastSlash === -1) {
    const ext = normalised.includes(".") ? normalised.split(".").pop()!.toLowerCase() : "";
    const color = EXT_COLORS[ext] || "#94a3b8";
    return `<span class="dmd-code-filename" style="color:${color}">${FILE_ICON_SVG}${escapeHtml(normalised)}</span>`;
  }
  const dir = normalised.slice(0, lastSlash + 1);
  const filename = normalised.slice(lastSlash + 1);
  const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
  const color = EXT_COLORS[ext] || "#94a3b8";
  return `<span class="dmd-code-path">${escapeHtml(dir)}</span><span class="dmd-code-filename" style="color:${color}">${FILE_ICON_SVG}${escapeHtml(filename)}</span>`;
}

/** Clipboard icon used by both copy buttons. */
const CLIPBOARD_SVG =
  '<svg class="copy-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
const CHECK_SVG =
  '<svg class="check-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

export function renderCodeBlock(code: string, infoString: string = ""): string {
  // Parse infoString like: tsx title="App.tsx" {1,3-5} — first token is the language
  const parts = infoString.trim().split(/\s+/);
  const rawLang = parts[0] || "text";
  const lang = normalizeLanguage(rawLang) || "text";

  let title = "";
  const titleMatch = infoString.match(/title=["']([^"']+)["']/);
  if (titleMatch) title = titleMatch[1];

  if (lang.toLowerCase() === "mermaid") return diagramPlaceholder(code);

  const highlighted = highlightCode(code, lang);
  const id = `code-${Math.random().toString(36).substring(2, 9)}`;
  const activeLines = parseActiveLines(infoString);
  const hasActive = activeLines.size > 0;

  // Left side: path-aware title (color-coded) or language pill as fallback.
  // The pill carries its color via --dmd-lang-color (neutral fallback in CSS).
  const langColor = LANG_COLORS[lang];
  const left = title
    ? `<span class="dmd-code-title">${renderTitleHtml(title)}</span>`
    : `<span class="dmd-code-lang"${langColor ? ` style="--dmd-lang-color:${langColor}"` : ""}>${lang.toUpperCase()}</span>`;

  return `
<div class="dmd-code-block-wrapper" data-lang="${lang}">
  <div class="dmd-code-header">
    <div class="dmd-code-header-left">${left}</div>
    <div class="dmd-code-header-right">
      ${
        hasActive
          ? `<button type="button" class="dmd-copy-btn dmd-copy-selected-btn" data-dmd-copy-selected aria-label="Copy highlighted lines" title="Copy highlighted lines">${CLIPBOARD_SVG}${CHECK_SVG}</button>`
          : ""
      }
      <button type="button" class="dmd-copy-btn" data-dmd-copy aria-label="Copy code" title="Copy code">${CLIPBOARD_SVG}${CHECK_SVG}</button>
    </div>
  </div>
  <pre class="language-${lang}" tabindex="0"><code id="${id}" class="language-${lang}">${wrapCodeLines(highlighted, activeLines)}</code></pre>
</div>
`;
}

/**
 * Parses the `{1,3-5}` line-highlight syntax from a fence info string.
 * Supports single lines, ranges, and comma-separated mixes; out-of-range
 * numbers are simply ignored by the wrapper.
 */
export function parseActiveLines(infoString: string): Set<number> {
  const active = new Set<number>();
  const range = /\{([\d\s,-]+)\}/.exec(infoString);
  if (!range) return active;
  for (const part of range[1].split(",")) {
    const [from, to] = part.split("-").map((n) => Number.parseInt(n.trim(), 10));
    if (Number.isNaN(from)) continue;
    // Single numbers have no range end (Number.isNaN(undefined) is false —
    // it only detects real NaN values, so check for undefined explicitly).
    const end = to === undefined || Number.isNaN(to) ? from : to;
    for (let n = Math.max(1, from); n <= end; n++) active.add(n);
  }
  return active;
}

/**
 * Wraps highlighted (or escaped) code into per-line `<span>` blocks for line
 * numbers and line highlighting, without breaking Prism's token markup:
 * token spans that cross a line break are closed before it and reopened after,
 * so every `.dmd-code-line` is a single visual line.
 *
 * **Key design choice:** the trailing "\\n" of every source line is *not*
 * included inside its span.  Each `.dmd-code-line` is `display: block` via
 * CSS, which provides visual line separation and — critically — lets the
 * browser insert `\\n` characters between blocks in `innerText` so manual
 * Ctrl+C selections produce clean code.  Programmatic copies (copy button)
 * reconstruct the text by joining each line's `textContent` with `"\\n"`.
 *
 * Leading whitespace (spaces and tabs) on *non-continuation* lines is
 * converted into small visual indicator spans (`dmd-ws-space` dots,
 * `dmd-ws-tab` arrows) so indentation style is visible at a glance.
 * Continuation lines (those inside a multi-line Prism token such as a
 * triple-quoted string or block comment) are left untouched because their
 * whitespace is content, not indentation.
 */
export function wrapCodeLines(html: string, activeLines: Set<number> = new Set()): string {
  const out: string[] = [];
  let cur = "";
  let hasContent = false;
  let lineNo = 1;
  let lineStart = 0;
  let isContinuation = false;
  const openTags: string[] = [];

  const startLine = () => {
    lineStart = out.length;
    hasContent = false;
    cur = "";
    isContinuation = openTags.length > 0;
    out.push(`<span class="dmd-code-line${activeLines.has(lineNo) ? " dmd-code-line-active" : ""}">`);
    for (const tag of openTags) out.push(tag);
  };
  const endLine = () => {
    if (!isContinuation) cur = visualizeLeadingWhitespace(cur);
    for (let i = 0; i < openTags.length; i++) cur += "</span>";
    out.push(cur, "</span>");
    lineNo++;
  };

  startLine();
  let i = 0;
  while (i < html.length) {
    if (html[i] === "<") {
      const close = html.indexOf(">", i);
      if (close === -1) {
        cur += html.slice(i);
        hasContent = true;
        break;
      }
      const tag = html.slice(i, close + 1);
      i = close + 1;
      cur += tag;
      if (tag.startsWith("</")) openTags.pop();
      else openTags.push(tag);
    } else {
      let next = html.indexOf("<", i);
      if (next === -1) next = html.length;
      const parts = html.slice(i, next).split("\n");
      i = next;
      for (let p = 0; p < parts.length; p++) {
        if (p > 0) {
          endLine();
          startLine();
        }
        if (parts[p] !== "") {
          cur += parts[p];
          hasContent = true;
        }
      }
    }
  }
  // A source ending in "\n" starts one phantom empty line — drop it so the
  // gutter never shows a number for a line that does not exist.
  if (hasContent || openTags.length > 0) endLine();
  else out.length = lineStart;
  return out.join("");
}

/**
 * Wraps leading whitespace (before the first HTML tag or non-whitespace
 * character) in indicator spans for visual indentation guides.
 *
 * **Overlay technique:** the span keeps the REAL whitespace character as its
 * content (` ` or `\t`) so `textContent`, clipboard copies, and manual
 * selections are byte-identical to the source. The dot/arrow glyph is painted
 * by CSS as a `::before` overlay on top of the invisible whitespace — it is
 * not selectable (`user-select: none`) and never enters the clipboard.
 * Only applied to non-continuation lines so that indentation style is clear
 * at a glance while whitespace inside multi-line tokens (strings, comments)
 * is left raw.
 */
function visualizeLeadingWhitespace(html: string): string {
  let i = 0;
  let result = "";
  while (i < html.length) {
    if (html[i] === " ") {
      result += '<span class="dmd-ws-space"> </span>';
      i++;
    } else if (html[i] === "\t") {
      result += '<span class="dmd-ws-tab">\t</span>';
      i++;
    } else {
      break;
    }
  }
  return i > 0 ? result + html.slice(i) : html;
}
