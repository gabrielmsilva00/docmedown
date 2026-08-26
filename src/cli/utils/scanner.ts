import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { buildSidebarTree, formatTitleFromFilename } from "../../runtime/loader/auto-indexer";
import type { DocConfig, DocFileItem, DocHeading, DocManifest } from "../../runtime/types";

export function extractHeadings(content: string): DocHeading[] {
  const headings: DocHeading[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim().replace(/[#*`_]/g, "");
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/[\s_-]+/g, "-");

      headings.push({ level, text, id });
    }
  }

  return headings;
}

export function scanDirectory(
  dir: string,
  baseDir: string = dir,
  excludeList: string[] = ["node_modules", ".git", ".dmd", "dist", "bin"],
  stopAtNestedDocsRoots: boolean = true,
): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (excludeList.includes(entry.name) || entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      const isNestedDocsRoot =
        stopAtNestedDocsRoots && fullPath !== baseDir && fs.existsSync(path.join(fullPath, "docs.json"));

      if (!isNestedDocsRoot) {
        results.push(...scanDirectory(fullPath, baseDir, excludeList, stopAtNestedDocsRoots));
      }
    } else if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
      results.push(relPath);
    }
  }

  return results;
}

export function generateManifest(docDir: string, config: DocConfig): DocManifest {
  const files = scanDirectory(docDir);
  const docItems: DocFileItem[] = [];
  const frontmatters: Record<string, any> = {};

  for (const relFile of files) {
    const fullPath = path.join(docDir, relFile);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const { data: fm, content } = matter(raw);

    const cleanSlug = relFile.replace(/\.(md|mdx)$/i, "");
    const isOverview = cleanSlug.toLowerCase() === "readme" || cleanSlug.toLowerCase() === "index";
    const slug = isOverview ? "README" : cleanSlug;
    const title = fm.title || fm.sidebar_label || formatTitleFromFilename(path.basename(relFile));

    frontmatters[relFile] = fm;

    const headings = extractHeadings(content);
    const words = content.trim().split(/\s+/).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

    docItems.push({
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

  const tree = buildSidebarTree(files, frontmatters, config.sidebar);

  return {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    config,
    docs: docItems,
    tree,
  };
}
