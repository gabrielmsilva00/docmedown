import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import matter from "gray-matter";
import { normalizeConfig } from "../../runtime/config";
import { docConfigSchema } from "../../runtime/config-schema";
import { getEmbeddedDmdDoc } from "../../runtime/embedded-dmd";
import { collectVariants, documentVariant } from "../../runtime/i18n";
import { resolveExistingConfigPath } from "../utils/docs-layout";
import { extractHeadings, scanDirectory } from "../utils/scanner";

interface ValidationError {
  file: string;
  line?: number;
  message: string;
  type: "config" | "frontmatter" | "link" | "anchor";
}

interface ValidationWarning {
  file: string;
  line?: number;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats: {
    docs: number;
    links: number;
    headings: number;
  };
}

export interface ValidateOptions {
  json?: boolean;
  silent?: boolean;
  exitOnError?: boolean;
}

/**
 * Extracts links from markdown lines while ignoring code fences.
 */
function extractLinksFromMarkdown(
  content: string,
): Array<{ text: string; url: string; line: number; isImage: boolean }> {
  const links: Array<{ text: string; url: string; line: number; isImage: boolean }> = [];
  const lines = content.split("\n");
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) continue;

    // Strip inline code spans from consideration so markdown syntax examples are not validated as real links
    const sanitizedLine = line.replace(/`[^`]*`/g, "");

    // Match markdown links: [text](url) and ![alt](url)
    const mdLinkRegex = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
    for (const match of sanitizedLine.matchAll(mdLinkRegex)) {
      links.push({
        isImage: match[1] === "!",
        text: match[2],
        url: match[3],
        line: i + 1,
      });
    }

    // Match HTML href / src links
    const htmlHrefRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
    for (const match of sanitizedLine.matchAll(htmlHrefRegex)) {
      links.push({
        isImage: false,
        text: match[2],
        url: match[1],
        line: i + 1,
      });
    }

    const htmlImgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    for (const match of sanitizedLine.matchAll(htmlImgRegex)) {
      links.push({
        isImage: true,
        text: "",
        url: match[1],
        line: i + 1,
      });
    }

    const mediaTagRegex = /<(?:Media|dmd-media)\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    for (const match of sanitizedLine.matchAll(mediaTagRegex)) {
      links.push({
        isImage: true,
        text: "",
        url: match[1],
        line: i + 1,
      });
    }
  }

  return links;
}

/**
 * Extracts all anchor IDs from headings and HTML anchors in markdown content.
 */
function extractAllAnchors(content: string): Set<string> {
  const anchors = new Set<string>();
  const headings = extractHeadings(content);
  for (const h of headings) {
    anchors.add(h.id.toLowerCase());
  }

  // Also check for explicit HTML anchors <a id="..." or name="...">
  const htmlAnchorRegex = /<a\s+[^>]*(?:id|name)=["']([^"']+)["']/gi;
  for (const match of content.matchAll(htmlAnchorRegex)) {
    anchors.add(match[1].toLowerCase());
  }

  return anchors;
}

/**
 * Validates documentation directory: docs.json schema, frontmatter, and markdown links/anchors.
 */
export async function validateCommand(
  targetDirArg: string = "./docs",
  options: ValidateOptions = {},
): Promise<ValidationResult> {
  const targetDir = path.resolve(process.cwd(), targetDirArg);
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let linksChecked = 0;
  let headingsFound = 0;

  if (!fs.existsSync(targetDir)) {
    const error: ValidationError = {
      file: targetDirArg,
      message: `Documentation directory does not exist: ${targetDir}`,
      type: "config",
    };
    errors.push(error);
    if (!options.silent) {
      if (options.json) {
        console.log(
          JSON.stringify({ valid: false, errors, warnings, stats: { docs: 0, links: 0, headings: 0 } }, null, 2),
        );
      } else {
        console.error(chalk.red(`✖ ${error.message}`));
      }
    }
    if (options.exitOnError && typeof process !== "undefined") {
      process.exitCode = 1;
    }
    return { valid: false, errors, warnings, stats: { docs: 0, links: 0, headings: 0 } };
  }

  // 1. Validate docs.json / dmd.json schema (new `.dmd/.config/` default first).
  const foundConfig = resolveExistingConfigPath(targetDir);
  let configPath: string | null = null;

  if (fs.existsSync(foundConfig)) {
    configPath = foundConfig;
  }

  if (configPath) {
    const relConfig = path.relative(process.cwd(), configPath);
    try {
      const rawConfig = fs.readFileSync(configPath, "utf-8");
      const parsedJson = JSON.parse(rawConfig);

      if (parsedJson?.theme?.preset) {
        errors.push({
          file: relConfig,
          message:
            'Deprecated "theme.preset" detected. Use "theme.family" instead (atlas, blueprint, terminal, editorial, botanical, studio).',
          type: "config",
        });
      }

      const parseResult = docConfigSchema.safeParse(parsedJson);
      if (!parseResult.success) {
        for (const issue of parseResult.error.issues) {
          const fieldPath = issue.path.join(".") || "(root)";
          errors.push({
            file: relConfig,
            message: `Invalid configuration at "${fieldPath}": ${issue.message}`,
            type: "config",
          });
        }
      }
    } catch (err) {
      errors.push({
        file: relConfig,
        message: `Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`,
        type: "config",
      });
    }
  } else {
    warnings.push({
      file: targetDirArg,
      message: "No docs.json or dmd.json configuration file found. Using default DocMeDown settings.",
    });
  }

  // 2. Discover markdown documents
  const docFiles = scanDirectory(targetDir);
  let i18nConfig = normalizeConfig();
  try {
    if (configPath) i18nConfig = normalizeConfig(JSON.parse(fs.readFileSync(configPath, "utf-8")));
    collectVariants(docFiles, i18nConfig);
    const seen = new Map<string, string>();
    for (const file of docFiles) {
      const variant = documentVariant(file, i18nConfig);
      const key = `${variant.docId}:${variant.locale}`;
      const previous = seen.get(key);
      if (previous)
        warnings.push({
          file,
          message: `Duplicate original variant: ${previous} and ${file}; explicit locale suffix takes precedence.`,
        });
      seen.set(key, file);
    }
  } catch (error) {
    errors.push({ file: configPath || targetDirArg, message: String(error), type: "config" });
  }
  const docMap = new Map<string, { fullPath: string; content: string; anchors: Set<string> }>();

  // First pass: parse frontmatter and index all headings/anchors
  for (const relFile of docFiles) {
    const fullPath = path.join(targetDir, relFile);
    let rawContent = "";
    try {
      rawContent = fs.readFileSync(fullPath, "utf-8");
    } catch (err) {
      errors.push({
        file: relFile,
        message: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
        type: "frontmatter",
      });
      continue;
    }

    let parsedMatter: matter.GrayMatterFile<string>;
    try {
      parsedMatter = matter(rawContent, {});
    } catch (err) {
      errors.push({
        file: relFile,
        message: `Malformed frontmatter YAML syntax: ${err instanceof Error ? err.message : String(err)}`,
        type: "frontmatter",
      });
      // Fall back to raw content for link checking
      parsedMatter = { data: {}, content: rawContent } as any;
    }

    // Validate frontmatter properties
    const data = parsedMatter.data || {};
    if (data.title !== undefined && typeof data.title !== "string") {
      errors.push({
        file: relFile,
        message: `Frontmatter "title" must be a string, got ${typeof data.title}`,
        type: "frontmatter",
      });
    }
    if (data.sidebar_label !== undefined && typeof data.sidebar_label !== "string") {
      errors.push({
        file: relFile,
        message: `Frontmatter "sidebar_label" must be a string, got ${typeof data.sidebar_label}`,
        type: "frontmatter",
      });
    }
    if (data.description !== undefined && typeof data.description !== "string") {
      errors.push({
        file: relFile,
        message: `Frontmatter "description" must be a string, got ${typeof data.description}`,
        type: "frontmatter",
      });
    }
    if (data.category !== undefined && typeof data.category !== "string") {
      errors.push({
        file: relFile,
        message: `Frontmatter "category" must be a string, got ${typeof data.category}`,
        type: "frontmatter",
      });
    }
    if (data.order !== undefined && typeof data.order !== "number") {
      errors.push({
        file: relFile,
        message: `Frontmatter "order" must be a number, got ${typeof data.order}`,
        type: "frontmatter",
      });
    }
    if (data.hidden !== undefined && typeof data.hidden !== "boolean") {
      errors.push({
        file: relFile,
        message: `Frontmatter "hidden" must be a boolean, got ${typeof data.hidden}`,
        type: "frontmatter",
      });
    }
    if (data.noindex !== undefined && typeof data.noindex !== "boolean") {
      errors.push({
        file: relFile,
        message: `Frontmatter "noindex" must be a boolean, got ${typeof data.noindex}`,
        type: "frontmatter",
      });
    }
    if (data.tags !== undefined && !Array.isArray(data.tags)) {
      errors.push({
        file: relFile,
        message: `Frontmatter "tags" must be an array of strings, got ${typeof data.tags}`,
        type: "frontmatter",
      });
    }

    const anchors = extractAllAnchors(parsedMatter.content);
    headingsFound += anchors.size;

    // Index by relative path and clean slug
    const cleanSlug = relFile.replace(/\.(md|mdx)$/i, "");
    docMap.set(relFile.toLowerCase(), { fullPath, content: parsedMatter.content, anchors });
    docMap.set(cleanSlug.toLowerCase(), { fullPath, content: parsedMatter.content, anchors });
    if (cleanSlug.toLowerCase() === "readme" || cleanSlug.toLowerCase() === "index") {
      docMap.set("", { fullPath, content: parsedMatter.content, anchors });
    }
  }

  // Second pass: validate all links and anchors
  for (const relFile of docFiles) {
    const fullPath = path.join(targetDir, relFile);
    const docData = docMap.get(relFile.toLowerCase());
    if (!docData) continue;

    const links = extractLinksFromMarkdown(docData.content);
    const fileDir = path.dirname(fullPath);

    for (const link of links) {
      linksChecked++;
      const rawUrl = link.url.trim();

      // Skip external protocols and data URLs
      if (/^(?:https?:|mailto:|tel:|ftp:|javascript:|data:)/i.test(rawUrl)) {
        continue;
      }

      // Separate path from anchor
      const hashIndex = rawUrl.indexOf("#");
      let urlPath = hashIndex === -1 ? rawUrl : rawUrl.substring(0, hashIndex);
      const anchor = hashIndex === -1 ? null : rawUrl.substring(hashIndex + 1);

      // Clean query params if any
      const queryIndex = urlPath.indexOf("?");
      if (queryIndex !== -1) {
        urlPath = urlPath.substring(0, queryIndex);
      }

      // Case 1: Same-document anchor: e.g. #section-name
      if (!urlPath && anchor) {
        const normalizedAnchor = anchor.toLowerCase();
        if (!docData.anchors.has(normalizedAnchor)) {
          errors.push({
            file: relFile,
            line: link.line,
            message: `Broken local anchor: "#${anchor}" does not exist in this document`,
            type: "anchor",
          });
        }
        continue;
      }

      // Case 2: File link (with or without anchor)
      if (urlPath) {
        // Resolve target file path
        let resolvedFile: string | null = null;

        // Try relative to current markdown file
        const candidateRelative = path.resolve(fileDir, urlPath);
        // Try relative to docs root (if starting with /)
        const candidateRoot = path.resolve(targetDir, urlPath.replace(/^\//, ""));

        const candidates = [
          candidateRelative,
          candidateRoot,
          `${candidateRelative}.md`,
          `${candidateRelative}.mdx`,
          path.join(candidateRelative, "README.md"),
          path.join(candidateRelative, "index.md"),
          `${candidateRoot}.md`,
          `${candidateRoot}.mdx`,
          path.join(candidateRoot, "README.md"),
          path.join(candidateRoot, "index.md"),
        ];

        // Also check if target is an html link pointing to a markdown source (e.g. ./guide.html -> ./guide.md)
        if (urlPath.endsWith(".html")) {
          const stripped = urlPath.replace(/\.html$/, "");
          candidates.push(
            path.resolve(fileDir, `${stripped}.md`),
            path.resolve(targetDir, `${stripped.replace(/^\//, "")}.md`),
          );
        }

        for (const candidate of candidates) {
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            resolvedFile = candidate;
            break;
          }
        }

        if (!resolvedFile) {
          const embeddedCandidate = getEmbeddedDmdDoc(urlPath);
          if (embeddedCandidate) {
            if (anchor) {
              const anchors = extractAllAnchors(embeddedCandidate);
              if (!anchors.has(anchor.toLowerCase())) {
                errors.push({
                  file: relFile,
                  line: link.line,
                  message: `Broken anchor link: "${rawUrl}" (anchor "#${anchor}" does not exist in target document)`,
                  type: "anchor",
                });
              }
            }
            continue;
          }

          errors.push({
            file: relFile,
            line: link.line,
            message: `Broken link: "${rawUrl}" (target file does not exist on disk)`,
            type: "link",
          });
          continue;
        }

        // If target file is a markdown document and an anchor was requested, verify the anchor exists in target
        if (anchor && /\.(md|mdx)$/i.test(resolvedFile)) {
          const targetRel = path.relative(targetDir, resolvedFile).replace(/\\/g, "/").toLowerCase();
          let targetDoc = docMap.get(targetRel);
          if (!targetDoc) {
            // Read target file on the fly if not in manifest
            try {
              const targetRaw = fs.readFileSync(resolvedFile, "utf-8");
              const parsed = matter(targetRaw, {});
              targetDoc = {
                fullPath: resolvedFile,
                content: parsed.content,
                anchors: extractAllAnchors(parsed.content),
              };
            } catch {
              targetDoc = undefined;
            }
          }

          if (targetDoc && !targetDoc.anchors.has(anchor.toLowerCase())) {
            errors.push({
              file: relFile,
              line: link.line,
              message: `Broken anchor link: "${rawUrl}" (anchor "#${anchor}" does not exist in target document)`,
              type: "anchor",
            });
          }
        }
      }
    }
  }

  const valid = errors.length === 0;
  const result: ValidationResult = {
    valid,
    errors,
    warnings,
    stats: {
      docs: docFiles.length,
      links: linksChecked,
      headings: headingsFound,
    },
  };

  if (!options.silent) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold(`\n🔍 Validating documentation in ${chalk.cyan(targetDirArg)}...`));
      console.log(`  📄 Documents scanned: ${chalk.bold(result.stats.docs)}`);
      console.log(`  🔗 Links verified:    ${chalk.bold(result.stats.links)}`);
      console.log(`  📑 Headings indexed:  ${chalk.bold(result.stats.headings)}`);

      if (warnings.length > 0) {
        console.log(chalk.yellow(`\n⚠ ${warnings.length} warning(s):`));
        for (const warn of warnings) {
          console.log(chalk.yellow(`  - ${warn.file}: ${warn.message}`));
        }
      }

      if (valid) {
        console.log(chalk.green(`\n✔ Validation passed! All documents, links, and schemas are valid.\n`));
      } else {
        console.log(chalk.red(`\n✖ Validation failed with ${errors.length} error(s):`));
        for (const err of errors) {
          const loc = err.line ? `:${err.line}` : "";
          console.log(chalk.red(`  - [${err.type}] ${err.file}${loc}: ${err.message}`));
        }
        console.log();
      }
    }
  }

  if (options.exitOnError && !valid && typeof process !== "undefined") {
    process.exitCode = 1;
  }

  return result;
}
