import { marked } from "marked";
import { renderCodeBlock } from "./highlighter";

/**
 * Markdown inside PascalCase component bodies.
 * marked treats `<Tabs>...</Tabs>` as opaque HTML, so inner `**md**`
 * rendered literally. This parses inners first (innermost-first),
 * while fenced sources stay opaque for the final document pass.
 */

const INLINE_PARENTS = new Set(["button", "kbd", "badge"]);
const OPEN_RE = /<([A-Z][A-Za-z0-9]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)(\/?)>/g;
const ANY_RE = /<(\/?)([A-Z][A-Za-z0-9]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)(\/?)>/g;
const CLOSE_RE = /<\/([A-Z][A-Za-z0-9]*)\s*>/g;

type MdRenderer = InstanceType<typeof marked.Renderer>;

function rangesOf(src: string, re: RegExp): Array<[number, number]> {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  const g = new RegExp(re.source, flags);
  const out: Array<[number, number]> = [];
  let m: RegExpExecArray | null = g.exec(src);
  while (m !== null) {
    out.push([m.index, m.index + m[0].length]);
    m = g.exec(src);
  }
  return out;
}

function inRanges(idx: number, ranges: Array<[number, number]>): boolean {
  for (let i = 0; i < ranges.length; i++) {
    if (idx >= ranges[i][0] && idx < ranges[i][1]) return true;
  }
  return false;
}

function protectedRanges(src: string): Array<[number, number]> {
  // Fenced example sources (```html <Button/> ```, ````markdown with inner
  // ``` fences) are fully opaque: their component-looking tags must never
  // split regions, and their fences belong to the final pass's code renderer.
  // Inline code spans stay opaque too so `$` and `<` inside them never corrupt
  // region scanning. Same-length backreference keeps `` `$x$` `` one unit.
  return [
    ...rangesOf(src, /(`{3,})[\s\S]*?\1/g),
    ...rangesOf(src, /(~{3,})[\s\S]*?\1/g),
    ...rangesOf(src, /(`+)[\s\S]*?\1/g),
  ];
}

interface OpenTag {
  tag: string;
  full: string;
  start: number;
  end: number;
  selfClosing: boolean;
}

interface CloseTag {
  full: string;
  start: number;
  end: number;
}

function nextOpen(src: string, from: number, prot: Array<[number, number]>): OpenTag | null {
  OPEN_RE.lastIndex = from;
  let m: RegExpExecArray | null;
  while (true) {
    m = OPEN_RE.exec(src);
    if (m === null) return null;
    if (!inRanges(m.index, prot)) {
      return { tag: m[1], full: m[0], start: m.index, end: m.index + m[0].length, selfClosing: m[3] === "/" };
    }
  }
}

function matchingClose(src: string, open: OpenTag, prot: Array<[number, number]>): CloseTag | null {
  let depth = 1;
  ANY_RE.lastIndex = open.end;
  let m: RegExpExecArray | null;
  while (true) {
    m = ANY_RE.exec(src);
    if (m === null) break;
    if (inRanges(m.index, prot)) continue;
    if (m[2] !== open.tag || m[4] === "/") continue;
    if (m[1] === "/") {
      depth -= 1;
      if (depth === 0) return { full: m[0], start: m.index, end: m.index + m[0].length };
    } else {
      depth += 1;
    }
  }
  CLOSE_RE.lastIndex = open.end;
  while (true) {
    m = CLOSE_RE.exec(src);
    if (m === null) return null;
    if (inRanges(m.index, prot)) continue;
    if (m[1].toLowerCase() !== open.tag.toLowerCase()) continue;
    return { full: m[0], start: m.index, end: m.index + m[0].length };
  }
}

function dedentGap(gap: string): string {
  // Component bodies inherit the document's nesting indentation (a Card nested
  // inside a CardGrid is typically indented 4 spaces). Without dedenting,
  // marked reads those lines as indented code blocks and renders `**md**`
  // and `- lists` literally. Strip the common leading indentation MDX-style.
  const lines = gap.split("\n");
  let minIndent: number | null = null;
  for (const line of lines) {
    if (line.trim() === "") continue;
    const match = /^( +)/.exec(line);
    if (!match) {
      minIndent = 0;
      break;
    }
    const len = match[1].length;
    minIndent = minIndent === null ? len : Math.min(minIndent, len);
  }
  if (!minIndent) return gap;
  const prefix = " ".repeat(minIndent);
  return lines.map((line) => (line.startsWith(prefix) ? line.slice(minIndent as number) : line)).join("\n");
}

function renderGap(gap: string, parentTag: string, renderer: MdRenderer, fences: string[]): string {
  if (!gap?.trim()) return gap;
  // dedentGap strips the document's nesting indent from EVERY line (not just
  // the first). Fences and relative list/block indent survive because only the
  // common minimum is removed — this is what stops marked from reading the
  // body as an indented code block.
  const trimmed = dedentGap(gap).trim();
  const inline = INLINE_PARENTS.has(parentTag.toLowerCase());
  const parse = (chunk: string) => {
    const html = inline
      ? (marked.parseInline(chunk, { renderer, gfm: true, breaks: false }) as string)
      : (marked.parse(chunk, { renderer, gfm: true, breaks: false }) as string);
    // Collapse blank lines: the surrounding component region must survive the
    // final marked pass as ONE contiguous HTML block. Blank lines would end
    // marked's HTML block early and re-parse the generated HTML (indentation
    // becomes code blocks, closing tags glue into paragraphs, etc.).
    return html.replace(/\n{2,}/g, "\n").replace(/\n+$/, "");
  };

  // Fenced code blocks inside component bodies cannot stay as raw backticks
  // (the final marked pass would pair an inner fence with the NEXT fence in
  // the document, swallowing everything in between). Render immediately with
  // the shared code renderer and hand the final pass a placeholder token that
  // is substituted back after marked finishes.
  const fenceRe = /(`{3,})[^\n]*\n[\s\S]*?\1|(~{3,})[^\n]*\n[\s\S]*?\2/g;
  if (!fenceRe.test(trimmed)) return parse(trimmed);

  const renderFence = (raw: string): string => {
    const fm = /^(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\1\s*$/.exec(raw);
    if (!fm) return raw;
    return renderCodeBlock(fm[3].replace(/\n$/, ""), fm[2].trim());
  };

  let out = "";
  let pos = 0;
  fenceRe.lastIndex = 0;
  let m: RegExpExecArray | null = fenceRe.exec(trimmed);
  while (m !== null) {
    out += parse(trimmed.slice(pos, m.index));
    out += `\n@@DMD-FENCE-${fences.length}@@\n`;
    fences.push(renderFence(m[0]));
    pos = m.index + m[0].length;
    m = fenceRe.exec(trimmed);
  }
  out += parse(trimmed.slice(pos));
  return out;
}

const FENCE_PLACEHOLDER_RE = /(?:<p>)?\s*@@DMD-FENCE-(\d+)@@\s*(?:<\/p>)?/g;

export function restoreFencePlaceholders(html: string, fences: string[]): string {
  if (fences.length === 0 || !html?.includes("@@DMD-FENCE-")) return html;
  return html.replace(FENCE_PLACEHOLDER_RE, (_m, idx: string) => fences[Number(idx)] ?? "");
}

function processLevel(src: string, parentTag: string | null, renderer: MdRenderer, fences: string[]): string {
  const prot = protectedRanges(src);
  let out = "";
  let pos = 0;
  while (true) {
    const open = nextOpen(src, pos, prot);
    if (open === null) {
      const tail = src.slice(pos);
      out += parentTag === null ? tail : renderGap(tail, parentTag, renderer, fences);
      break;
    }
    const head = src.slice(pos, open.start);
    out += parentTag === null ? head : renderGap(head, parentTag, renderer, fences);
    if (open.selfClosing) {
      out += open.full;
      pos = open.end;
      continue;
    }
    const close = matchingClose(src, open, prot);
    if (close === null) {
      out += open.full;
      pos = open.end;
      continue;
    }
    const inner = processLevel(src.slice(open.end, close.start), open.tag, renderer, fences);
    out += open.full + inner + close.full;
    pos = close.end;
  }
  return out;
}

export function processComponentBodies(src: string): { html: string; fences: string[] } {
  if (!src?.includes("<") || !/<[A-Z][A-Za-z0-9]*\b/.test(src)) {
    return { html: src, fences: [] };
  }
  const renderer = new marked.Renderer();
  const fences: string[] = [];
  return { html: processLevel(src, null, renderer, fences), fences };
}

export function expandSelfClosingComponents(html: string): string {
  if (!html?.includes("/>")) return html;
  return html.replace(
    /<([A-Z][A-Za-z0-9]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)\/>/g,
    (_m, tag: string, attrs: string) => `<${tag}${attrs}></${tag}>`,
  );
}

const INLINE_TAGS = new Set(["badge", "button", "kbd"]);

export function unwrapBlockComponents(html: string): string {
  if (!html?.includes("<")) return html;
  let out = html.replace(/<p>\s*(<([A-Z][A-Za-z0-9]*)\b)/g, (match, fullTag, tagName) => {
    if (INLINE_TAGS.has(tagName.toLowerCase())) return match;
    return fullTag;
  });
  out = out.replace(/(<\/([A-Z][A-Za-z0-9]*)\s*>)\s*<\/p>/g, (match, fullClose, tagName) => {
    if (INLINE_TAGS.has(tagName.toLowerCase())) return match;
    return fullClose;
  });
  return out;
}
