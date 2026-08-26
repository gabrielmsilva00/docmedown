import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import chokidar from "chokidar";
import { normalizeConfig, parseDocConfigJson } from "../../runtime/config";
import type { DocConfig } from "../../runtime/types";
import { generateManifest, scanDirectory } from "../utils/scanner";

export interface BuildOptions {
  singleFile?: boolean;
  outDir?: string;
  watch?: boolean;
  buildNested?: boolean;
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

export function escapeInlineScriptContent(value: string): string {
  return value.replace(/<\/script/gi, "<\\/script");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const GENERATED_DOC_OUTPUTS = ["_manifest.json", "_docs.js", "docmedown.iife.js"];

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

export function shouldWatchDocumentationSource(rootDir: string, changedPath: string): boolean {
  const relativePath = path.relative(rootDir, changedPath).replace(/\\/g, "/");
  const firstSegment = relativePath.split("/")[0];
  const isCustomComponentModule = /(^|\/)\.dmd\/(components|index)\.js$/i.test(relativePath);

  return (
    Boolean(relativePath) &&
    !relativePath.startsWith("..") &&
    (!relativePath.startsWith(".") || isCustomComponentModule) &&
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

  const componentsPath = path.join(targetDir, ".dmd", "components.js");
  const componentsSource = fs.existsSync(componentsPath) ? fs.readFileSync(componentsPath, "utf-8") : undefined;

  // 2. Generate _docs.js for 100% offline file:/// double-click compatibility
  const docsJsContent = `window.__DOCMEDOWN_DATA__ = ${JSON.stringify({ manifest, docs: docsMap, componentsSource }, null, 2)};\n`;
  const docsJsPath = path.join(onlineDir, "_docs.js");
  fs.writeFileSync(docsJsPath, docsJsContent, "utf-8");
  console.log(chalk.green(`  ✔ Generated _docs.js for offline file:/// double-click usage`));

  // 3. Build the offline bundle by default. --no-single-file skips this artifact.
  if (buildOfflineBundle) {
    console.log(chalk.cyan("\n  Compiling standalone single-file offline index.html..."));
    const candidates = [
      path.resolve(__dirname, "docmedown.iife.js"),
      path.resolve(__dirname, "../dist/docmedown.iife.js"),
      path.resolve(__dirname, "../docmedown.iife.js"),
    ];
    const distIifePath = candidates.find((p) => fs.existsSync(p));
    let bundleJs = "";

    if (distIifePath) {
      bundleJs = fs.readFileSync(distIifePath, "utf-8");
    } else {
      console.warn(chalk.yellow("  ⚠ Local runtime bundle not found, linking CDN script."));
    }

    const offlinePayload = encodeOfflinePayload({ manifest, docs: docsMap, componentsSource });
    const safeBundleJs = escapeInlineScriptContent(bundleJs);
    const singleFileHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(config.name || "Documentation")}</title>
</head>
<body>
  <div id="dmd-app"></div>
  <script>
    (function () {
      const encoded = '${offlinePayload}';
      const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      const data = JSON.parse(new TextDecoder().decode(bytes));
      window.__DOCMEDOWN_DATA__ = data;
      window.__DOCMEDOWN_CONFIG__ = data.manifest.config;
      if (data.componentsSource) {
        const componentModule = new Blob([data.componentsSource], { type: 'text/javascript' });
        const componentModuleUrl = URL.createObjectURL(componentModule);
        window.__DOCMEDOWN_COMPONENTS_READY__ = import(componentModuleUrl)
          .then((module) => module.default || module)
          .finally(() => URL.revokeObjectURL(componentModuleUrl));
      }
    })();
  </script>
  <script>
${safeBundleJs}
  </script>
</body>
</html>`;

    const singleFilePath = path.join(offlineDir, "index.html");
    fs.writeFileSync(singleFilePath, singleFileHtml, "utf-8");
    console.log(chalk.bold.green(`  ✔ Built self-contained offline bundle: ${singleFilePath}`));
    console.log(chalk.dim(`    You can now double-click index.html to view offline without any server!\n`));
  }

  // 4. Copy the runtime used by the serveable documentation site.
  const candidates = [
    path.resolve(__dirname, "docmedown.iife.js"),
    path.resolve(__dirname, "../dist/docmedown.iife.js"),
    path.resolve(__dirname, "../docmedown.iife.js"),
  ];
  const distIifePath = candidates.find((p) => fs.existsSync(p));
  const targetBundlePath = path.join(onlineDir, "docmedown.iife.js");
  if (distIifePath) {
    fs.copyFileSync(distIifePath, targetBundlePath);
    console.log(chalk.green(`  ✔ Updated serveable runtime: ${targetBundlePath}`));
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
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/.dist/**",
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
