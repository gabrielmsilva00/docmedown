import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import chalk from "chalk";
import chokidar from "chokidar";
import { buildSync } from "esbuild";
import { compile } from "svelte/compiler";
import { normalizeConfig, parseDocConfigJson } from "../../runtime/config";
import { embeddedDmdDocs } from "../../runtime/embedded-dmd";
import { isFaviconPreset, resolveFavicon } from "../../runtime/favicons";
import { isDataUri, resolveMimeType, toLosslessDataUri } from "../../runtime/media";
import {
  createCompressedOfflineHtml,
  OFFLINE_FORMAT_VERSION,
  type OfflineEnvelope,
  type OfflineNestedSiteData,
} from "../../runtime/offline-export";
import { dmdTag, ensureCustomElementTag } from "../../runtime/svelte-tag";
import type { DocConfig } from "../../runtime/types";
import { emitAiContextFiles } from "../ai-context";
import { emitStaticSite } from "../seo";
import {
  candidateComponentsDirs,
  candidateOfflineDirs,
  ensureRootSiteSymlinks,
  LEGACY_OFFLINE_OUTPUT_DIRECTORY,
  resolveComponentsDir,
  resolveConfigDir,
  resolveExistingComponentsDir,
  resolveExistingConfigPath,
  resolveOfflineDir,
  resolveSiteDir,
} from "../utils/docs-layout";
import { linkRootMarkdownFiles } from "../utils/link-root";
import { convertReactToSvelte } from "../utils/react-to-svelte";
import { generateManifest, scanDirectory } from "../utils/scanner";

export interface BuildOptions {
  singleFile?: boolean;
  outDir?: string;
  watch?: boolean;
  buildNested?: boolean;
  /** Prerender static pages + SEO/AI support files (default: true). */
  static?: boolean;
  /**
   * Suppress the per-step build banner/checklist (used by `serve` for the
   * initial + nested builds). Errors and warnings still print; a one-line
   * summary is returned via BuildResult.
   */
  silent?: boolean;
}

export interface BuildResult {
  targetDir: string;
  siteDir: string;
  offlineDir: string | null;
  pages: number;
  nestedCount: number;
}

export const DEFAULT_OFFLINE_OUTPUT_DIRECTORY = ".singlefile";

export { LEGACY_OFFLINE_OUTPUT_DIRECTORY };

export function getBuildOutputPaths(targetDir: string, offlineOutDir?: string) {
  const siteDir = resolveSiteDir(targetDir);
  return {
    onlineDir: siteDir,
    offlineDir: offlineOutDir ? path.resolve(process.cwd(), offlineOutDir) : resolveOfflineDir(targetDir, siteDir),
    siteDir,
    targetDir,
  };
}

export function encodeOfflinePayload(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf-8").toString("base64");
}

export function encodeCompressedOfflineEnvelope(envelope: OfflineEnvelope): string {
  return gzipSync(Buffer.from(JSON.stringify(envelope), "utf-8"), { level: 9 }).toString("base64");
}

export function escapeInlineScriptContent(value: string): string {
  return value.replace(/<\/script/gi, "<\\/script");
}

import { loadBuildTimeCustomSetup } from "../utils/custom-setup";

export { loadBuildTimeCustomSetup };

/**
 * Resolves and bundles custom components for embedding in `_docs.js` or single-file bundles.
 * Prioritizes `.dmd/*.svelte` components compiled via Svelte 5 customElement mode,
 * while maintaining backward compatibility with legacy `.dmd/components.js`.
 */
export function bundleCustomComponents(targetPath: string): string | undefined {
  let dmdDirs: string[] = [];
  let legacyFile: string | undefined;

  if (fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      const base = path.basename(targetPath);
      if (base === ".components" || base === ".dmd") {
        // Already a components/workspace dir — bundle from it directly.
        dmdDirs = [targetPath];
      } else {
        dmdDirs = candidateComponentsDirs(targetPath).filter((dir) => {
          try {
            return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
          } catch {
            return false;
          }
        });
      }
      if (dmdDirs.length === 0) dmdDirs = [resolveComponentsDir(targetPath)];
    } else {
      legacyFile = targetPath;
      dmdDirs = [resolveExistingComponentsDir(path.dirname(targetPath))];
    }
  } else {
    const parent = path.dirname(targetPath);
    if (fs.existsSync(parent) && fs.statSync(parent).isDirectory()) {
      dmdDirs = [parent];
    } else {
      return undefined;
    }
  }

  // Merge new `.dmd/.components/` with the deprecated bare `.dmd/` fallback
  // (new location wins on name collisions). Only user-authored component
  // sources participate — generated workspace files (`_docs.js`,
  // `docmedown.*.js`, `_manifest.json`, ...) must never be bundled.
  const GENERATED_WORKSPACE_FILES = new Set([
    "_docs.js",
    "_manifest.json",
    "docmedown.web.js",
    "docmedown-mermaid.js",
    "docmedown.iife.js",
  ]);
  const merged = new Map<string, string>();
  for (const dir of [...dmdDirs].reverse()) {
    let entries: string[] = [];
    try {
      entries = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    } catch {
      entries = [];
    }
    for (const entry of entries) {
      if (entry.startsWith(".")) continue;
      if (GENERATED_WORKSPACE_FILES.has(entry)) continue;
      let isFile = false;
      try {
        isFile = fs.statSync(path.join(dir, entry)).isFile();
      } catch {
        continue;
      }
      if (!isFile) continue;
      merged.set(entry, path.join(dir, entry));
    }
  }
  const dmdEntries = [...merged.keys()];
  const svelteFiles = dmdEntries.filter((file) => file.endsWith(".svelte"));
  const reactFiles = dmdEntries.filter(
    (file) => (file.endsWith(".tsx") || file.endsWith(".jsx")) && !file.startsWith("."),
  );
  const EXCLUDED_SCRIPTS = [
    "setup.js",
    "setup.mjs",
    "setup.ts",
    "languages.js",
    "languages.ts",
    "components.js",
    "index.js",
  ];
  const webElementFiles = dmdEntries.filter(
    (file) =>
      (file.endsWith(".ts") || file.endsWith(".js")) && !EXCLUDED_SCRIPTS.includes(file) && !file.endsWith(".d.ts"),
  );

  const hasComponents = svelteFiles.length > 0 || reactFiles.length > 0 || webElementFiles.length > 0;

  if (hasComponents && dmdDirs.length > 0) {
    const primaryDir = dmdDirs[0];
    try {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "docmedown-components-bundle-"));
      try {
        for (const [entry, src] of merged) {
          try {
            if (fs.statSync(src).isFile()) {
              fs.copyFileSync(src, path.join(tempDir, entry));
            }
          } catch {
            // ignore unreadable entries
          }
        }

        // Provide bridge runtime if React bridging is required
        const bridgeCandidates = [
          path.resolve(__dirname, "../../runtime/bridges/react-bridge.ts"),
          path.resolve(__dirname, "../src/runtime/bridges/react-bridge.ts"),
          path.resolve(__dirname, "src/runtime/bridges/react-bridge.ts"),
        ];
        const bridgeSrc = bridgeCandidates.find((p) => fs.existsSync(p));
        if (bridgeSrc) {
          fs.copyFileSync(bridgeSrc, path.join(tempDir, "react-bridge-runtime.ts"));
        }

        const entryImports: string[] = [];
        const entryExports: string[] = [];

        // 1. Process Svelte components
        for (const svelteFile of svelteFiles) {
          const rawSource = fs.readFileSync(merged.get(svelteFile) ?? path.join(primaryDir, svelteFile), "utf-8");
          const baseName = svelteFile.replace(/\.svelte$/, "");
          const tag = dmdTag(baseName);
          const taggedSource = ensureCustomElementTag(rawSource, tag);

          const compiled = compile(taggedSource, {
            filename: svelteFile,
            customElement: true,
          });

          const outJsFile = `${baseName}.compiled.js`;
          fs.writeFileSync(path.join(tempDir, outJsFile), compiled.js.code, "utf-8");
          entryImports.push(`import "./${outJsFile}";`);
          entryExports.push(`${JSON.stringify(baseName)}: ${JSON.stringify(tag)}`);
        }

        // 2. Process React TSX / JSX components
        for (const reactFile of reactFiles) {
          const rawSource = fs.readFileSync(merged.get(reactFile) ?? path.join(primaryDir, reactFile), "utf-8");
          const baseName = path.basename(reactFile, path.extname(reactFile));
          const tag = dmdTag(baseName);

          // Attempt build-time conversion to native Svelte 5 custom element
          const converted = convertReactToSvelte(rawSource, {
            name: baseName,
            tag,
            filename: reactFile,
          });

          if (converted.success && converted.svelteSource) {
            // Svelte base conversion succeeded: compile to native Svelte 5 custom element with 0 React overhead
            const compiled = compile(converted.svelteSource, {
              filename: `${baseName}.svelte`,
              customElement: true,
            });

            const outJsFile = `${baseName}.compiled.js`;
            fs.writeFileSync(path.join(tempDir, outJsFile), compiled.js.code, "utf-8");
            entryImports.push(`import "./${outJsFile}";`);
            entryExports.push(`${JSON.stringify(baseName)}: ${JSON.stringify(tag)}`);
          } else {
            // Fallback: wrap with ReactBridge and bundle via esbuild
            const bridgeFile = `${baseName}.bridge.js`;
            const bridgeContent = `
import React from "react";
import ReactDOM from "react-dom/client";
import ComponentModule from "./${reactFile}";
import { createReactBridge } from "./react-bridge-runtime";

const Component = ComponentModule.default || ComponentModule;
const BridgeClass = createReactBridge(Component, {
  React,
  ReactDOM,
  createRoot: ReactDOM.createRoot,
  createElement: React.createElement,
});

if (typeof customElements !== "undefined" && !customElements.get(${JSON.stringify(tag)})) {
  customElements.define(${JSON.stringify(tag)}, BridgeClass);
}
`;
            fs.writeFileSync(path.join(tempDir, bridgeFile), bridgeContent, "utf-8");
            entryImports.push(`import "./${bridgeFile}";`);
            entryExports.push(`${JSON.stringify(baseName)}: ${JSON.stringify(tag)}`);
          }
        }

        // 3. Process Web Element / Lit components
        for (const weFile of webElementFiles) {
          const baseName = path.basename(weFile, path.extname(weFile));
          const tag = dmdTag(baseName);
          entryImports.push(`import "./${weFile}";`);
          entryExports.push(`${JSON.stringify(baseName)}: ${JSON.stringify(tag)}`);
        }

        for (const setupFile of ["setup.js", "setup.mjs", "setup.ts", "languages.js", "languages.ts"]) {
          if (fs.existsSync(path.join(tempDir, setupFile))) {
            entryImports.push(`import "./${setupFile}";`);
          }
        }

        let defaultExportExpr = `{ ${entryExports.join(", ")} }`;
        if (fs.existsSync(path.join(tempDir, "components.js"))) {
          entryImports.push(`import legacyComponents from "./components.js";`);
          defaultExportExpr = `{ ...(legacyComponents || {}), ${entryExports.join(", ")} }`;
        } else if (fs.existsSync(path.join(tempDir, "index.js"))) {
          entryImports.push(`import legacyComponents from "./index.js";`);
          defaultExportExpr = `{ ...(legacyComponents || {}), ${entryExports.join(", ")} }`;
        }

        const entryPath = path.join(tempDir, "entry.js");
        fs.writeFileSync(entryPath, `${entryImports.join("\n")}\nexport default ${defaultExportExpr};\n`, "utf-8");

        const candidatePaths = [
          ...(require.resolve.paths ? require.resolve.paths("react") || [] : []),
          path.resolve(__dirname, "../../node_modules"),
          path.resolve(__dirname, "../node_modules"),
          path.resolve(__dirname, "node_modules"),
          path.resolve(process.cwd(), "node_modules"),
          path.resolve(targetPath, "node_modules"),
          ...dmdDirs.map((dir) => path.resolve(dir, "node_modules")),
        ].filter((p) => fs.existsSync(p));
        const nodePaths = [...new Set(candidatePaths)];

        const result = buildSync({
          entryPoints: [entryPath],
          bundle: true,
          format: "esm",
          platform: "browser",
          target: "es2022",
          nodePaths,
          write: false,
          minify: true,
          external: ["svelte", "svelte/*", "docmedown/motion", "motion", "docmedown"],
          legalComments: "none",
        });

        const bundledSource = result.outputFiles[0]?.text;
        if (!bundledSource) {
          throw new Error("esbuild did not produce an output module for custom components.");
        }

        return bundledSource;
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      throw new Error(
        `Could not bundle custom components from ${dmdDirs[0] ?? targetPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Fallback to setup.js / languages.js / components.js / index.js if present
  // (new `.dmd/.components/` first, deprecated bare `.dmd/` as fallback).
  const setupCandidates = dmdDirs.flatMap((dir) => [
    path.join(dir, "setup.js"),
    path.join(dir, "languages.js"),
    path.join(dir, "components.js"),
    path.join(dir, "index.js"),
  ]);
  const candidate =
    (legacyFile && fs.existsSync(legacyFile) && !fs.statSync(legacyFile).isDirectory() ? legacyFile : undefined) ||
    setupCandidates.find((p) => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    });

  if (!candidate || !fs.existsSync(candidate)) return undefined;

  try {
    const fallbackNodePaths = [
      path.resolve(__dirname, "../../node_modules"),
      path.resolve(__dirname, "../node_modules"),
      path.resolve(__dirname, "node_modules"),
      path.resolve(process.cwd(), "node_modules"),
      path.resolve(targetPath, "node_modules"),
      ...dmdDirs.map((dir) => path.resolve(dir, "node_modules")),
    ].filter((p) => p && fs.existsSync(p));

    const result = buildSync({
      entryPoints: [candidate],
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      nodePaths: [...new Set(fallbackNodePaths)],
      write: false,
      minify: true,
      legalComments: "none",
    });

    const bundledSource = result.outputFiles[0]?.text;
    if (!bundledSource) {
      throw new Error("esbuild did not produce an output module.");
    }

    return bundledSource;
  } catch (error) {
    throw new Error(
      `Could not bundle custom components from ${candidate}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Creates the data bootstrap shared by the single-file bundle. Component modules
 * are intentionally not evaluated here: the runtime publishes `window.React`
 * first, then ComponentRegistry imports and registers the embedded module.
 */
export function createOfflineDataBootstrap(offlinePayload: string): string {
  return `
    (function () {
      const encoded = '${offlinePayload}';
      const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      const data = JSON.parse(new TextDecoder().decode(bytes));
      window.__DOCMEDOWN_DATA__ = data;
      window.__DOCMEDOWN_CONFIG__ = data.manifest.config;
    })();`;
}

/**
 * Resolves a favicon into a self-contained data URI for single-file offline bundles.
 * Inlines local image files (SVG, PNG, ICO, etc.) as base64 data URIs so the single-file
 * distributable has zero external file dependencies.
 */
export function resolveFaviconForOffline(favicon?: string | null, targetDir?: string): string {
  if (!favicon || favicon === "data:,") {
    return resolveFavicon();
  }
  const trimmed = favicon.trim();
  if (isFaviconPreset(trimmed) || trimmed.startsWith("data:")) {
    return resolveFavicon(trimmed);
  }
  if (targetDir && !/^(https?:|\/\/)/i.test(trimmed)) {
    const cleanPath = trimmed.replace(/^\.?\/+/, "");
    const candidatePaths = [
      path.resolve(targetDir, cleanPath),
      path.resolve(targetDir, ".dmd", cleanPath),
      path.resolve(process.cwd(), cleanPath),
    ];
    for (const cand of candidatePaths) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        try {
          const ext = path.extname(cand).toLowerCase();
          const mimeMap: Record<string, string> = {
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".ico": "image/x-icon",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
            ".gif": "image/gif",
          };
          const mime = mimeMap[ext] || "image/x-icon";
          const data = fs.readFileSync(cand);
          return `data:${mime};base64,${data.toString("base64")}`;
        } catch {
          // Fall back to preset or default
        }
      }
    }
  }
  return resolveFavicon(trimmed);
}

const GENERATED_DOC_OUTPUTS = [
  "_manifest.json",
  "_docs.js",
  "docmedown.web.js",
  "docmedown-mermaid.js",
  "docmedown.iife.js",
  // Static-site artifacts (prerendered pages, SEO files, AI context files).
  // Generated at any depth, so they are matched by basename to keep the
  // watcher from rebuilding itself in a loop.
  "index.html",
  "404.html",
  "sitemap.xml",
  "robots.txt",
  "llms.txt",
  "llms-full.txt",
  "SKILL.md",
  "okf.json",
];

/**
 * Structural cleanup: after a build the docs folder must contain ONLY
 * documentation sources plus the single `index.html` symlink distributable.
 * Removes legacy generated artifacts that previous builds wrote to the docs
 * root (now housed in `<targetDir>/.dmd/`), without touching real docs:
 * markdown, symlinked root docs, user components/config, or nested doc roots.
 */
export function cleanupLegacyRootArtifacts(
  targetDir: string,
  siteDir: string,
  offlineDir: string,
  buildOfflineBundle: boolean,
): void {
  const legacyFiles = new Set([
    "_manifest.json",
    "_docs.js",
    "docmedown.web.js",
    "docmedown-mermaid.js",
    "docmedown.iife.js",
    "404.html",
    "sitemap.xml",
    "robots.txt",
    "llms.txt",
    "SKILL.md",
    "okf.json",
  ]);
  const legacyPatterns = [/^llms\.[a-z-]+\.txt$/i, /^llms-full(\.[a-z-]+)?\.txt$/i, /^okf(\.[a-z-]+)?\.json$/i];
  try {
    for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
      const full = path.join(targetDir, entry.name);
      const resolved = path.resolve(full);
      if (resolved === path.resolve(siteDir) || resolved === path.resolve(offlineDir)) continue;
      // Never touch nested documentation roots or the workspace itself.
      if (entry.isDirectory()) {
        // `.dmd` here is the hidden workspace (components live inside
        // `.dmd/.components/` now); `.dist` is the legacy offline dir.
        if (entry.name === ".dmd" || entry.name === ".dist" || entry.name === ".singlefile") {
          if (entry.name !== ".dmd" && resolved !== path.resolve(siteDir) && resolved !== path.resolve(offlineDir)) {
            try {
              if (full !== targetDir) fs.rmSync(full, { recursive: true, force: true });
            } catch {
              // best effort
            }
          }
          continue;
        }
        continue;
      }
      if (entry.isSymbolicLink()) continue; // linked root docs + index.html symlink stay
      if (/\.(md|mdx)$/i.test(entry.name)) continue; // documentation sources stay
      if (/^(docs|dmd)\.json$/i.test(entry.name)) continue; // legacy configs stay as fallback
      if (/^favicon\.(svg|png|ico)$/i.test(entry.name)) continue; // source assets stay
      const isLegacy = legacyFiles.has(entry.name) || legacyPatterns.some((re) => re.test(entry.name));
      if (!isLegacy) continue;
      // The root index.html symlink is the ONLY distributable artifact — other
      // legacy build outputs move into `.dmd/` and are safe to remove here.
      try {
        fs.rmSync(full, { force: true });
      } catch {
        // best effort
      }
    }
    // Prerendered page directories (`<slug>/index.html`) are now emitted into
    // the hidden workspace; remove stale copies at the docs root.
    try {
      const workspacePages = new Set(listPrerenderedPages(siteDir));
      for (const rel of listPrerenderedPages(targetDir)) {
        if (!workspacePages.has(rel)) continue;
        const full = path.join(targetDir, rel);
        if (path.resolve(full) === path.resolve(siteDir)) continue;
        if (isNestedDocsRoot(full)) continue;
        try {
          fs.rmSync(full, { recursive: true, force: true });
          pruneEmptyParents(targetDir, path.dirname(full));
        } catch {
          // best effort
        }
      }
    } catch {
      // best effort
    }
    // Legacy offline dirs are superseded by `.dmd/.singlefile`.
    if (buildOfflineBundle) {
      for (const legacy of candidateOfflineDirs(targetDir).slice(1)) {
        if (path.resolve(legacy) === path.resolve(offlineDir)) continue;
        try {
          if (fs.existsSync(legacy)) fs.rmSync(legacy, { recursive: true, force: true });
        } catch {
          // best effort
        }
      }
    }
  } catch {
    // best effort only — never fail a build on cleanup
  }
}

function listPrerenderedPages(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string, rel: string) => {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".")) continue;
      if (["node_modules", "dist", "bin"].includes(entry.name)) continue;
      const relDir = rel ? `${rel}/${entry.name}` : entry.name;
      const fullDir = path.join(dir, entry.name);
      try {
        if (fs.existsSync(path.join(fullDir, "index.html"))) out.push(`${relDir}/index.html`);
      } catch {
        // ignore
      }
      walk(fullDir, relDir);
    }
  };
  walk(root, "");
  return out;
}

function isNestedDocsRoot(dir: string): boolean {
  try {
    return fs.existsSync(path.join(dir, "docs.json")) || fs.existsSync(path.join(dir, ".dmd", ".config", "docs.json"));
  } catch {
    return false;
  }
}

function pruneEmptyParents(stopAt: string, dir: string): void {
  let current = path.resolve(dir);
  const stop = path.resolve(stopAt);
  while (current.startsWith(stop) && current !== stop) {
    try {
      if (fs.readdirSync(current).length === 0) fs.rmdirSync(current);
      else break;
    } catch {
      break;
    }
    current = path.dirname(current);
  }
}

/**
 * One-time structural adoption toward `./docs/.dmd/` as the hidden workspace:
 * - user components `docs/.dmd/*` → `docs/.dmd/.components/*` (deprecated bare
 *   location stays as fallback);
 * - configs `docs/docs.json|dmd.json` → `docs/.dmd/.config/*` (legacy root
 *   files stay as fallback);
 * - source assets `docs/favicon.*` → `docs/.dmd/favicon.*` (root fallback).
 * Never overwrites existing new-location files; never touches nested roots.
 */
export function migrateLegacyWorkspaceLayout(targetDir: string, siteDir: string): void {
  try {
    const componentsDir = resolveComponentsDir(targetDir, siteDir);
    const configDir = resolveConfigDir(targetDir, siteDir);
    fs.mkdirSync(componentsDir, { recursive: true });
    fs.mkdirSync(configDir, { recursive: true });

    // Components: move bare `.dmd/*` component files into `.components/`.
    // Generated workspace files must never migrate as components.
    const GENERATED_MIGRATION_DENY = new Set([
      "_docs.js",
      "_manifest.json",
      "docmedown.web.js",
      "docmedown-mermaid.js",
      "docmedown.iife.js",
    ]);
    try {
      for (const entry of fs.readdirSync(siteDir, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        if (entry.name.startsWith(".")) continue;
        if (GENERATED_MIGRATION_DENY.has(entry.name)) continue;
        if (!/\.(svelte|tsx|jsx|ts|js|mjs|cjs)$/i.test(entry.name)) continue;
        if (/^(setup|languages|components|index)\.(js|mjs|cjs|ts)$/i.test(entry.name)) {
          // setup-style modules stay loadable from both; prefer new location.
        }
        const from = path.join(siteDir, entry.name);
        const to = path.join(componentsDir, entry.name);
        try {
          if (fs.existsSync(to)) continue;
          fs.renameSync(from, to);
        } catch {
          try {
            if (!fs.existsSync(to)) fs.copyFileSync(from, to);
          } catch {
            // best effort
          }
        }
      }
    } catch {
      // best effort
    }

    // Configs: copy (not move — keep root fallback) into `.dmd/.config/`.
    for (const name of ["docs.json", "dmd.json"]) {
      const from = path.join(targetDir, name);
      const to = path.join(configDir, name);
      try {
        if (fs.existsSync(from) && !fs.existsSync(to)) fs.copyFileSync(from, to);
      } catch {
        // best effort
      }
    }

    // Favicon source asset: copy root `favicon.*` into the workspace.
    try {
      for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
        if (!entry.isFile() || entry.isSymbolicLink()) continue;
        if (!/^favicon\.(svg|png|ico)$/i.test(entry.name)) continue;
        const to = path.join(siteDir, entry.name);
        try {
          if (!fs.existsSync(to)) fs.copyFileSync(path.join(targetDir, entry.name), to);
        } catch {
          // best effort
        }
      }
    } catch {
      // best effort
    }
  } catch {
    // best effort only
  }
}

export function findNestedDocumentationRoots(targetDir: string): string[] {
  const roots: string[] = [];

  function visit(directory: string) {
    if (!fs.existsSync(directory)) return;

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (
        !entry.isDirectory() ||
        entry.name.startsWith(".") ||
        ["node_modules", ".git", "dist", "bin"].includes(entry.name)
      ) {
        continue;
      }

      const fullPath = path.join(directory, entry.name);
      // Nested roots carry their own config — new `.dmd/.config/docs.json`
      // location first, legacy bare `docs.json` for backward compatibility.
      const isNestedRoot =
        fullPath !== directory &&
        (fs.existsSync(path.join(fullPath, ".dmd", ".config", "docs.json")) ||
          fs.existsSync(path.join(fullPath, "docs.json")));
      if (isNestedRoot) {
        roots.push(fullPath);
        visit(fullPath);
      } else {
        visit(fullPath);
      }
    }
  }

  visit(targetDir);
  return roots;
}

/**
 * Scans markdown sources in `docsMap` for `<Card>` / `<dmd-card>` components
 * with `content="..."` pointing to online URLs (or local file paths) and
 * fetches them so they are embedded directly into offline distributables.
 */
export async function inlineCardOnlineSources(docsMap: Record<string, string>, targetDir?: string): Promise<string[]> {
  const inlinedUrls: string[] = [];
  const visited = new Set<string>();

  const CARD_TAG_RE = /<(?:Card|dmd-card)\b((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/gi;
  const CONTENT_ATTR_RE = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)'|\{["']([^"']*)["']\})/i;

  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    const entries = Object.entries(docsMap);

    for (const [, docContent] of entries) {
      if (!docContent || typeof docContent !== "string") continue;
      CARD_TAG_RE.lastIndex = 0;
      while (true) {
        const tagMatch = CARD_TAG_RE.exec(docContent);
        if (tagMatch === null) break;
        const attrs = tagMatch[1];
        if (!attrs) continue;

        const attrMatch = CONTENT_ATTR_RE.exec(attrs);
        if (!attrMatch) continue;

        const rawUrl = (attrMatch[1] ?? attrMatch[2] ?? attrMatch[3] ?? "").trim();
        if (!rawUrl || visited.has(rawUrl)) continue;
        visited.add(rawUrl);

        if (/^https?:\/\//i.test(rawUrl)) {
          try {
            console.log(chalk.cyan(`  ⬇ Fetching Card online source: ${rawUrl}`));
            const res = await fetch(rawUrl);
            if (!res.ok) {
              console.warn(chalk.yellow(`  ⚠ HTTP ${res.status} fetching Card online source "${rawUrl}"`));
              continue;
            }
            const text = await res.text();
            docsMap[rawUrl] = text;
            inlinedUrls.push(rawUrl);
            const cleanKey = rawUrl.replace(/\.(md|mdx)$/i, "");
            if (cleanKey !== rawUrl) {
              docsMap[cleanKey] = text;
            }
            hasMore = true;
          } catch (err: any) {
            console.warn(
              chalk.yellow(`  ⚠ Could not fetch Card online source "${rawUrl}": ${err?.message || String(err)}`),
            );
          }
        } else if (targetDir && /\.(md|mdx)$/i.test(rawUrl)) {
          const cleanPath = rawUrl.replace(/^\.?\//, "");
          const candidatePaths = [path.resolve(targetDir, cleanPath), path.resolve(targetDir, rawUrl)];
          for (const cand of candidatePaths) {
            if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
              const text = fs.readFileSync(cand, "utf-8");
              docsMap[rawUrl] = text;
              docsMap[cleanPath] = text;
              const slug = cleanPath.replace(/\.(md|mdx)$/i, "");
              docsMap[slug] = text;
              break;
            }
          }
        }
      }
    }
  }

  return inlinedUrls;
}

/**
 * Scans markdown documents for media references in <Media>, <dmd-media>,
 * Markdown image syntax (![alt](url)), and HTML <img> tags. Local and accessible
 * online media files are converted losslessly into base64 Data URIs so the resulting
 * offline bundle index.html is 100% self-contained and offline-compatible.
 */
export async function inlineMediaSources(
  docsMap: Record<string, string>,
  targetDir?: string,
  options?: { fetchRemote?: boolean },
): Promise<{ inlinedCount: number; mediaMap: Record<string, string> }> {
  const mediaMap: Record<string, string> = {};
  const cache = new Map<string, string>();
  const visitedAssets = new Set<string>();

  const MEDIA_TAG_RE = /<(?:Media|dmd-media)\b((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/gi;
  const ATTR_RE = (attr: string) =>
    new RegExp(`\\b${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{["']([^"']*)["']\\})`, "i");
  const EMBED_ATTR_RE = /\bembed\s*=\s*(?:"([^"]*)"|'([^']*)'|\\{([^}]+)\\})/i;
  const TYPE_ATTR_RE = /\b(?:type|format)\s*=\s*(?:"([^"]*)"|'([^']*)'|\\{["']([^"']*)["']\\})/i;
  const MD_IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
  const HTML_IMG_RE = /<img\b((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/gi;
  const SRC_ATTR_RE = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|\\{["']([^"']*)["']\\})/i;

  async function resolveToDataUri(rawUrl: string, explicitType?: string): Promise<string | null> {
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;
    if (isDataUri(trimmed)) return trimmed;
    if (cache.has(trimmed)) return cache.get(trimmed)!;

    // Remote URLs: only fetch when explicitly requested via options.fetchRemote
    if (/^https?:\/\//i.test(trimmed)) {
      if (options?.fetchRemote !== true) return null;
      try {
        const res = await fetch(trimmed);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || resolveMimeType(trimmed, explicitType);
          const dataUri = toLosslessDataUri(buffer, mime);
          cache.set(trimmed, dataUri);
          return dataUri;
        }
      } catch {
        return null;
      }
    }

    // Local files
    if (targetDir) {
      const cleanPath = trimmed.replace(/^\.?\//, "");
      const candidates = [
        path.resolve(targetDir, cleanPath),
        path.resolve(targetDir, trimmed),
        path.resolve(process.cwd(), cleanPath),
        path.resolve(process.cwd(), trimmed),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          try {
            const buffer = fs.readFileSync(cand);
            const mime = resolveMimeType(cand, explicitType);
            const dataUri = toLosslessDataUri(buffer, mime);
            cache.set(trimmed, dataUri);
            return dataUri;
          } catch {
            return null;
          }
        }
      }
    }

    return null;
  }

  const entries = Object.entries(docsMap);
  for (const [key, docContent] of entries) {
    if (!docContent || typeof docContent !== "string") continue;
    let modified = docContent;

    // 1. Process <Media> and <dmd-media> tags
    MEDIA_TAG_RE.lastIndex = 0;
    const mediaTags: Array<{ fullTag: string; attrs: string }> = [];
    while (true) {
      const match = MEDIA_TAG_RE.exec(docContent);
      if (match === null) break;
      mediaTags.push({ fullTag: match[0], attrs: match[1] || "" });
    }

    for (const { fullTag, attrs } of mediaTags) {
      const embedMatch = EMBED_ATTR_RE.exec(attrs);
      const embedVal = (embedMatch ? (embedMatch[1] ?? embedMatch[2] ?? embedMatch[3] ?? "") : "").trim().toLowerCase();
      if (embedVal === "none" || embedVal === "false") {
        continue;
      }

      const typeMatch = TYPE_ATTR_RE.exec(attrs);
      const explicitType = (typeMatch ? (typeMatch[1] ?? typeMatch[2] ?? typeMatch[3] ?? "") : "").trim();

      let newTag = fullTag;

      for (const attrName of ["src", "fallback", "poster"]) {
        const attrRe = ATTR_RE(attrName);
        const m = attrRe.exec(attrs);
        if (m) {
          const rawVal = (m[1] ?? m[2] ?? m[3] ?? "").trim();
          if (rawVal && !isDataUri(rawVal)) {
            const typeHint = attrName === "src" ? explicitType : undefined;
            const dataUri = await resolveToDataUri(rawVal, typeHint);
            if (dataUri) {
              mediaMap[rawVal] = dataUri;
              const clean = rawVal.replace(/^\.?\//, "");
              mediaMap[clean] = dataUri;
              mediaMap[`./${clean}`] = dataUri;
              visitedAssets.add(rawVal);
              // Only rewrite tag in markdown if under 512KB to prevent marked regex stack overflow
              if (dataUri.length <= 512 * 1024) {
                newTag = newTag.replace(m[0], `${attrName}="${dataUri}"`);
              }
            }
          }
        }
      }

      if (newTag !== fullTag) {
        modified = modified.replace(fullTag, newTag);
      }
    }

    // 2. Process Markdown images: ![alt](url)
    MD_IMAGE_RE.lastIndex = 0;
    const mdImages: Array<{ full: string; alt: string; url: string; title?: string }> = [];
    while (true) {
      const mdMatch = MD_IMAGE_RE.exec(modified);
      if (mdMatch === null) break;
      mdImages.push({ full: mdMatch[0], alt: mdMatch[1] || "", url: mdMatch[2], title: mdMatch[3] });
    }

    for (const { full, alt, url, title } of mdImages) {
      if (!isDataUri(url)) {
        const dataUri = await resolveToDataUri(url);
        if (dataUri) {
          mediaMap[url] = dataUri;
          const clean = url.replace(/^\.?\//, "");
          mediaMap[clean] = dataUri;
          visitedAssets.add(url);
          const titleSuffix = title ? ` "${title}"` : "";
          modified = modified.replace(full, `![${alt}](${dataUri}${titleSuffix})`);
        }
      }
    }

    // 3. Process HTML <img> tags
    HTML_IMG_RE.lastIndex = 0;
    const htmlImgs: Array<{ full: string; attrs: string }> = [];
    while (true) {
      const imgMatch = HTML_IMG_RE.exec(modified);
      if (imgMatch === null) break;
      htmlImgs.push({ full: imgMatch[0], attrs: imgMatch[1] || "" });
    }

    for (const { full, attrs } of htmlImgs) {
      const srcMatch = SRC_ATTR_RE.exec(attrs);
      if (srcMatch) {
        const rawUrl = (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3] ?? "").trim();
        if (rawUrl && !isDataUri(rawUrl)) {
          const dataUri = await resolveToDataUri(rawUrl);
          if (dataUri) {
            mediaMap[rawUrl] = dataUri;
            const clean = rawUrl.replace(/^\.?\//, "");
            mediaMap[clean] = dataUri;
            visitedAssets.add(rawUrl);
            const newTag = full.replace(srcMatch[0], `src="${dataUri}"`);
            modified = modified.replace(full, newTag);
          }
        }
      }
    }

    docsMap[key] = modified;
  }

  return { inlinedCount: visitedAssets.size, mediaMap };
}

/**
 * Loads every nested documentation root into an embeddable offline payload so
 * the parent's single-file bundle can open subdocumentation without any
 * external files. Keys are the nested root's path relative to the parent root.
 */
async function collectNestedOfflineSites(targetDir: string): Promise<Record<string, OfflineNestedSiteData>> {
  const sites: Record<string, OfflineNestedSiteData> = {};

  for (const nestedRoot of findNestedDocumentationRoots(targetDir)) {
    const key = path.relative(targetDir, nestedRoot).replace(/\\/g, "/");
    const nestedConfigPath = resolveExistingConfigPath(nestedRoot);
    let nestedConfig = normalizeConfig();
    if (fs.existsSync(nestedConfigPath)) {
      nestedConfig = normalizeConfig(parseDocConfigJson(fs.readFileSync(nestedConfigPath, "utf-8"), nestedConfigPath));
    }

    const nestedDocs: Record<string, string> = {};
    for (const file of scanDirectory(nestedRoot)) {
      const raw = fs.readFileSync(path.join(nestedRoot, file), "utf-8");
      const slug = file.replace(/\.(md|mdx)$/i, "");
      const cleanSlug = slug.toLowerCase() === "readme" || slug.toLowerCase() === "index" ? "README" : slug;
      nestedDocs[cleanSlug] = raw;
      nestedDocs[file] = raw;
    }

    for (const [key, content] of Object.entries(embeddedDmdDocs(nestedConfig))) {
      if (!nestedDocs[key]) nestedDocs[key] = content;
    }
    await inlineCardOnlineSources(nestedDocs, nestedRoot);
    const { mediaMap: nestedMediaMap } = await inlineMediaSources(nestedDocs, nestedRoot);

    const nestedComponentsPath = resolveExistingComponentsDir(nestedRoot);
    loadBuildTimeCustomSetup(nestedComponentsPath);
    sites[key] = {
      name: nestedConfig.name || key,
      manifest: generateManifest(nestedRoot, nestedConfig),
      docs: nestedDocs,
      componentsSource: bundleCustomComponents(nestedComponentsPath),
      ...(Object.keys(nestedMediaMap).length > 0 ? { media: nestedMediaMap } : {}),
    };
  }

  return sites;
}

export function shouldWatchDocumentationSource(rootDir: string, changedPath: string): boolean {
  const relativePath = path.relative(rootDir, changedPath).replace(/\\/g, "/");
  const segments = relativePath.split("/");
  const firstSegment = segments[0];
  const baseName = segments[segments.length - 1];
  const isCustomComponentModule =
    /(^|\/)\.dmd\/\.components\/[^/]+\.(svelte|jsx?|tsx?|mjs|cjs)$/i.test(relativePath) ||
    /(^|\/)\.dmd\/[^/]+\.(svelte|jsx?|tsx?|mjs|cjs)$/i.test(relativePath);

  // Build outputs can be written at any depth (e.g. `.nojekyll` inside nested
  // documentation roots), so generated artifacts are matched by basename to
  // avoid watcher -> rebuild -> watcher feedback loops. `.dmd/` internals are
  // hidden build output — except user-authored components/config — and the
  // root `index.html` symlink must never trigger a rebuild loop either.
  const inSiteWorkspace = segments.includes(".dmd");
  const isWorkspaceComponent = isCustomComponentModule;
  let isWorkspaceConfig = false;
  try {
    const absChanged = path.resolve(changedPath);
    const configDir = path.resolve(rootDir, ".dmd", ".config");
    const relToConfig = path.relative(configDir, absChanged).replace(/\\/g, "/");
    isWorkspaceConfig =
      relToConfig !== "" && !relToConfig.startsWith("..") && /^(docs|dmd)\.json$/i.test(path.basename(absChanged));
  } catch {
    isWorkspaceConfig = false;
  }
  const isGeneratedOutput =
    baseName === ".nojekyll" ||
    GENERATED_DOC_OUTPUTS.includes(baseName) ||
    segments.includes(".dist") ||
    segments.includes(".singlefile") ||
    (inSiteWorkspace && !isWorkspaceComponent && !isWorkspaceConfig) ||
    (baseName === "index.html" && inSiteWorkspace === false && segments.length === 1);

  // Check if changedPath is a root markdown file in the parent project directory
  const parentDir = path.dirname(rootDir);
  const isDirectParentMarkdown =
    path.dirname(path.resolve(changedPath)).toLowerCase() === parentDir.toLowerCase() &&
    /\.(md|mdx)$/i.test(changedPath);

  if (isDirectParentMarkdown && !baseName.startsWith(".") && baseName !== "SKILL.md") {
    return true;
  }

  return (
    Boolean(relativePath) &&
    !relativePath.startsWith("..") &&
    (!relativePath.startsWith(".") || isCustomComponentModule || isWorkspaceConfig) &&
    !isGeneratedOutput &&
    !GENERATED_DOC_OUTPUTS.includes(relativePath) &&
    firstSegment !== "node_modules" &&
    firstSegment !== "dist"
  );
}

export async function buildCommand(targetDirArg: string = "./docs", options: BuildOptions = {}): Promise<BuildResult> {
  const targetDir = path.resolve(process.cwd(), targetDirArg);
  const rootDir = process.cwd();
  const silent = options.silent === true;
  const log = (...args: unknown[]) => {
    if (!silent) console.log(...(args as [unknown, ...unknown[]]));
  };

  // Link root markdown files into targetDir if targetDir is a direct subfolder of rootDir (e.g. ./docs)
  const isDirectSubfolder =
    path.resolve(rootDir).toLowerCase() !== path.resolve(targetDir).toLowerCase() &&
    path.dirname(targetDir).toLowerCase() === path.resolve(rootDir).toLowerCase();

  let linkedRootFiles: string[] = [];
  if (isDirectSubfolder) {
    const linkResult = linkRootMarkdownFiles(rootDir, targetDir);
    linkedRootFiles = linkResult.linked;
  }

  const { onlineDir, offlineDir, siteDir } = getBuildOutputPaths(targetDir, options.outDir);
  const buildOfflineBundle = options.singleFile !== false;

  log(chalk.bold.magenta("\n⚡ DocMeDown Build\n"));
  if (isDirectSubfolder) {
    log(
      chalk.dim(
        `  Unified documents: Root (*.md) + ${path.relative(rootDir, targetDir) || targetDirArg} (linked by default without ./docs/ subdivision)`,
      ),
    );
    if (linkedRootFiles.length > 0) {
      log(
        chalk.green(
          `  ✔ Linked root markdown file${linkedRootFiles.length === 1 ? "" : "s"}: ${linkedRootFiles.join(", ")}`,
        ),
      );
    }
  }

  if (!fs.existsSync(targetDir)) {
    console.error(chalk.red(`✖ Directory not found: ${targetDir}`));
    process.exit(1);
  }

  if (!fs.existsSync(onlineDir)) {
    fs.mkdirSync(onlineDir, { recursive: true });
  }

  // GitHub Pages branch deployments run through Jekyll by default. Keep the
  // generated underscore-prefixed data file and other static assets untouched
  // when a user publishes the documentation directory directly.
  fs.writeFileSync(path.join(onlineDir, ".nojekyll"), "", "utf-8");

  if (buildOfflineBundle && !fs.existsSync(offlineDir)) {
    fs.mkdirSync(offlineDir, { recursive: true });
  }

  // One-time structural adoption: migrate legacy user content into the hidden
  // workspace layout (`.dmd/.components/`, `.dmd/.config/`, `.dmd/favicon.*`).
  // Backward-compatible fallbacks keep old locations working.
  migrateLegacyWorkspaceLayout(targetDir, onlineDir);

  // Load config: `<siteDir>/.config/docs.json` by default, with legacy
  // `<targetDir>/docs.json` / `dmd.json` fallbacks for backward compatibility.
  let config: DocConfig = normalizeConfig();
  const configPath = resolveExistingConfigPath(targetDir);
  if (fs.existsSync(configPath)) {
    try {
      config = normalizeConfig(parseDocConfigJson(fs.readFileSync(configPath, "utf-8"), configPath));
    } catch (error) {
      throw new Error(`Could not validate ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 1. Generate _manifest.json
  log(chalk.cyan("  Indexing documentation pages..."));
  const manifest = generateManifest(targetDir, config);
  const manifestPath = path.join(onlineDir, "_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  log(chalk.green(`  ✔ Generated _manifest.json (${manifest.docs.length} pages indexed)`));

  // Collect all markdown documents into dictionary
  const docsMap: Record<string, string> = {};
  const files = scanDirectory(targetDir);
  for (const file of files) {
    const full = path.join(targetDir, file);
    const raw = fs.readFileSync(full, "utf-8");
    const slug = file.replace(/\.(md|mdx)$/i, "");
    const cleanSlug = slug.toLowerCase() === "readme" || slug.toLowerCase() === "index" ? "README" : slug;
    docsMap[cleanSlug] = raw;
    docsMap[file] = raw;
  }

  // Inject default embedded DMD documentation (accessible exclusively via the footer)
  for (const [key, content] of Object.entries(embeddedDmdDocs(config))) {
    if (!docsMap[key]) {
      docsMap[key] = content;
    }
  }

  // Inline online and local sources referenced by Card components so offline bundles are truly offline
  const inlinedSources = await inlineCardOnlineSources(docsMap, targetDir);
  if (inlinedSources.length > 0) {
    log(
      chalk.green(
        `  ✔ Inlined ${inlinedSources.length} Card online source${inlinedSources.length === 1 ? "" : "s"} into offline bundle`,
      ),
    );
  }

  // Inline media sources (raster images, vector SVG, video, audio) into lossless data URIs
  const { inlinedCount: inlinedMediaCount, mediaMap } = await inlineMediaSources(docsMap, targetDir);
  if (inlinedMediaCount > 0) {
    log(
      chalk.green(
        `  ✔ Embedded ${inlinedMediaCount} media asset${inlinedMediaCount === 1 ? "" : "s"} into offline bundle (lossless data URIs)`,
      ),
    );
  }

  const componentsPath = resolveExistingComponentsDir(targetDir);
  loadBuildTimeCustomSetup(componentsPath);
  const componentsSource = bundleCustomComponents(componentsPath);

  // 2. Generate _docs.js for precompiled local and file:/// documentation data.
  // Custom components are bundled so embedded Blob modules can use relative imports.
  const docsJsContent = `window.__DOCMEDOWN_DATA__ = ${JSON.stringify(
    {
      manifest,
      docs: docsMap,
      componentsSource,
      ...(Object.keys(mediaMap).length > 0 ? { media: mediaMap } : {}),
    },
    null,
    2,
  )};\n`;
  const docsJsPath = path.join(onlineDir, "_docs.js");
  fs.writeFileSync(docsJsPath, docsJsContent, "utf-8");
  log(chalk.green(`  ✔ Generated _docs.js for offline file:/// double-click usage`));

  // 2.5 Emit AI context files (llms.txt, llms-full.txt, SKILL.md, okf.json).
  const aiContextPaths = emitAiContextFiles(onlineDir, manifest, config);
  log(chalk.green(`  ✔ Generated AI context files: ${aiContextPaths.map((p) => path.basename(p)).join(", ")}`));

  // 2.6 Prerender the static site (pages, sitemap, robots, 404) unless disabled.
  // The serveable site lives in the hidden workspace; the docs root keeps only
  // the `index.html` symlink distributable.
  if (options.static !== false) {
    emitStaticSite(onlineDir, manifest, docsMap, config, { silent });
  }

  // 3. Build the offline bundle by default. --no-single-file skips this artifact.
  let nestedCount = 0;
  if (buildOfflineBundle) {
    log(chalk.cyan("\n  Compiling standalone single-file offline index.html..."));
    const embedNestedDocs = config.offline?.embedNestedDocs !== false;
    const nestedSites =
      embedNestedDocs && options.buildNested !== false ? await collectNestedOfflineSites(targetDir) : undefined;
    nestedCount = nestedSites ? Object.keys(nestedSites).length : 0;
    if (nestedCount > 0) {
      log(
        chalk.green(
          `  ✔ Embedded ${nestedCount} nested documentation site${nestedCount === 1 ? "" : "s"} into the offline bundle`,
        ),
      );
    }

    const corpusHasDiagrams = Object.values(docsMap).some((source) =>
      /(?:^|\n)[ \t]*(?:`{3,}|~{3,})[ \t]*mermaid\b/i.test(source),
    );
    const anySiteHasDiagrams =
      corpusHasDiagrams ||
      Boolean(
        nestedSites &&
          Object.values(nestedSites).some((site) =>
            Object.values(site.docs).some((source) => /(?:^|\n)[ \t]*(?:`{3,}|~{3,})[ \t]*mermaid\b/i.test(source)),
          ),
      );

    let bundleJs = "";
    if (anySiteHasDiagrams) {
      const iifeCandidates = [
        path.resolve(__dirname, "docmedown.iife.js"),
        path.resolve(__dirname, "../dist/docmedown.iife.js"),
        path.resolve(__dirname, "../docmedown.iife.js"),
      ];
      const distIifePath = iifeCandidates.find((p) => fs.existsSync(p));
      if (distIifePath) {
        bundleJs = fs.readFileSync(distIifePath, "utf-8");
      } else {
        const webCandidates = [
          path.resolve(__dirname, "docmedown.web.js"),
          path.resolve(__dirname, "../dist/docmedown.web.js"),
          path.resolve(__dirname, "../docmedown.web.js"),
        ];
        const mermaidCandidates = [
          path.resolve(__dirname, "docmedown-mermaid.js"),
          path.resolve(__dirname, "../dist/docmedown-mermaid.js"),
          path.resolve(__dirname, "../docmedown-mermaid.js"),
        ];
        const webPath = webCandidates.find((p) => fs.existsSync(p));
        const mermaidPath = mermaidCandidates.find((p) => fs.existsSync(p));
        if (webPath && mermaidPath) {
          bundleJs = `${fs.readFileSync(webPath, "utf-8")}\n;${fs.readFileSync(mermaidPath, "utf-8")}`;
        }
      }
    } else {
      // Sites without diagrams use the lean web runtime, shrinking offline bundles by ~75%.
      const webCandidates = [
        path.resolve(__dirname, "docmedown.web.js"),
        path.resolve(__dirname, "../dist/docmedown.web.js"),
        path.resolve(__dirname, "../docmedown.web.js"),
      ];
      const distWebPath = webCandidates.find((p) => fs.existsSync(p));
      if (distWebPath) {
        bundleJs = fs.readFileSync(distWebPath, "utf-8");
      } else {
        const iifeCandidates = [
          path.resolve(__dirname, "docmedown.iife.js"),
          path.resolve(__dirname, "../dist/docmedown.iife.js"),
          path.resolve(__dirname, "../docmedown.iife.js"),
        ];
        const distIifePath = iifeCandidates.find((p) => fs.existsSync(p));
        if (distIifePath) {
          bundleJs = fs.readFileSync(distIifePath, "utf-8");
        }
      }
    }

    if (!bundleJs) {
      console.warn(chalk.yellow("  ⚠ Local runtime bundle not found, linking CDN script."));
    }

    const envelope: OfflineEnvelope = {
      version: OFFLINE_FORMAT_VERSION,
      data: {
        manifest,
        docs: docsMap,
        componentsSource,
        ...(Object.keys(mediaMap).length > 0 ? { media: mediaMap } : {}),
        ...(nestedSites && nestedCount > 0 ? { nestedSites } : {}),
      },
      runtime: bundleJs,
    };
    const encodedEnvelope = encodeCompressedOfflineEnvelope(envelope);
    const resolvedOfflineFavicon = resolveFaviconForOffline(config.theme?.favicon, targetDir);
    const singleFileHtml = createCompressedOfflineHtml(
      encodedEnvelope,
      config.name || "Documentation",
      {
        tagline: config.tagline,
        version: config.version,
        logo: config.theme?.logo?.light,
        logoDark: config.theme?.logo?.dark,
        logoAlt: config.theme?.logo?.alt,
        accent: config.theme?.accentColor,
        accentDark: config.theme?.accentColorDark,
      },
      resolvedOfflineFavicon,
    );

    const singleFilePath = path.join(offlineDir, "index.html");
    fs.writeFileSync(singleFilePath, singleFileHtml, "utf-8");
    log(chalk.bold.green(`  ✔ Built self-contained offline bundle: ${singleFilePath}`));
    log(
      chalk.dim(
        `    Compressed ${Buffer.byteLength(JSON.stringify(envelope), "utf-8").toLocaleString()} bytes to ${Buffer.byteLength(singleFileHtml, "utf-8").toLocaleString()} bytes.`,
      ),
    );
    log(chalk.dim(`    You can now double-click index.html to view offline without any server!\n`));
  }

  // 4. Copy the runtime the serveable documentation site loads, plus its
  //    on-demand engine bundles.
  //    The served site uses the lightweight `docmedown.web.js` (Mermaid is
  //    externalized to `docmedown-mermaid.js` and fetched only by pages with a
  //    diagram). The self-contained IIFE and the ESM code-split chunks are not
  //    copied: offline copies embed the IIFE as a string, and the served site
  //    never loads the ESM entry, so shipping them here is dead weight.
  const distDir = path.resolve(__dirname, "../dist");

  // Remove runtime artifacts an earlier build copied into the served directory
  // but this architecture no longer serves (the monolithic IIFE and the ESM
  // code-split chunks). Without this the published site keeps shipping ~7 MB of
  // dead files.
  if (fs.existsSync(onlineDir)) {
    for (const entry of fs.readdirSync(onlineDir)) {
      const isStaleChunk = /^(mermaid|katex|prism)-.+\.(mjs|js)$/.test(entry) || /^chunk-.+\.(mjs|js)$/.test(entry);
      if (entry === "docmedown.iife.js" || isStaleChunk) {
        fs.rmSync(path.join(onlineDir, entry), { force: true });
      }
    }
  }

  // Mermaid is only needed by pages that author a diagram, so its engine bundle
  // ships only when the corpus contains a Mermaid fence. Without this every
  // nested documentation site would carry a ~3.3 MB engine it never loads.
  const corpusHasDiagrams = Object.values(docsMap).some((source) =>
    /(?:^|\n)[ \t]*(?:`{3,}|~{3,})[ \t]*mermaid\b/i.test(source),
  );
  const runtimeAssets = corpusHasDiagrams ? ["docmedown.web.js", "docmedown-mermaid.js"] : ["docmedown.web.js"];
  const copiedAssets: string[] = [];
  for (const asset of runtimeAssets) {
    const source = [path.resolve(__dirname, asset), path.resolve(distDir, asset)].find((p) => fs.existsSync(p));
    if (!source) continue;
    const target = path.join(onlineDir, asset);
    if (path.resolve(source) === path.resolve(target)) continue;
    fs.copyFileSync(source, target);
    copiedAssets.push(asset);
  }
  if (copiedAssets.length > 0) {
    log(chalk.green(`  ✔ Updated serveable runtime: ${copiedAssets.join(", ")}`));
  }
  // Drop a previously copied engine once the corpus no longer authors diagrams.
  if (!runtimeAssets.includes("docmedown-mermaid.js")) {
    fs.rmSync(path.join(onlineDir, "docmedown-mermaid.js"), { force: true });
  }

  if (options.buildNested !== false) {
    const nestedRoots = findNestedDocumentationRoots(targetDir);
    for (const nestedRoot of nestedRoots) {
      log(chalk.cyan(`\n  Building nested documentation site: ${path.relative(targetDir, nestedRoot)}...`));
      await buildCommand(nestedRoot, { buildNested: false, silent });
    }
  }

  // 5. Structural cleanup: the docs folder keeps ONLY documentation sources
  // plus the single `index.html` symlink distributable. Everything else lives
  // in the hidden workspace; drop legacy artifacts from the docs root.
  cleanupLegacyRootArtifacts(targetDir, siteDir, offlineDir, buildOfflineBundle);

  // 6. Root `index.html` symlink → serveable SEO site entrypoint (ONLY
  // documentation distributable artifact at the docs root; the offline
  // bundle stays available at `.dmd/.singlefile/index.html`).
  try {
    ensureRootSiteSymlinks(targetDir, siteDir);
    log(chalk.green(`  ✔ Linked docs index.html → .dmd SEO site entrypoint`));
  } catch {
    // best effort — site remains fully serveable from the hidden workspace
  }

  log(chalk.bold.green("✨ Build completed successfully!\n"));

  return {
    targetDir,
    siteDir,
    offlineDir: buildOfflineBundle ? offlineDir : null,
    pages: manifest.docs.length,
    nestedCount,
  };
}

export async function watchBuildCommand(targetDirArg: string = "./docs", options: BuildOptions = {}): Promise<never> {
  const targetDir = path.resolve(process.cwd(), targetDirArg);
  void (await buildCommand(targetDir, { ...options, watch: false }));

  console.log(chalk.dim(`  Watching source files in: ${targetDir}`));
  console.log(
    chalk.dim("  Source changes rebuild serveable files and .dmd/.singlefile/index.html. Press Ctrl+C to stop.\n"),
  );

  const watcher = chokidar.watch(targetDir, {
    ignored: [
      "**/dist/**",
      "**/.dist/**",
      "**/.dmd/**",
      "**/dmd/**",
      "**/node_modules/**",
      "**/.git/**",
      "**/.nojekyll",
      "**/_manifest.json",
      "**/_docs.js",
      "**/docmedown.iife.js",
    ],
    ignoreInitial: true,
  });

  let rebuildTimeout: NodeJS.Timeout | null = null;
  watcher.on("all", (_event, changedPath) => {
    if (!shouldWatchDocumentationSource(targetDir, changedPath)) return;

    if (rebuildTimeout) clearTimeout(rebuildTimeout);
    rebuildTimeout = setTimeout(async () => {
      const relativePath = path.relative(targetDir, changedPath);
      console.log(chalk.cyan(`[DocMeDown] Changed: ${relativePath} -> Rebuilding documentation...`));
      try {
        void (await buildCommand(targetDir, { ...options, watch: false }));
      } catch (err: any) {
        console.error(chalk.red(`[DocMeDown] Rebuild failed: ${err.message}`));
      }
    }, 100);
  });

  return new Promise<never>(() => undefined);
}
