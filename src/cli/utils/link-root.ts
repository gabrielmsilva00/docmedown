import fs from "node:fs";
import path from "node:path";

export const EXCLUDED_ROOT_FILES = new Set(["SKILL.md", "AGENTS.md"]);

/**
 * Discovers markdown files directly at the root directory (excluding hidden files,
 * dependencies, build outputs, and internal assets).
 */
export function detectRootMarkdownFiles(rootDir: string = process.cwd()): string[] {
  if (!fs.existsSync(rootDir)) return [];

  const excludeDirs = ["node_modules", ".git", ".dmd", "dist", "bin", ".dist"];

  try {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    const mdFiles: string[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith(".") || excludeDirs.includes(entry.name)) {
        continue;
      }
      if (EXCLUDED_ROOT_FILES.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(rootDir, entry.name);
      let isFile = entry.isFile();
      if (entry.isSymbolicLink()) {
        try {
          isFile = fs.statSync(fullPath).isFile();
        } catch {
          isFile = false;
        }
      }

      if (isFile && /\.(md|mdx)$/i.test(entry.name)) {
        mdFiles.push(entry.name);
      }
    }

    return mdFiles;
  } catch {
    return [];
  }
}

export interface LinkRootResult {
  linked: string[];
  skipped: string[];
  cleaned: string[];
}

/**
 * Links markdown files from rootDir into docsDir by default.
 * Files are linked as if they were directly in docsDir so they sit at the top-level
 * documentation tree without creating a './docs/' subdivision.
 */
export function linkRootMarkdownFiles(
  rootDir: string = process.cwd(),
  docsDir: string = path.resolve(rootDir, "./docs"),
): LinkRootResult {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedDocs = path.resolve(docsDir);

  const result: LinkRootResult = {
    linked: [],
    skipped: [],
    cleaned: [],
  };

  if (resolvedRoot.toLowerCase() === resolvedDocs.toLowerCase()) {
    return result;
  }

  if (!fs.existsSync(resolvedDocs)) {
    fs.mkdirSync(resolvedDocs, { recursive: true });
  }

  // 1. Clean up stale or broken symlinks in docsDir that previously targeted rootDir
  try {
    const docsEntries = fs.readdirSync(resolvedDocs, { withFileTypes: true });
    for (const entry of docsEntries) {
      if (entry.isSymbolicLink()) {
        const destPath = path.join(resolvedDocs, entry.name);
        try {
          const target = fs.readlinkSync(destPath);
          const resolvedTarget = path.resolve(resolvedDocs, target);
          if (
            path.dirname(resolvedTarget).toLowerCase() === resolvedRoot.toLowerCase() &&
            (!fs.existsSync(resolvedTarget) || !/\.(md|mdx)$/i.test(entry.name) || EXCLUDED_ROOT_FILES.has(entry.name))
          ) {
            fs.unlinkSync(destPath);
            result.cleaned.push(entry.name);
          }
        } catch {
          try {
            fs.unlinkSync(destPath);
            result.cleaned.push(entry.name);
          } catch {
            // ignore
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // 2. Detect root markdown files and link them into docsDir
  const rootMdFiles = detectRootMarkdownFiles(resolvedRoot);

  for (const fileName of rootMdFiles) {
    const rootFilePath = path.join(resolvedRoot, fileName);
    const destFilePath = path.join(resolvedDocs, fileName);

    let destExists = false;
    let isSymlink = false;

    try {
      const lstat = fs.lstatSync(destFilePath);
      destExists = true;
      isSymlink = lstat.isSymbolicLink();
    } catch {
      destExists = false;
      isSymlink = false;
    }

    if (destExists) {
      if (isSymlink) {
        try {
          const target = fs.readlinkSync(destFilePath);
          const resolvedTarget = path.resolve(resolvedDocs, target);
          if (resolvedTarget.toLowerCase() === rootFilePath.toLowerCase()) {
            result.skipped.push(fileName);
            continue;
          }
        } catch {
          try {
            fs.unlinkSync(destFilePath);
          } catch {
            result.skipped.push(fileName);
            continue;
          }
        }
      } else {
        result.skipped.push(fileName);
        continue;
      }
    }

    const relTarget = path.relative(resolvedDocs, rootFilePath);
    let linked = false;

    // Try symlink first
    try {
      fs.symlinkSync(relTarget, destFilePath, "file");
      linked = true;
    } catch {
      // Fallback 1: Hard link
      try {
        fs.linkSync(rootFilePath, destFilePath);
        linked = true;
      } catch {
        // Fallback 2: Copy
        try {
          fs.copyFileSync(rootFilePath, destFilePath);
          linked = true;
        } catch {
          linked = false;
        }
      }
    }

    if (linked) {
      result.linked.push(fileName);
    }
  }

  return result;
}
