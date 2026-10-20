import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import packageJson from "../../../package.json";
import { collectVariants, defaultLocale, localizedDocs, localizeTree } from "../../runtime/i18n";
import { buildSidebarTree, formatTitleFromFilename } from "../../runtime/loader/auto-indexer";
import { parseMarkdown } from "../../runtime/markdown/parser";
import type { DocConfig, DocFileItem, DocHeading, DocManifest } from "../../runtime/types";
import { candidateComponentsDirs } from "./docs-layout";

export function extractHeadings(content: string): DocHeading[] {
  // Rendering owns heading identity. Reuse it so manifests and validation never
  // advertise anchors that differ from the generated HTML (including fences,
  // Setext headings, inline formatting, and duplicate suffixes).
  return parseMarkdown(content).headings.map(({ level, text, id }) => ({ level, text, id }));
}

export function scanDirectory(
  dir: string,
  baseDir: string = dir,
  excludeList: string[] = ["node_modules", ".git", ".dmd", "dist", "bin", "SKILL.md", "AGENTS.md"],
  stopAtNestedDocsRoots: boolean = true,
  visitedDirs: Set<string> = new Set(),
): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  try {
    const realDirPath = fs.realpathSync(dir);
    if (visitedDirs.has(realDirPath)) {
      return results;
    }
    visitedDirs.add(realDirPath);
  } catch {
    // If realpathSync fails, proceed without cycle check
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (excludeList.includes(entry.name) || entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

    let isDirectory = entry.isDirectory();
    let isFile = entry.isFile();
    if (entry.isSymbolicLink()) {
      try {
        const stat = fs.statSync(fullPath);
        isDirectory = stat.isDirectory();
        isFile = stat.isFile();
      } catch {
        continue;
      }
    }

    if (isDirectory) {
      const isNestedDocsRoot =
        stopAtNestedDocsRoots && fullPath !== baseDir && fs.existsSync(path.join(fullPath, "docs.json"));

      if (!isNestedDocsRoot) {
        results.push(...scanDirectory(fullPath, baseDir, excludeList, stopAtNestedDocsRoots, visitedDirs));
      }
    } else if (isFile && /\.(md|mdx)$/i.test(entry.name)) {
      results.push(relPath);
    }
  }

  return results;
}

export function generateManifest(docDir: string, config: DocConfig): DocManifest {
  const files = scanDirectory(docDir);
  const docItems: DocFileItem[] = [];
  const frontmatters: Record<string, any> = {};

  for (const variant of collectVariants(files, config)) {
    const relFile = variant.path;
    const fullPath = path.join(docDir, relFile);
    const raw = fs.readFileSync(fullPath, "utf-8");
    // gray-matter caches partially parsed files even when YAML parsing throws.
    // Explicit options avoid reusing those failed results on a later build.
    const { data: fm, content } = matter(raw, {});

    const slug = variant.slug;
    const title = fm.title || fm.sidebar_label || formatTitleFromFilename(path.basename(variant.docId));

    frontmatters[relFile] = fm;

    const headings = extractHeadings(content);
    const words = content.trim().split(/\s+/).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

    docItems.push({
      docId: variant.docId,
      locale: variant.locale,
      slug,
      path: relFile,
      title,
      category: relFile.includes("/") ? relFile.substring(0, relFile.lastIndexOf("/")) : undefined,
      frontmatter: fm,
      headings,
      content,
      readingTimeMinutes,
      lastModified: fs.statSync(fullPath).mtime.toISOString(),
    });
  }

  const visible = localizedDocs(docItems, defaultLocale(config), config);
  const logical = [...new Map(docItems.map((doc) => [doc.docId, doc])).values()];
  const baseTree = buildSidebarTree(
    logical.map((doc) => `${doc.docId}.md`),
    Object.fromEntries(visible.map((doc) => [`${doc.docId}.md`, doc.frontmatter])),
    config.sidebar,
  );
  const tree = localizeTree(baseTree, visible, defaultLocale(config), config);

  const COMPONENT_EXTS = [".svelte", ".tsx", ".jsx", ".ts", ".js"];
  const EXCLUDED_DMD_SCRIPTS = [
    "setup.js",
    "setup.mjs",
    "setup.ts",
    "languages.js",
    "languages.ts",
    "components.js",
    "index.js",
  ];
  const GENERATED_COMPONENT_NAMES = new Set([
    "_docs",
    "_manifest",
    "docmedown.web",
    "docmedown-mermaid",
    "docmedown.iife",
  ]);
  const componentDirs = candidateComponentsDirs(docDir).filter((dir) => {
    try {
      return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
    } catch {
      return false;
    }
  });
  const seenComponents = new Set<string>();
  const customComponents: string[] = [];
  for (const dir of componentDirs) {
    let entries: string[] = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const file of entries) {
      if (file.startsWith(".") || EXCLUDED_DMD_SCRIPTS.includes(file) || file.endsWith(".d.ts")) continue;
      if (!COMPONENT_EXTS.some((ext) => file.endsWith(ext))) continue;
      const base = path.basename(file, path.extname(file));
      if (GENERATED_COMPONENT_NAMES.has(base)) continue;
      if (seenComponents.has(base)) continue;
      seenComponents.add(base);
      customComponents.push(base);
    }
  }

  return {
    version: packageJson.version,
    generatedAt: new Date().toISOString(),
    config,
    docs: docItems,
    tree: config.i18n ? baseTree : tree,
    customComponents: customComponents.length > 0 ? customComponents : undefined,
  };
}
