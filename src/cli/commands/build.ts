import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import chalk from "chalk";
import chokidar from "chokidar";
import { buildSync } from "esbuild";
import { compile } from "svelte/compiler";
import { normalizeConfig, parseDocConfigJson } from "../../runtime/config";

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
import { generateManifest, scanDirectory } from "../utils/scanner";

export interface BuildOptions {
  singleFile?: boolean;
  outDir?: string;
  watch?: boolean;
  buildNested?: boolean;
  /** Prerender static pages + SEO/AI support files (default: true). */
  static?: boolean;
}

export const DEFAULT_OFFLINE_OUTPUT_DIRECTORY = ".dist";

export function getBuildOutputPaths(targetDir: string, offlineOutDir?: string) {
  return {
    onlineDir: targetDir,
    offlineDir: offlineOutDir
      ? path.resolve(process.cwd(), offlineOutDir)
      : path.join(targetDir, DEFAULT_OFFLINE_OUTPUT_DIRECTORY),
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
  let dmdDir: string | undefined;
  let legacyFile: string | undefined;

  if (fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      if (fs.existsSync(path.join(targetPath, ".dmd"))) {
        dmdDir = path.join(targetPath, ".dmd");
      } else {
        dmdDir = targetPath;
      }
    } else {
      legacyFile = targetPath;
      dmdDir = path.dirname(targetPath);
    }
  } else {
    const parent = path.dirname(targetPath);
    if (fs.existsSync(parent) && fs.statSync(parent).isDirectory()) {
      dmdDir = parent;
    } else {
      return undefined;
    }
  }

  const svelteFiles =
    dmdDir && fs.existsSync(dmdDir) ? fs.readdirSync(dmdDir).filter((file) => file.endsWith(".svelte")) : [];

  if (svelteFiles.length > 0 && dmdDir) {
    try {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "docmedown-svelte-bundle-"));
      try {
        const dmdEntries = fs.readdirSync(dmdDir);
        for (const entry of dmdEntries) {
          if (!entry.endsWith(".svelte")) {
            const src = path.join(dmdDir, entry);
            if (fs.statSync(src).isFile()) {
              fs.copyFileSync(src, path.join(tempDir, entry));
            }
          }
        }

        const entryImports: string[] = [];
        const entryExports: string[] = [];
        for (const svelteFile of svelteFiles) {
          const rawSource = fs.readFileSync(path.join(dmdDir, svelteFile), "utf-8");
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

        const result = buildSync({
          entryPoints: [entryPath],
          bundle: true,
          format: "esm",
          platform: "browser",
          target: "es2022",
          write: false,
          minify: true,
          external: ["svelte", "svelte/*"],
          legalComments: "none",
        });

        const bundledSource = result.outputFiles[0]?.text;
        if (!bundledSource) {
          throw new Error("esbuild did not produce an output module for Svelte components.");
        }

        return bundledSource;
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      throw new Error(
        `Could not bundle Svelte custom components from ${dmdDir}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Fallback to setup.js / languages.js / components.js / index.js if present
  const candidate =
    (legacyFile && fs.existsSync(legacyFile) && !fs.statSync(legacyFile).isDirectory() ? legacyFile : undefined) ||
    (dmdDir &&
      [
        path.join(dmdDir, "setup.js"),
        path.join(dmdDir, "languages.js"),
        path.join(dmdDir, "components.js"),
        path.join(dmdDir, "index.js"),
      ].find((p) => fs.existsSync(p)));

  if (!candidate || !fs.existsSync(candidate)) return undefined;

  try {
    const result = buildSync({
      entryPoints: [candidate],
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
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
      if (fs.existsSync(path.join(fullPath, "docs.json"))) {
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
 * Loads every nested documentation root into an embeddable offline payload so
 * the parent's single-file bundle can open subdocumentation without any
 * external files. Keys are the nested root's path relative to the parent root.
 */
export function collectNestedOfflineSites(targetDir: string): Record<string, OfflineNestedSiteData> {
  const sites: Record<string, OfflineNestedSiteData> = {};

  for (const nestedRoot of findNestedDocumentationRoots(targetDir)) {
    const key = path.relative(targetDir, nestedRoot).replace(/\\/g, "/");
    const nestedConfigPath = path.join(nestedRoot, "docs.json");
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

    const nestedComponentsPath = path.join(nestedRoot, ".dmd");
    loadBuildTimeCustomSetup(nestedComponentsPath);
    sites[key] = {
      name: nestedConfig.name || key,
      manifest: generateManifest(nestedRoot, nestedConfig),
      docs: nestedDocs,
      componentsSource: bundleCustomComponents(nestedComponentsPath),
    };
  }

  return sites;
}

export function shouldWatchDocumentationSource(rootDir: string, changedPath: string): boolean {
  const relativePath = path.relative(rootDir, changedPath).replace(/\\/g, "/");
  const segments = relativePath.split("/");
  const firstSegment = segments[0];
  const baseName = segments[segments.length - 1];
  const isCustomComponentModule = /(^|\/)\.dmd\/[^/]+\.(svelte|js|ts)$/i.test(relativePath);

  // Build outputs can be written at any depth (e.g. `.nojekyll` inside nested
  // documentation roots), so generated artifacts are matched by basename to
  // avoid watcher -> rebuild -> watcher feedback loops.
  const isGeneratedOutput =
    baseName === ".nojekyll" || GENERATED_DOC_OUTPUTS.includes(baseName) || segments.includes(".dist");

  return (
    Boolean(relativePath) &&
    !relativePath.startsWith("..") &&
    (!relativePath.startsWith(".") || isCustomComponentModule) &&
    !isGeneratedOutput &&
    !GENERATED_DOC_OUTPUTS.includes(relativePath) &&
    firstSegment !== "node_modules" &&
    firstSegment !== "dist"
  );
}

export async function buildCommand(targetDirArg: string = "./docs", options: BuildOptions = {}) {
  const targetDir = path.resolve(process.cwd(), targetDirArg);
  const { onlineDir, offlineDir } = getBuildOutputPaths(targetDir, options.outDir);
  const buildOfflineBundle = options.singleFile !== false;

  console.log(chalk.bold.magenta("\n⚡ DocMeDown Build\n"));

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

  // Load config if exists
  let config: DocConfig = normalizeConfig();
  const configPath = path.join(targetDir, "docs.json");
  if (fs.existsSync(configPath)) {
    try {
      config = normalizeConfig(parseDocConfigJson(fs.readFileSync(configPath, "utf-8"), configPath));
    } catch (error) {
      throw new Error(`Could not validate ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 1. Generate _manifest.json
  console.log(chalk.cyan("  Indexing documentation pages..."));
  const manifest = generateManifest(targetDir, config);
  const manifestPath = path.join(onlineDir, "_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(chalk.green(`  ✔ Generated _manifest.json (${manifest.docs.length} pages indexed)`));

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

  const componentsPath = path.join(targetDir, ".dmd");
  loadBuildTimeCustomSetup(componentsPath);
  const componentsSource = bundleCustomComponents(componentsPath);

  // 2. Generate _docs.js for precompiled local and file:/// documentation data.
  // Custom components are bundled so embedded Blob modules can use relative imports.
  const docsJsContent = `window.__DOCMEDOWN_DATA__ = ${JSON.stringify({ manifest, docs: docsMap, componentsSource }, null, 2)};\n`;
  const docsJsPath = path.join(onlineDir, "_docs.js");
  fs.writeFileSync(docsJsPath, docsJsContent, "utf-8");
  console.log(chalk.green(`  ✔ Generated _docs.js for offline file:/// double-click usage`));

  // 2.5 Emit AI context files (llms.txt, llms-full.txt, SKILL.md, okf.json).
  const aiContextPaths = emitAiContextFiles(onlineDir, manifest, config);
  console.log(chalk.green(`  ✔ Generated AI context files: ${aiContextPaths.map((p) => path.basename(p)).join(", ")}`));

  // 2.6 Prerender the static site (pages, sitemap, robots, 404) unless disabled.
  if (options.static !== false) {
    emitStaticSite(targetDir, manifest, docsMap, config);
  }

  // 3. Build the offline bundle by default. --no-single-file skips this artifact.
  if (buildOfflineBundle) {
    console.log(chalk.cyan("\n  Compiling standalone single-file offline index.html..."));
    const embedNestedDocs = config.offline?.embedNestedDocs !== false;
    const nestedSites =
      embedNestedDocs && options.buildNested !== false ? collectNestedOfflineSites(targetDir) : undefined;
    const nestedCount = nestedSites ? Object.keys(nestedSites).length : 0;
    if (nestedCount > 0) {
      console.log(
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
        ...(nestedSites && nestedCount > 0 ? { nestedSites } : {}),
      },
      runtime: bundleJs,
    };
    const encodedEnvelope = encodeCompressedOfflineEnvelope(envelope);
    const singleFileHtml = createCompressedOfflineHtml(encodedEnvelope, config.name || "Documentation", {
      tagline: config.tagline,
      version: config.version,
      logo: config.theme?.logo?.light,
      logoDark: config.theme?.logo?.dark,
      logoAlt: config.theme?.logo?.alt,
      accent: config.theme?.accentColor,
      accentDark: config.theme?.accentColorDark,
    });

    const singleFilePath = path.join(offlineDir, "index.html");
    fs.writeFileSync(singleFilePath, singleFileHtml, "utf-8");
    console.log(chalk.bold.green(`  ✔ Built self-contained offline bundle: ${singleFilePath}`));
    console.log(
      chalk.dim(
        `    Compressed ${Buffer.byteLength(JSON.stringify(envelope), "utf-8").toLocaleString()} bytes to ${Buffer.byteLength(singleFileHtml, "utf-8").toLocaleString()} bytes.`,
      ),
    );
    console.log(chalk.dim(`    You can now double-click index.html to view offline without any server!\n`));
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
    console.log(chalk.green(`  ✔ Updated serveable runtime: ${copiedAssets.join(", ")}`));
  }
  // Drop a previously copied engine once the corpus no longer authors diagrams.
  if (!runtimeAssets.includes("docmedown-mermaid.js")) {
    fs.rmSync(path.join(onlineDir, "docmedown-mermaid.js"), { force: true });
  }

  if (options.buildNested !== false) {
    const nestedRoots = findNestedDocumentationRoots(targetDir);
    for (const nestedRoot of nestedRoots) {
      console.log(chalk.cyan(`\n  Building nested documentation site: ${path.relative(targetDir, nestedRoot)}...`));
      await buildCommand(nestedRoot, { buildNested: false });
    }
  }

  console.log(chalk.bold.green("✨ Build completed successfully!\n"));
}

export async function watchBuildCommand(targetDirArg: string = "./docs", options: BuildOptions = {}): Promise<never> {
  const targetDir = path.resolve(process.cwd(), targetDirArg);
  await buildCommand(targetDir, { ...options, watch: false });

  console.log(chalk.dim(`  Watching source files in: ${targetDir}`));
  console.log(chalk.dim("  Source changes rebuild serveable files and .dist/index.html. Press Ctrl+C to stop.\n"));

  const watcher = chokidar.watch(targetDir, {
    ignored: [
      "**/dist/**",
      "**/.dist/**",
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
        await buildCommand(targetDir, { ...options, watch: false });
      } catch (err: any) {
        console.error(chalk.red(`[DocMeDown] Rebuild failed: ${err.message}`));
      }
    }, 100);
  });

  return new Promise<never>(() => undefined);
}
