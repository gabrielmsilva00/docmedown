import fs from "node:fs";
import path from "node:path";

/**
 * Centralized DocMeDown documentation directory layout.
 *
 * The documentation folder itself (default `./docs/`) contains ONLY
 * documentation sources plus a single distributable artifact: a symlink named
 * `index.html` at its root pointing at the serveable site entrypoint
 * (`.dmd/index.html`, with its prerendered SEO shell and sibling assets).
 * Everything else lives under `<docs>/.dmd/`:
 * - `<docs>/.dmd/` — hidden build workspace (generated site, manifest, data,
 *   runtimes, static pages, SEO/AI artifacts, `.nojekyll`).
 *   `.dmd` as a bare custom-components location is deprecated in favour of
 *   `.components` below, but still honored as a fallback.
 * - `<docs>/.dmd/.singlefile/` — offline self-contained bundle (`index.html`).
 *   The old `.dist` location is no longer used for new output but still
 *   honored as a fallback when reading.
 * - `<docs>/.dmd/.components/` — user custom components (default).
 * - `<docs>/.dmd/.config/` — configuration files (`docs.json`, `dmd.json`)
 *   by default. Bare `<docs>/*.json` files are still honored as fallbacks.
 *
 * These rules assume the documentation folder is `./docs/` as intended.
 * For other target directories the same hidden names are used under that
 * directory (e.g. `<dir>/.dmd/.components`); dot-folders are never linked in
 * navigation anyway, so generated files can never leak into sidebars/search.
 */

export const SITE_WORKSPACE_DIR_NAME = ".dmd";
export const SINGLEFILE_DIR_NAME = ".singlefile";
export const COMPONENTS_DIR_NAME = ".components";
export const CONFIG_DIR_NAME = ".config";

export const LEGACY_OFFLINE_OUTPUT_DIRECTORY = ".dist";
export const DEFAULT_OFFLINE_OUTPUT_DIRECTORY = ".singlefile";

/** `<targetDir>/.dmd` — hidden build workspace (always hidden, never linked). */
export function resolveSiteDir(targetDir: string): string {
  return path.join(targetDir, SITE_WORKSPACE_DIR_NAME);
}

/** `<siteDir>/.singlefile` — offline self-contained bundle directory. */
export function resolveOfflineDir(targetDir: string, siteDir?: string): string {
  const site = siteDir ?? resolveSiteDir(targetDir);
  return path.join(site, SINGLEFILE_DIR_NAME);
}

/** `<siteDir>/.components` — user-authored custom components directory. */
export function resolveComponentsDir(targetDir: string, siteDir?: string): string {
  const site = siteDir ?? resolveSiteDir(targetDir);
  return path.join(site, COMPONENTS_DIR_NAME);
}

/** `<siteDir>/.config` — configuration directory (`docs.json`, `dmd.json`). */
export function resolveConfigDir(targetDir: string, siteDir?: string): string {
  const site = siteDir ?? resolveSiteDir(targetDir);
  return path.join(site, CONFIG_DIR_NAME);
}

// __PART2__
/**
 * Candidate component directories, newest first. The legacy bare site dir
 * (`<targetDir>/.dmd`) is last so a migrated `.components` wins when both
 * exist. `.dmd` itself is deprecated as a components location.
 */
export function candidateComponentsDirs(targetDir: string): string[] {
  return [resolveComponentsDir(targetDir), resolveSiteDir(targetDir)];
}

/** First existing components dir with content, or the preferred (new) location. */
export function resolveExistingComponentsDir(targetDir: string): string {
  const candidates = candidateComponentsDirs(targetDir);
  const nonEmpty = candidates.find((dir) => {
    try {
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
      return fs.readdirSync(dir).some((entry) => {
        if (entry.startsWith(".")) return false;
        if (!/\.(svelte|tsx|jsx|ts|js|mjs|cjs)$/i.test(entry)) return false;
        if (/^(setup|languages|components|index)\.(js|mjs|cjs|ts)$/i.test(entry)) return true;
        return true;
      });
    } catch {
      return false;
    }
  });
  if (nonEmpty) return nonEmpty;
  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
    } catch {
      // ignore
    }
  }
  return resolveComponentsDir(targetDir);
}

/**
 * Candidate config files (`docs.json` then `dmd.json`), newest locations
 * first, legacy bare `<targetDir>/*.json` last for backward compatibility.
 */
export function candidateConfigPaths(targetDir: string): string[] {
  const configDir = resolveConfigDir(targetDir);
  return [
    path.join(configDir, "docs.json"),
    path.join(configDir, "dmd.json"),
    path.join(targetDir, "docs.json"),
    path.join(targetDir, "dmd.json"),
  ];
}

/** First existing config file, or the preferred new default. */
export function resolveExistingConfigPath(targetDir: string): string {
  for (const candidate of candidateConfigPaths(targetDir)) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // ignore
    }
  }
  return path.join(resolveConfigDir(targetDir), "docs.json");
}

/** Candidate offline bundle dirs: new `.singlefile` first, legacy `.dist` last. */
export function candidateOfflineDirs(targetDir: string): string[] {
  return [
    resolveOfflineDir(targetDir),
    path.join(resolveSiteDir(targetDir), LEGACY_OFFLINE_OUTPUT_DIRECTORY),
    path.join(targetDir, LEGACY_OFFLINE_OUTPUT_DIRECTORY),
  ];
}

/** First existing offline dir, or the preferred new location. */
export function resolveExistingOfflineDir(targetDir: string): string {
  for (const dir of candidateOfflineDirs(targetDir)) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
    } catch {
      // ignore
    }
  }
  return resolveOfflineDir(targetDir);
}

/**
 * Candidate built-site roots for runtime artifact lookup (`_manifest.json`,
 * `_docs.js`, ...): the hidden site dir first, then the legacy docs root.
 */
export function candidateSiteDirs(targetDir: string): string[] {
  const site = resolveSiteDir(targetDir);
  if (path.resolve(site) === path.resolve(targetDir)) return [targetDir];
  return [site, targetDir];
}

/** File name of the site entrypoint served from the docs root. */
export const SITE_ENTRYPOINT = "index.html";
export const OFFLINE_ENTRYPOINT = "index.html";

/**
 * Preferred symlink target for `<targetDir>/index.html`: the serveable site
 * entrypoint (`<siteDir>/index.html`) with its prerendered SEO shell,
 * per-page metadata, sitemap, and sibling runtime assets. Falls back to the
 * self-contained offline bundle (`.singlefile/index.html`) only when the
 * online shell is missing (e.g. `--no-static` builds).
 */
export function resolveSymlinkTarget(targetDir: string, siteDir?: string): string | null {
  const site = siteDir ?? resolveSiteDir(targetDir);
  const online = path.join(site, SITE_ENTRYPOINT);
  try {
    if (fs.existsSync(online) && fs.statSync(online).isFile()) return online;
  } catch {
    // ignore
  }
  const offline = path.join(resolveOfflineDir(targetDir, site), OFFLINE_ENTRYPOINT);
  try {
    if (fs.existsSync(offline) && fs.statSync(offline).isFile()) return offline;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Ensures `<targetDir>/index.html` is a symlink to the documentation
 * distributable — the ONLY documentation distributable artifact at the docs
 * root. Prefers the serveable SEO site entrypoint; falls back to the
 * self-contained offline bundle, then to a hard link/plain copy when symlinks are
 * unavailable (Windows/locked environments) so builds never fail.
 */
export function ensureRootSiteSymlinks(targetDir: string, siteDir?: string): string[] {
  const site = siteDir ?? resolveSiteDir(targetDir);
  // Never create a symlink inside its own workspace (nested `.dmd/` walks).
  if (
    path
      .resolve(targetDir)
      .toLowerCase()
      .startsWith(`${path.resolve(site).toLowerCase()}${path.sep}`)
  ) {
    return [];
  }
  const target = resolveSymlinkTarget(targetDir, site);
  const linkPath = path.join(targetDir, SITE_ENTRYPOINT);
  const created: string[] = [];
  if (!target) return created;
  try {
    let isCorrectLink = false;
    try {
      const stat = fs.lstatSync(linkPath);
      if (stat.isSymbolicLink()) {
        const current = fs.readlinkSync(linkPath);
        const resolved = path.resolve(path.dirname(linkPath), current);
        if (resolved.toLowerCase() === path.resolve(target).toLowerCase()) isCorrectLink = true;
      }
    } catch {
      // missing or unreadable — (re)create below
    }
    if (isCorrectLink) {
      created.push(linkPath);
      return created;
    }
    try {
      const existing = fs.lstatSync(linkPath);
      // A real (non-symlink) homepage at the docs root is a stale build output:
      // the hidden workspace owns the site now, so replace it with the symlink.
      // Custom shells are preserved by the static emitter via homeSkipped.
      fs.unlinkSync(linkPath);
      void existing;
    } catch {
      // missing — create below
    }
    const relTarget = path.relative(path.dirname(linkPath), target);
    try {
      fs.symlinkSync(relTarget, linkPath, "file");
    } catch {
      try {
        fs.linkSync(target, linkPath);
      } catch {
        fs.copyFileSync(target, linkPath);
      }
    }
    created.push(linkPath);
  } catch {
    // best effort only
  }
  return created;
}
