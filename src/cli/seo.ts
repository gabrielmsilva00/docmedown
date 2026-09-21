import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { parseMarkdown } from "../runtime/markdown/parser";
import { renderSplashHead, renderSplashMarkup, type SplashOptions } from "../runtime/splash";
import type { DocConfig, DocFileItem, DocManifest } from "../runtime/types";
import { loadBuildTimeCustomSetup } from "./utils/custom-setup";

const DESCRIPTION_MAX_LENGTH = 160;

export function resolveSplashOptions(config: DocConfig): SplashOptions {
  return {
    name: config.name,
    tagline: config.tagline,
    version: config.version,
    logo: config.theme?.logo?.light,
    logoDark: config.theme?.logo?.dark,
    logoAlt: config.theme?.logo?.alt,
    accent: config.theme?.accentColor,
    accentDark: config.theme?.accentColorDark,
  };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strips tags/entities from rendered HTML for meta descriptions and JSON-LD. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateOnWordBoundary(value: string, maxLength = DESCRIPTION_MAX_LENGTH): string {
  if (value.length <= maxLength) return value;
  const slice = value.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}

function extractSummary(markdown: string): string {
  const withoutFrontmatter = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  for (const block of withoutFrontmatter.split(/\n{2,}/)) {
    const line = block.trim();
    if (!line || line.startsWith("#") || line.startsWith("---") || line.startsWith("<")) continue;
    return truncateOnWordBoundary(
      htmlToPlainText(
        line
          .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
          .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
          .replace(/[*_`>]/g, ""),
      ),
    );
  }
  return "";
}

export function getPageDescription(config: DocConfig, doc: DocFileItem): string {
  return (
    doc.frontmatter?.description ||
    (doc.content ? extractSummary(doc.content) : "") ||
    config.description ||
    config.tagline ||
    ""
  );
}

/** Canonical absolute URL for a document slug, or null when no site origin is configured. */
export function getPageUrl(config: DocConfig, slug: string): string | null {
  if (!config.url) return null;
  const base = config.url.replace(/\/+$/, "");
  return slug === "README" ? `${base}/` : `${base}/${slug}/`;
}

/** Relative asset prefix from a static page directory back to the site root ("../.."). */
export function getAssetPrefix(slug: string): string {
  if (slug === "README") return "";
  // Every document is prerendered at <slug>/index.html, so the page directory
  // sits one level deeper than the slug path itself. Reaching site-root assets
  // ("_docs.js", "docmedown.web.js", "_manifest.json") requires one "../" per
  // slug segment: "examples" → "../", "guides/intro" → "../../".
  return "../".repeat(slug.split("/").length);
}

/** Output path of the prerendered page for a document slug. */
export function getStaticPagePath(slug: string): string {
  return slug === "README" ? "index.html" : `${slug}/index.html`;
}

export interface StaticPageInput {
  config: DocConfig;
  doc: DocFileItem;
  /** Prerendered article HTML from the shared markdown pipeline. */
  contentHtml: string;
}

/** Renders a full standalone HTML page with SEO head tags and the runtime bootstrap. */
export function renderStaticPage({ config, doc, contentHtml }: StaticPageInput): string {
  const slug = doc.slug;
  const assetPrefix = getAssetPrefix(slug);
  const siteName = config.name || "Documentation";
  const title = slug === "README" ? siteName : `${doc.title} | ${siteName}`;
  const description = getPageDescription(config, doc);
  const pageUrl = getPageUrl(config, slug);
  const noindex = doc.frontmatter?.noindex === true || doc.frontmatter?.hidden === true;
  const ogImage = typeof doc.frontmatter?.ogImage === "string" ? doc.frontmatter.ogImage : undefined;
  const ogImageUrl = ogImage
    ? /^https?:\/\//i.test(ogImage)
      ? ogImage
      : pageUrl
        ? `${config.url?.replace(/\/+$/, "")}/${ogImage.replace(/^\/+/, "")}`
        : ogImage
    : undefined;

  const head: string[] = [
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<title>${escapeHtml(title)}</title>`,
  ];
  if (description) head.push(`<meta name="description" content="${escapeHtml(description)}" />`);
  if (noindex) {
    head.push('<meta name="robots" content="noindex, nofollow" />');
  } else if (pageUrl) {
    head.push(`<link rel="canonical" href="${escapeHtml(pageUrl)}" />`);
  }
  head.push('<meta name="generator" content="DocMeDown" />');
  head.push(`<link rel="icon" href="${escapeHtml(config.theme?.favicon || "data:,")}" />`);
  if (config.theme?.accentColor) {
    head.push(`<meta name="theme-color" content="${escapeHtml(config.theme.accentColor)}" />`);
  }
  head.push('<meta property="og:type" content="website" />');
  head.push(`<meta property="og:site_name" content="${escapeHtml(siteName)}" />`);
  head.push(`<meta property="og:title" content="${escapeHtml(title)}" />`);
  if (description) head.push(`<meta property="og:description" content="${escapeHtml(description)}" />`);
  if (pageUrl) head.push(`<meta property="og:url" content="${escapeHtml(pageUrl)}" />`);
  if (ogImageUrl) head.push(`<meta property="og:image" content="${escapeHtml(ogImageUrl)}" />`);
  head.push('<meta name="twitter:card" content="summary" />');
  head.push(`<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  if (description) head.push(`<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  if (ogImageUrl) head.push(`<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />`);

  if (pageUrl && !noindex) {
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", name: siteName, url: `${config.url?.replace(/\/+$/, "")}/` },
        {
          "@type": "TechArticle",
          headline: doc.title,
          ...(description ? { description } : {}),
          url: pageUrl,
          ...(doc.lastModified ? { dateModified: doc.lastModified } : {}),
          ...(doc.readingTimeMinutes ? { timeRequired: `PT${doc.readingTimeMinutes}M` } : {}),
        },
      ],
    };
    head.push(`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`);
  }

  const runtimeGlobals = `<script>window.__DOCMEDOWN_STATIC_SLUG__=${JSON.stringify(slug)};window.__DOCMEDOWN_STATIC_BASE__=${JSON.stringify(assetPrefix)};</script>`;
  // Root pages keep the same-directory "./" convention used by the standard shell.
  const assetSrc = assetPrefix || "./";
  const splash = resolveSplashOptions({ ...config, name: siteName });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${head.join("\n  ")}
  ${renderSplashHead(splash)}
</head>
<body>
  ${renderSplashMarkup(splash)}
  <div id="dmd-app"><article class="dmd-static-doc">${contentHtml}</article></div>
  ${runtimeGlobals}
  <script src="${assetSrc}_docs.js"></script>
  <script src="${assetSrc}docmedown.web.js" data-docmedown-runtime></script>
</body>
</html>
`;
}

/** Renders the static 404 page: a standard shell whose runtime renders the not-found state. */
export function renderStatic404Page(config: DocConfig): string {
  const siteName = config.name || "Documentation";
  const splash = resolveSplashOptions({ ...config, name: siteName });
  const runtimeGlobals =
    '<script>window.__DOCMEDOWN_STATIC_SLUG__="README";window.__DOCMEDOWN_STATIC_BASE__="";</script>';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Page not found | ${escapeHtml(siteName)}</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="generator" content="DocMeDown" />
  <link rel="icon" href="data:," />
  ${renderSplashHead(splash)}
</head>
<body>
  ${renderSplashMarkup(splash)}
  <div id="dmd-app"><article class="dmd-static-doc"><h1>Page not found</h1><p>The page you requested does not exist. <a href="./">Return to the documentation home page</a>.</p></article></div>
  ${runtimeGlobals}
  <script src="./_docs.js"></script>
  <script src="./docmedown.web.js" data-docmedown-runtime></script>
</body>
</html>
`;
}

export function generateSitemap(manifest: DocManifest, config: DocConfig): string | null {
  if (!config.url) return null;
  const rows: string[] = [];
  for (const doc of manifest.docs) {
    if (doc.frontmatter?.hidden || doc.frontmatter?.noindex) continue;
    const url = getPageUrl(config, doc.slug);
    if (!url) continue;
    rows.push(
      [
        "  <url>",
        `    <loc>${escapeHtml(url)}</loc>`,
        ...(doc.lastModified ? [`    <lastmod>${doc.lastModified}</lastmod>`] : []),
        "  </url>",
      ].join("\n"),
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}

export function generateRobotsTxt(config: DocConfig): string | null {
  if (!config.url) return null;
  const base = config.url.replace(/\/+$/, "");
  return `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`;
}

export interface StaticSiteEmitResult {
  /** Paths of written page files, relative to the documentation root. */
  written: string[];
  /** True when the prerendered home page was skipped because index.html is a custom shell. */
  homeSkipped: boolean;
}

/**
 * Prerenders every manifest document into `<slug>/index.html` under the
 * documentation directory and emits the SEO support files. The home page
 * overwrites the standard `index.html` runtime shell but never a custom one.
 */
export function emitStaticSite(
  targetDir: string,
  manifest: DocManifest,
  docsMap: Record<string, string>,
  config: DocConfig,
): StaticSiteEmitResult {
  const written: string[] = [];
  let homeSkipped = false;
  loadBuildTimeCustomSetup(path.join(targetDir, ".dmd"));

  for (const doc of manifest.docs) {
    if (doc.frontmatter?.hidden === true) continue;
    const raw = docsMap[doc.slug] ?? docsMap[doc.path] ?? doc.content ?? "";
    const parsed = parseMarkdown(raw, doc.slug);
    const pagePath = getStaticPagePath(doc.slug);

    if (doc.slug === "README") {
      const existingPath = path.join(targetDir, "index.html");
      if (fs.existsSync(existingPath) && !fs.readFileSync(existingPath, "utf-8").includes("data-docmedown-runtime")) {
        homeSkipped = true;
        continue;
      }
    }

    const html = renderStaticPage({ config, doc, contentHtml: parsed.html });
    const outPath = path.join(targetDir, pagePath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, "utf-8");
    written.push(pagePath);
  }

  fs.writeFileSync(path.join(targetDir, "404.html"), renderStatic404Page(config), "utf-8");

  const sitemap = generateSitemap(manifest, config);
  if (sitemap) fs.writeFileSync(path.join(targetDir, "sitemap.xml"), sitemap, "utf-8");
  const robots = generateRobotsTxt(config);
  if (robots) fs.writeFileSync(path.join(targetDir, "robots.txt"), robots, "utf-8");

  console.log(chalk.green(`  ✔ Prerendered ${written.length} static page${written.length === 1 ? "" : "s"}`));
  if (config.url) {
    console.log(chalk.green(`  ✔ Generated sitemap.xml and robots.txt for ${config.url}`));
  } else {
    console.log(chalk.dim('    Set "url" in docs.json to also generate sitemap.xml, robots.txt, and canonical URLs.'));
  }
  if (homeSkipped) {
    console.log(
      chalk.yellow(
        "  ⚠ Skipped prerendering the home page: index.html is a custom shell without the standard DocMeDown runtime tag.",
      ),
    );
  }

  return { written, homeSkipped };
}
