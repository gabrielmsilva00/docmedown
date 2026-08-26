import { marked } from 'marked';
import { DocFrontmatter, DocHeading } from '../types';
import { processAlerts } from './callouts';
import { renderCodeBlock } from './highlighter';
import { renderMath } from './katex';

export interface ParsedMarkdown {
  frontmatter: DocFrontmatter;
  html: string;
  headings: DocHeading[];
  readingTimeMinutes: number;
}

/**
 * Extracts YAML frontmatter without external runtime dependencies for browser friendliness
 */
export function extractFrontmatter(rawMarkdown: string): { frontmatter: DocFrontmatter; content: string } {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const match = rawMarkdown.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, content: rawMarkdown };
  }

  const yamlBlock = match[1];
  const content = rawMarkdown.substring(match[0].length);
  const frontmatter: DocFrontmatter = {};

  const lines = yamlBlock.split('\n');
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.substring(0, colonIdx).trim();
    let value: any = line.substring(colonIdx + 1).trim();

    // Clean quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.substring(1, value.length - 1);
    } else if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    } else if (!isNaN(Number(value)) && value !== '') {
      value = Number(value);
    } else if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .substring(1, value.length - 1)
        .split(',')
        .map((s: string) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    }

    frontmatter[key] = value;
  }

  return { frontmatter, content };
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/[^\w\s-]/g, '') // remove special chars
    .trim()
    .replace(/[\s_-]+/g, '-'); // replace spaces with -
}

export function calculateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const wpm = 200;
  return Math.max(1, Math.ceil(words / wpm));
}

export function parseMarkdown(rawContent: string, currentSlug: string = ''): ParsedMarkdown {
  const { frontmatter, content: rawBody } = extractFrontmatter(rawContent);
  const readingTimeMinutes = calculateReadingTime(rawBody);

  // 1. Process math
  let processed = renderMath(rawBody);

  // 2. Process callouts / alerts
  processed = processAlerts(processed);

  const headings: DocHeading[] = [];
  const headingCounts: Record<string, number> = {};

  const renderer = new marked.Renderer();

  // Custom Heading Renderer
  renderer.heading = ({ tokens, depth }) => {
    const text = marked.parseInline(tokens.map((t) => t.raw).join('')) as string;
    const rawText = tokens.map((t) => (t as any).text || t.raw).join('');
    let slug = slugifyHeading(rawText);

    if (headingCounts[slug]) {
      headingCounts[slug]++;
      slug = `${slug}-${headingCounts[slug]}`;
    } else {
      headingCounts[slug] = 1;
    }

    if (depth <= 3) {
      headings.push({
        level: depth,
        text: rawText,
        id: slug,
      });
    }

    return `
<h${depth} id="${slug}" class="dmd-heading dmd-h${depth}">
  <a href="#/${currentSlug}#${slug}" class="dmd-heading-anchor" aria-hidden="true">#</a>
  <span>${text}</span>
</h${depth}>
`;
  };

  // Custom Code Block Renderer
  renderer.code = ({ text, lang }) => {
    return renderCodeBlock(text, lang || '');
  };

  // Custom Table Renderer
  renderer.table = ({ header, rows }) => {
    let headerHtml = '';
    for (const cell of header) {
      const parsedText = marked.parseInline(cell.text || '') as string;
      headerHtml += `<th>${parsedText}</th>`;
    }
    let bodyHtml = '';
    for (const row of rows) {
      bodyHtml += '<tr>';
      for (const cell of row) {
        const parsedText = marked.parseInline(cell.text || '') as string;
        bodyHtml += `<td>${parsedText}</td>`;
      }
      bodyHtml += '</tr>';
    }

    return `
<div class="dmd-table-wrapper">
  <table class="dmd-table">
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>
</div>
`;
  };

  // Custom Link Renderer
  renderer.link = ({ href, title, text }) => {
    const isExternal = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:');
    let targetHref = href;

    if (!isExternal) {
      // A relative HTML document is a separate documentation site, such as a
      // nested docs root with its own docs.json and .dmd directory.
      if (/\.html(?:#.*)?$/i.test(href)) {
        const titleAttr = title ? ` title="${title}"` : '';
        return `<a href="${href}"${titleAttr} class="dmd-link">${text}</a>`;
      }

      if (href.startsWith('#')) {
        targetHref = `#/${currentSlug}${href}`;
      } else {
        let clean = href.replace(/\.(md|mdx)$/i, '');
        if (clean.startsWith('./')) {
          const currentDir = currentSlug.includes('/') ? currentSlug.substring(0, currentSlug.lastIndexOf('/')) : '';
          clean = currentDir ? `${currentDir}/${clean.replace(/^\.\//, '')}` : clean.replace(/^\.\//, '');
        } else if (!clean.startsWith('/')) {
          const currentDir = currentSlug.includes('/') ? currentSlug.substring(0, currentSlug.lastIndexOf('/')) : '';
          clean = currentDir ? `${currentDir}/${clean}` : clean;
        }
        targetHref = `#/${clean.replace(/^\//, '')}`;
      }
    }

    const titleAttr = title ? ` title="${title}"` : '';
    const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
    const extIcon = isExternal
      ? `<svg class="dmd-ext-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`
      : '';

    return `<a href="${targetHref}"${titleAttr}${targetAttr} class="dmd-link">${text}${extIcon}</a>`;
  };

  const html = marked.parse(processed, {
    renderer,
    gfm: true,
    breaks: false,
  }) as string;

  return {
    frontmatter,
    html,
    headings,
    readingTimeMinutes,
  };
}
