/**
 * Plain-text conversion for document headings.
 *
 * README-style headings routinely carry badge images, inline code, links, and
 * HTML entities. The page map renders the full inline HTML (from the same
 * pipeline as article headings), while search indexing, document titles, and
 * accessibility strings need the readable plain-text form produced here.
 */

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  trade: "™",
  middot: "·",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  bull: "•",
  deg: "°",
  times: "×",
  plusmn: "±",
  laquo: "«",
  raquo: "»",
  sect: "§",
  para: "¶",
};

function codePointToChar(code: number): string {
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => codePointToChar(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_match, dec: string) => codePointToChar(Number(dec)))
    .replace(/&([a-z][a-z0-9]*);/gi, (match, name: string) => NAMED_HTML_ENTITIES[name.toLowerCase()] ?? match);
}

const IMAGE_PATTERN = /!\[([^\]]*)\]\([^)]*\)/g;
const LINK_PATTERN = /\[([^\]]+)\]\([^)]*\)/g;
const CODE_PATTERN = /`([^`]+)`/g;
const BOLD_PATTERN = /\*\*([^*\n]+)\*\*/g;
const UNDERSCORE_BOLD_PATTERN = /__([^_\n]+)__/g;
const ITALIC_PATTERN = /\*([^*\n]+)\*/g;
const STRIKETHROUGH_PATTERN = /~~([^~\n]+)~~/g;

/** Reduces a heading's raw Markdown to readable plain text. */
export function inlineHeadingToPlainText(raw: string): string {
  return decodeHtmlEntities(
    raw
      .replace(IMAGE_PATTERN, "$1")
      .replace(LINK_PATTERN, "$1")
      .replace(CODE_PATTERN, "$1")
      .replace(BOLD_PATTERN, "$1")
      .replace(UNDERSCORE_BOLD_PATTERN, "$1")
      .replace(ITALIC_PATTERN, "$1")
      .replace(STRIKETHROUGH_PATTERN, "$1"),
  )
    .replace(/\s+/g, " ")
    .trim();
}
