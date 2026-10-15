import { escapeHtml } from "./escape";

/**
 * Table rendering and export helpers.
 *
 * Both GFM pipe tables and ```csv / ```tsv fences render through
 * `renderTableBlock`, so they share one structure: a slim toolbar (caption +
 * "Copy" dropdown) above a scrollable `<table>`. The export functions work on
 * plain `TableData` read back from the rendered DOM, so what you copy is what
 * you see regardless of the source format.
 */

export type TableAlign = "left" | "center" | "right" | null;

export interface TableCell {
  /** Ready-to-insert HTML for the cell. */
  html: string;
  align?: TableAlign;
}

export interface TableData {
  /** Plain-text header cells. Empty when the table has no header row. */
  headers: string[];
  rows: string[][];
  aligns: TableAlign[];
}

const TABLE_ICON =
  '<svg class="dmd-table-caption-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>';
const COPY_ICON =
  '<svg class="copy-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
const CHECK_ICON =
  '<svg class="check-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
const CHEVRON_ICON =
  '<svg class="dmd-table-copy-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

const TABLE_COPY_FORMATS = [
  { id: "markdown", label: "Markdown", badge: "MD", description: "For documents" },
  { id: "html", label: "HTML", badge: "&lt;&gt;", description: "For web pages" },
  { id: "csv", label: "CSV", badge: "CSV", description: "For spreadsheets" },
] as const;

export type TableCopyFormat = (typeof TABLE_COPY_FORMATS)[number]["id"];

function alignAttr(align: TableAlign | undefined): string {
  return align ? ` data-align="${align}"` : "";
}

/** Builds the full table block markup (toolbar + scroll wrapper + table). */
export function renderTableBlock(options: {
  header: TableCell[] | null;
  rows: TableCell[][];
  caption?: string;
}): string {
  const { header, rows, caption } = options;
  const head = header?.length
    ? `<thead><tr>${header.map((cell) => `<th${alignAttr(cell.align)}>${cell.html}</th>`).join("")}</tr></thead>`
    : "";
  const body = `<tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td${alignAttr(cell.align)}>${cell.html}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;

  const items = TABLE_COPY_FORMATS.map(
    (format) =>
      `<button type="button" class="dmd-table-copy-item" role="menuitem" tabindex="-1" data-dmd-table-copy="${format.id}" title="Copy as ${format.label} (${format.description.toLowerCase()})"><span class="dmd-table-copy-format">${format.badge}</span><span class="dmd-table-copy-text"><span class="dmd-table-copy-name">${format.label}</span><span class="dmd-table-copy-description">${format.description}</span></span></button>`,
  ).join("");
  const columns = Math.max(header?.length ?? 0, ...rows.map((row) => row.length), 0);
  const summary = `${rows.length} ${rows.length === 1 ? "row" : "rows"} · ${columns} ${columns === 1 ? "column" : "columns"}`;

  return `
<div class="dmd-table-block" data-dmd-table>
  <div class="dmd-table-toolbar">
    <span class="dmd-table-caption">${TABLE_ICON}${caption ? `<span class="dmd-table-caption-text">${escapeHtml(caption)}</span>` : ""}<span class="dmd-table-dimensions">${summary}</span></span>
    <div class="dmd-table-copy">
      <button type="button" class="dmd-table-copy-btn" data-dmd-table-toggle aria-haspopup="menu" aria-expanded="false" title="Copy table (Markdown, HTML, CSV)">${COPY_ICON}${CHECK_ICON}<span class="dmd-table-copy-btn-text">Copy</span><span class="dmd-table-copy-label dmd-sr-only">Copy table</span>${CHEVRON_ICON}</button>
      <div class="dmd-table-copy-menu" role="menu" aria-label="Copy table as" hidden>${items}</div>
      <span class="dmd-sr-only" data-dmd-table-status role="status" aria-live="polite"></span>
    </div>
  </div>
  <div class="dmd-table-wrapper">
    <table class="dmd-table">
      ${head}
      ${body}
    </table>
  </div>
</div>
`;
}

// ---------------------------------------------------------------------------
// Delimited text (CSV / TSV)
// ---------------------------------------------------------------------------

const DELIMITER_NAMES: Record<string, string> = {
  comma: ",",
  semicolon: ";",
  tab: "\t",
  pipe: "|",
};

/** Resolves a `delimiter=` option (`;`, `tab`, `pipe`, …). */
function resolveDelimiter(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const named = DELIMITER_NAMES[value.toLowerCase()];
  if (named) return named;
  if (value === "\\t") return "\t";
  return value.length === 1 ? value : fallback;
}

/** Picks the most frequent candidate delimiter on the first non-empty line. */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";
  let best = ",";
  let bestCount = 0;
  for (const candidate of [",", ";", "\t", "|"]) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

/**
 * RFC 4180-style parser: quoted fields, escaped quotes (`""`), delimiters and
 * newlines inside quotes, CRLF or LF row breaks. Blank lines are skipped.
 */
export function parseDelimited(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let touched = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    if (row.some((cell) => cell.trim() !== "") || row.length > 1) rows.push(row);
    row = [];
    touched = false;
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && field === "") {
      inQuotes = true;
      touched = true;
    } else if (char === delimiter) {
      endField();
      touched = true;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else {
      field += char;
      touched = true;
    }
  }
  if (touched || field !== "" || row.length > 0) endRow();
  return rows;
}

function readOption(infoString: string, name: string): string | undefined {
  const quoted = new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`).exec(infoString);
  if (quoted) return quoted[1] ?? quoted[2];
  return new RegExp(`\\b${name}=([^\\s"']+)`).exec(infoString)?.[1];
}

const NUMERIC = /^[-+]?(?:\d{1,3}(?:[,_]\d{3})+|\d+)?(?:\.\d+)?%?$/;

function isNumericColumn(values: string[]): boolean {
  const filled = values.map((value) => value.trim()).filter((value) => value !== "");
  return filled.length > 0 && filled.every((value) => NUMERIC.test(value) && /\d/.test(value));
}

/**
 * Renders a ```csv / ```tsv fence as a table block.
 *
 * Fence options: `title="Caption"`, `header=false`, `delimiter=";"|tab|pipe`
 * (CSV auto-detects `, ; tab |` when omitted), `markdown=true` to parse cells
 * as inline Markdown (cells are plain text by default so data stays literal).
 * Columns that are entirely numeric are right-aligned.
 */
export function renderDelimitedBlock(
  code: string,
  infoString: string,
  lang: "csv" | "tsv",
  renderInline: (source: string) => string,
): string {
  const explicit = readOption(infoString, "delimiter");
  const delimiter =
    lang === "tsv"
      ? resolveDelimiter(explicit, "\t")
      : explicit
        ? resolveDelimiter(explicit, ",")
        : detectDelimiter(code);
  const records = parseDelimited(code, delimiter);
  const hasHeader = readOption(infoString, "header")?.toLowerCase() !== "false";
  const useMarkdown = readOption(infoString, "markdown")?.toLowerCase() === "true";
  const caption = readOption(infoString, "title");

  if (records.length === 0) {
    return renderTableBlock({ header: null, rows: [], caption });
  }

  const width = Math.max(...records.map((record) => record.length));
  const padded = records.map((record) => [...record, ...Array(width - record.length).fill("")]);
  const headerRow: string[] | null = hasHeader ? (padded[0] ?? null) : null;
  const bodyRows: string[][] = hasHeader ? padded.slice(1) : padded;

  const aligns: TableAlign[] = Array.from({ length: width }, (_, col) =>
    isNumericColumn(bodyRows.map((row) => row[col])) ? "right" : null,
  );
  const toHtml = (value: string) => (useMarkdown ? renderInline(value) : escapeHtml(value));

  return renderTableBlock({
    header: headerRow ? headerRow.map((value, col) => ({ html: toHtml(value), align: aligns[col] })) : null,
    rows: bodyRows.map((row) => row.map((value, col) => ({ html: toHtml(value), align: aligns[col] }))),
    caption,
  });
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function columnCount(data: TableData): number {
  return Math.max(data.headers.length, ...data.rows.map((row) => row.length), 0);
}

function cells(row: string[], width: number): string[] {
  return Array.from({ length: width }, (_, i) => row[i] ?? "");
}

export function tableToCsv(data: TableData): string {
  const quote = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const width = columnCount(data);
  const lines: string[][] = [];
  if (data.headers.length) lines.push(cells(data.headers, width));
  for (const row of data.rows) lines.push(cells(row, width));
  return lines.map((line) => line.map(quote).join(",")).join("\n");
}

export function tableToMarkdown(data: TableData): string {
  const width = columnCount(data);
  const clean = (value: string) => value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>").trim();
  const line = (row: string[]) => `| ${cells(row, width).map(clean).join(" | ")} |`;
  const divider = Array.from({ length: width }, (_, i) => {
    const align = data.aligns[i];
    if (align === "center") return ":---:";
    if (align === "right") return "---:";
    if (align === "left") return ":---";
    return "---";
  });
  return [line(data.headers), `| ${divider.join(" | ")} |`, ...data.rows.map(line)].join("\n");
}

export function tableToHtml(data: TableData): string {
  const width = columnCount(data);
  const attr = (i: number) => (data.aligns[i] ? ` style="text-align: ${data.aligns[i]}"` : "");
  const row = (tag: "th" | "td", values: string[]) =>
    `    <tr>\n${cells(values, width)
      .map((value, i) => `      <${tag}${attr(i)}>${escapeHtml(value)}</${tag}>`)
      .join("\n")}\n    </tr>`;
  const head = data.headers.length ? `  <thead>\n${row("th", data.headers)}\n  </thead>\n` : "";
  const body = `  <tbody>\n${data.rows.map((values) => row("td", values)).join("\n")}\n  </tbody>`;
  return `<table>\n${head}${body}\n</table>`;
}

export function formatTable(data: TableData, format: TableCopyFormat): string {
  if (format === "csv") return tableToCsv(data);
  if (format === "html") return tableToHtml(data);
  return tableToMarkdown(data);
}

/** Reads plain-text table data back out of a rendered `.dmd-table-block`. */
export function readTableData(table: HTMLTableElement): TableData {
  const text = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();
  const readAlign = (el: Element): TableAlign => {
    const value = el.getAttribute("data-align");
    return value === "left" || value === "center" || value === "right" ? value : null;
  };
  const headRow = table.querySelector("thead tr");
  const headers = headRow ? Array.from(headRow.children).map(text) : [];
  const aligns = headRow
    ? Array.from(headRow.children).map(readAlign)
    : Array.from(table.querySelector("tbody tr")?.children ?? []).map(readAlign);
  const rows = Array.from(table.querySelectorAll("tbody tr")).map((tr) => Array.from(tr.children).map(text));
  return { headers, rows, aligns };
}
