import { marked } from "marked";
import { documentVariant } from "../i18n";
import { HashRouter } from "../router";
import type { DocConfig, DocFrontmatter, DocHeading } from "../types";
import { processAlerts } from "./callouts";
import {
  expandSelfClosingComponents,
  processComponentBodies,
  restoreFencePlaceholders,
  unwrapBlockComponents,
} from "./component-body";
import { extractFrontmatter } from "./frontmatter";
import { renderCodeBlock } from "./highlighter";
import { inlineHeadingToPlainText } from "./inline-text";
import { renderMath } from "./katex";
import { renderTableBlock, type TableAlign } from "./tables";

export interface ParsedMarkdown {
  frontmatter: DocFrontmatter;
  html: string;
  headings: DocHeading[];
  readingTimeMinutes: number;
}

export { extractFrontmatter } from "./frontmatter";

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, "") // remove HTML tags
    .replace(/[^\w\s-]/g, "") // remove special chars
    .trim()
    .replace(/[\s_-]+/g, "-"); // replace spaces with -
}

function calculateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const wpm = 200;
  return Math.max(1, Math.ceil(words / wpm));
}

export function parseMarkdown(rawContent: string, currentSlug: string = "", config?: DocConfig): ParsedMarkdown {
  const { frontmatter, content: rawBody } = extractFrontmatter(rawContent);
  const readingTimeMinutes = calculateReadingTime(rawBody);

  // 1. Process math
  let processed = renderMath(rawBody);

  // 2. Process callouts / alerts
  processed = processAlerts(processed);

  // 3. Parse Markdown bodies inside PascalCase component regions *before*
  // marked runs. marked treats `<Tabs>…</Tabs>` as opaque HTML and would
  // leave inner `**markdown**` literal. processComponentBodies only touches
  // text gaps inside matched regions (fences + inline code stay opaque), and
  // the default inner renderer is block-aware so raw HTML/code blocks pass
  // through while bold, links, tables, lists, and code spans parse normally.
  // Fences inside component bodies render immediately and come back as
  // placeholder tokens — restore them after marked.parse below.
  const componentBodies = processComponentBodies(processed);
  processed = componentBodies.html;

  const headings: DocHeading[] = [];
  const headingIds = new Set<string>();

  const renderer = new marked.Renderer();

  // Custom Heading Renderer
  renderer.heading = ({ tokens, depth }) => {
    const text = marked.parseInline(tokens.map((t) => t.raw).join("")) as string;
    const rawText = tokens.map((t) => (t as any).text || t.raw).join("");
    const baseSlug = slugifyHeading(rawText);
    let slug = baseSlug;
    let suffix = 2;
    while (headingIds.has(slug)) slug = `${baseSlug}-${suffix++}`;
    headingIds.add(slug);

    headings.push({
      level: depth,
      text: inlineHeadingToPlainText(rawText),
      html: text,
      id: slug,
    });

    return `
<h${depth} id="${slug}" class="dmd-heading dmd-h${depth}">
  <a href="#/${currentSlug}#${slug}" class="dmd-heading-anchor" aria-hidden="true">#</a>
  <span>${text}</span>
</h${depth}>
`;
  };

  // Custom Code Block Renderer
  renderer.code = ({ text, lang }) => {
    return renderCodeBlock(text, lang || "");
  };

  // Custom Table Renderer
  renderer.table = (token) => {
    return renderTableBlock({
      header: token.header.map((cell, idx) => ({
        html: marked.parseInline(cell.text || "") as string,
        align: (cell.align || token.align?.[idx] || null) as TableAlign,
      })),
      rows: token.rows.map((row) =>
        row.map((cell, idx) => ({
          html: marked.parseInline(cell.text || "") as string,
          align: (cell.align || token.align?.[idx] || null) as TableAlign,
        })),
      ),
    });
  };

  // Custom Link Renderer
  renderer.link = ({ href, title, text }) => {
    const isExternal = href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:");
    let targetHref = href;

    if (!isExternal) {
      // A relative HTML document is a separate documentation site, such as a
      // nested docs root with its own docs.json and .dmd directory.
      if (/\.html(?:#.*)?$/i.test(href)) {
        const titleAttr = title ? ` title="${title}"` : "";
        return `<a href="${href}"${titleAttr} class="dmd-link">${text}</a>`;
      }

      if (href.startsWith("#")) {
        targetHref = `#/${currentSlug}${href}`;
      } else {
        const clean = href.replace(/\.(md|mdx)$/i, "");
        if (clean.startsWith("/")) {
          targetHref = `#/${clean.replace(/^\/+/, "")}`;
        } else {
          const currentParts = currentSlug.includes("/") ? currentSlug.split("/").slice(0, -1) : [];
          const relParts = clean.split("/");
          const targetParts: string[] = [];
          for (const p of [...currentParts, ...relParts]) {
            if (!p || p === ".") continue;
            if (p === "..") {
              targetParts.pop();
            } else {
              targetParts.push(p);
            }
          }
          targetHref = `#/${targetParts.join("/")}`;
        }
      }
    }

    if (!isExternal) {
      if (config?.i18n) {
        const router = new HashRouter();
        router.i18nConfig = config;
        router.locale = documentVariant(currentSlug, config).locale;
        targetHref = router.resolveLink(href, currentSlug);
        router.destroy();
      }
    }
    const titleAttr = title ? ` title="${title}"` : "";
    const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
    const extIcon = isExternal
      ? `<svg class="dmd-ext-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`
      : "";

    return `<a href="${targetHref}"${titleAttr}${targetAttr} class="dmd-link">${text}${extIcon}</a>`;
  };

  const html = marked.parse(processed, {
    renderer,
    gfm: true,
    breaks: false,
  }) as string;

  // PascalCase self-closers (`<CounterWidget />`) must survive marked as
  // explicit open/close pairs so the DOM keeps component siblings separate.
  const withFencesRestored = restoreFencePlaceholders(html, componentBodies.fences);
  const withExpandedComponents = expandSelfClosingComponents(withFencesRestored);
  const unwrapBlocks = unwrapBlockComponents(withExpandedComponents);

  return {
    frontmatter,
    html: unwrapBlocks,
    headings,
    readingTimeMinutes,
  };
}
