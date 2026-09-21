import fs from "node:fs";
import path from "node:path";
import type { DocConfig, DocManifest } from "../runtime/types";

/**
 * Converts markdown to readable plain text: frontmatter removed, images
 * reduced to alt text, links reduced to labels, emphasis markers stripped,
 * HTML tags removed, and whitespace collapsed. Code fences are preserved as
 * indented text so agent consumers still see code content.
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
    .replace(/```[\s\S]*?```/g, (block) =>
      block
        .replace(/^```.*$/gm, "")
        .split("\n")
        .map((line) => (line.trim() ? `    ${line}` : line))
        .join("\n"),
    )
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_>|]/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function siteBaseUrl(config: DocConfig): string | null {
  return config.url ? config.url.replace(/\/+$/, "") : null;
}

/** Public URL (absolute when a site origin is configured) for a document slug. */
export function getDocUrl(config: DocConfig, slug: string): string {
  const path_ = slug === "README" ? "" : `${slug}/`;
  const base = siteBaseUrl(config);
  return base ? `${base}/${path_}` : `/${path_}`;
}

function docSummary(content: string | undefined): string {
  if (!content) return "";
  const withoutFrontmatter = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  for (const block of withoutFrontmatter.split(/\n{2,}/)) {
    const line = block.trim();
    if (!line || line.startsWith("#") || line.startsWith("---") || line.startsWith("<")) continue;
    const plain = markdownToPlainText(line).replace(/\s+/g, " ");
    return plain.length > 200 ? `${plain.slice(0, 200).trimEnd()}…` : plain;
  }
  return "";
}

/**
 * llmstxt.org-format index of the documentation corpus: short, link-only,
 * with one-line summaries so models can decide what to fetch.
 */
export function generateLlmsTxt(manifest: DocManifest, config: DocConfig): string {
  const lines: string[] = [`# ${config.name || "Documentation"}`];
  if (config.description || config.tagline) {
    lines.push("", `> ${config.description || config.tagline}`);
  }
  lines.push("", "## Docs", "");
  for (const doc of manifest.docs) {
    if (doc.frontmatter?.hidden === true) continue;
    const summary = doc.frontmatter?.description || docSummary(doc.content);
    lines.push(`- [${doc.title}](${getDocUrl(config, doc.slug)})${summary ? `: ${summary}` : ""}`);
  }
  return `${lines.join("\n")}\n`;
}

/** The full corpus as plain markdown — one section per document. */
export function generateLlmsFullTxt(manifest: DocManifest, config: DocConfig): string {
  const chunks: string[] = [`# ${config.name || "Documentation"}`];
  if (config.description || config.tagline) {
    chunks.push(`> ${config.description || config.tagline}`);
  }
  for (const doc of manifest.docs) {
    if (doc.frontmatter?.hidden === true) continue;
    const raw = (doc.content || "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
    chunks.push(`## ${doc.title}\n\nURL: ${getDocUrl(config, doc.slug)}\n\n${raw}`);
  }
  return `${chunks.join("\n\n---\n\n")}\n`;
}

/** Agent Skill file (SKILL.md) so coding assistants can discover and use the docs. */
export function generateSkillMd(manifest: DocManifest, config: DocConfig): string {
  const skillName =
    (config.name || "documentation")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "documentation";
  const description = config.description || config.tagline || `Reference documentation for ${config.name}.`;

  const lines = [
    "---",
    `name: ${skillName}`,
    `description: ${description.replace(/\n/g, " ")}`,
    "---",
    "",
    `# ${config.name || "Documentation"}`,
    "",
    "This is a DocMeDown-generated documentation corpus. Use it to answer questions about the documented project.",
    "",
    "## How to use this skill",
    "",
    "1. Consult the document list below and read the most relevant documents in full.",
    "2. Prefer quoting the document's own headings when citing.",
    "3. If information is missing, say so instead of guessing.",
    "",
    "## Documents",
    "",
  ];
  for (const doc of manifest.docs) {
    if (doc.frontmatter?.hidden === true) continue;
    const summary = doc.frontmatter?.description || docSummary(doc.content);
    lines.push(`- [${doc.title}](${getDocUrl(config, doc.slug)})${summary ? `: ${summary}` : ""}`);
  }
  return `${lines.join("\n")}\n`;
}

/** Versioned machine-readable bundle (Open-Knowledge-Format style) for agents and tooling. */
export function generateOkfBundle(manifest: DocManifest, config: DocConfig): string {
  const bundle = {
    format: "docmedown-okf",
    version: 1,
    generatedAt: manifest.generatedAt,
    site: {
      name: config.name,
      description: config.description || config.tagline || "",
      url: config.url ?? null,
      generator: "docmedown",
    },
    documents: manifest.docs
      .filter((doc) => doc.frontmatter?.hidden !== true)
      .map((doc) => ({
        slug: doc.slug,
        path: doc.path,
        title: doc.title,
        category: doc.category ?? null,
        description: doc.frontmatter?.description ?? docSummary(doc.content) ?? "",
        headings: doc.headings.map((heading) => ({ level: heading.level, text: heading.text, id: heading.id })),
        readingTimeMinutes: doc.readingTimeMinutes ?? null,
        lastModified: doc.lastModified ?? null,
        plainText: markdownToPlainText(doc.content || ""),
      })),
  };
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

/** Writes all AI context files into the documentation root and returns their paths. */
export function emitAiContextFiles(targetDir: string, manifest: DocManifest, config: DocConfig): string[] {
  const files: Array<[string, string]> = [
    ["llms.txt", generateLlmsTxt(manifest, config)],
    ["llms-full.txt", generateLlmsFullTxt(manifest, config)],
    ["SKILL.md", generateSkillMd(manifest, config)],
    ["okf.json", generateOkfBundle(manifest, config)],
  ];
  const written: string[] = [];
  for (const [name, content] of files) {
    const outPath = path.join(targetDir, name);
    fs.writeFileSync(outPath, content, "utf-8");
    written.push(outPath);
  }
  return written;
}
