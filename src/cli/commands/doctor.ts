import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { transformSync } from "esbuild";
import matter from "gray-matter";
import { compile } from "svelte/compiler";
import { isFaviconPreset } from "../../runtime/favicons";
import { dmdTag, ensureCustomElementTag } from "../../runtime/svelte-tag";
import { convertReactToSvelte } from "../utils/react-to-svelte";
import { scanDirectory } from "../utils/scanner";

export interface DoctorCheck {
  id: string;
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  details?: string[];
}

export interface DoctorReport {
  ok: boolean;
  checks: DoctorCheck[];
  summary: {
    pass: number;
    warn: number;
    fail: number;
  };
}

export interface DoctorOptions {
  json?: boolean;
  silent?: boolean;
  exitOnError?: boolean;
}

/**
 * Checks whether current Node version satisfies requirement (>=20.19.0).
 */
export function checkNodeVersion(versionStr: string = process.version): {
  supported: boolean;
  version: string;
  minRequired: string;
} {
  const minRequired = "20.19.0";
  const clean = versionStr.replace(/^v/, "");
  const [major, minor, patch] = clean.split(".").map((n) => Number.parseInt(n, 10) || 0);

  const isSupported = major > 20 || (major === 20 && (minor > 19 || (minor === 19 && patch >= 0)));
  return {
    supported: isSupported,
    version: versionStr,
    minRequired: `>=${minRequired}`,
  };
}

/**
 * Diagnoses environment, project structure, asset references, and .dmd custom components.
 */
export async function doctorCommand(
  targetDirArg: string = "./docs",
  options: DoctorOptions = {},
): Promise<DoctorReport> {
  const targetDir = path.resolve(process.cwd(), targetDirArg);
  const checks: DoctorCheck[] = [];

  // 1. Node.js Environment Check
  const nodeCheck = checkNodeVersion();
  if (nodeCheck.supported) {
    checks.push({
      id: "node-env",
      name: "Node.js Environment",
      status: "pass",
      message: `${nodeCheck.version} (satisfies requirement ${nodeCheck.minRequired})`,
    });
  } else {
    checks.push({
      id: "node-env",
      name: "Node.js Environment",
      status: "fail",
      message: `${nodeCheck.version} is not officially supported. DocMeDown requires Node.js ${nodeCheck.minRequired}`,
    });
  }

  // 2. Target Directory & Documentation Structure
  if (!fs.existsSync(targetDir)) {
    checks.push({
      id: "structure",
      name: "Documentation Structure",
      status: "fail",
      message: `Documentation directory does not exist: ${targetDir}`,
    });
    // Return early if directory does not exist
    return finishReport(checks, options, targetDirArg);
  }

  const docsJsonPath = path.join(targetDir, "docs.json");
  const dmdJsonPath = path.join(targetDir, "dmd.json");
  let configFile: string | null = null;
  let parsedConfig: Record<string, any> | null = null;

  if (fs.existsSync(docsJsonPath)) {
    configFile = "docs.json";
  } else if (fs.existsSync(dmdJsonPath)) {
    configFile = "dmd.json";
  }

  if (configFile) {
    try {
      parsedConfig = JSON.parse(fs.readFileSync(path.join(targetDir, configFile), "utf-8"));
      checks.push({
        id: "config",
        name: "Configuration File",
        status: "pass",
        message: `Found valid configuration file: ${configFile}`,
      });
    } catch (err) {
      checks.push({
        id: "config",
        name: "Configuration File",
        status: "fail",
        message: `Syntax error in ${configFile}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  } else {
    checks.push({
      id: "config",
      name: "Configuration File",
      status: "warn",
      message: "No docs.json or dmd.json found (using default configuration)",
    });
  }

  const docFiles = scanDirectory(targetDir);
  const hasHomeDoc = docFiles.some((f) => {
    const base = path.basename(f, path.extname(f)).toLowerCase();
    return base === "readme" || base === "index";
  });

  if (docFiles.length === 0) {
    checks.push({
      id: "docs-content",
      name: "Documentation Documents",
      status: "warn",
      message: `No markdown documents (.md, .mdx) found in ${targetDirArg}`,
    });
  } else if (!hasHomeDoc) {
    checks.push({
      id: "docs-content",
      name: "Documentation Documents",
      status: "warn",
      message: `Found ${docFiles.length} document(s), but missing a home page (README.md or index.md)`,
    });
  } else {
    checks.push({
      id: "docs-content",
      name: "Documentation Documents",
      status: "pass",
      message: `Found ${docFiles.length} markdown document(s) with valid home page`,
    });
  }

  // 3. Asset Integrity Verification
  const missingAssets: Array<{ ref: string; file: string }> = [];
  let totalAssetRefs = 0;

  // Check config-level assets if present
  if (parsedConfig) {
    const configAssets = [
      parsedConfig.logo,
      parsedConfig.favicon,
      parsedConfig.theme?.logo?.light,
      parsedConfig.theme?.logo?.dark,
      parsedConfig.theme?.favicon,
      parsedConfig.customCss,
    ].filter(Boolean);
    for (const assetPath of configAssets) {
      if (typeof assetPath === "string" && !/^(https?:|data:|\/\/)/i.test(assetPath)) {
        if (isFaviconPreset(assetPath)) continue;
        totalAssetRefs++;
        const resolved = path.resolve(targetDir, assetPath.replace(/^\//, ""));
        if (!fs.existsSync(resolved)) {
          missingAssets.push({ ref: assetPath, file: configFile || "docs.json" });
        }
      }
    }
  }

  // Scan markdown documents for image and media asset references
  for (const relFile of docFiles) {
    const fullPath = path.join(targetDir, relFile);
    const fileDir = path.dirname(fullPath);
    let content = "";
    try {
      const raw = fs.readFileSync(fullPath, "utf-8");
      content = matter(raw).content;
    } catch {
      continue;
    }

    // Strip code blocks and inline code spans so documentation examples are not treated as local assets
    const sanitizedContent = content.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, "").replace(/`[^`\n]*`/g, "");

    // Markdown image syntax: ![alt](path)
    const imgRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
    for (const match of sanitizedContent.matchAll(imgRegex)) {
      const assetUrl = match[2].trim();
      if (!/^(https?:|data:|\/\/|#)/i.test(assetUrl)) {
        totalAssetRefs++;
        const cleanPath = assetUrl.split("?")[0].split("#")[0];
        const candidateRelative = path.resolve(fileDir, cleanPath);
        const candidateRoot = path.resolve(targetDir, cleanPath.replace(/^\//, ""));

        if (!fs.existsSync(candidateRelative) && !fs.existsSync(candidateRoot)) {
          missingAssets.push({ ref: assetUrl, file: relFile });
        }
      }
    }

    // HTML image tag: <img src="path">
    const htmlImgRegex = /<img\s+[^>]*src=["']([^"']+)["']/gi;
    for (const match of sanitizedContent.matchAll(htmlImgRegex)) {
      const assetUrl = match[1].trim();
      if (!/^(https?:|data:|\/\/|#)/i.test(assetUrl)) {
        totalAssetRefs++;
        const cleanPath = assetUrl.split("?")[0].split("#")[0];
        const candidateRelative = path.resolve(fileDir, cleanPath);
        const candidateRoot = path.resolve(targetDir, cleanPath.replace(/^\//, ""));

        if (!fs.existsSync(candidateRelative) && !fs.existsSync(candidateRoot)) {
          missingAssets.push({ ref: assetUrl, file: relFile });
        }
      }
    }

    // Media component tag: <Media src="path"> or <dmd-media src="path">
    const mediaRegex = /<(?:Media|dmd-media)\s+[^>]*src=["']([^"']+)["']/gi;
    for (const match of sanitizedContent.matchAll(mediaRegex)) {
      const assetUrl = match[1].trim();
      if (!/^(https?:|data:|\/\/|#)/i.test(assetUrl)) {
        totalAssetRefs++;
        const cleanPath = assetUrl.split("?")[0].split("#")[0];
        const candidateRelative = path.resolve(fileDir, cleanPath);
        const candidateRoot = path.resolve(targetDir, cleanPath.replace(/^\//, ""));

        if (!fs.existsSync(candidateRelative) && !fs.existsSync(candidateRoot)) {
          missingAssets.push({ ref: assetUrl, file: relFile });
        }
      }
    }
  }

  if (missingAssets.length > 0) {
    checks.push({
      id: "assets",
      name: "Asset References",
      status: "fail",
      message: `Found ${missingAssets.length} missing local asset file(s)`,
      details: missingAssets.map((m) => `Missing "${m.ref}" referenced in ${m.file}`),
    });
  } else {
    checks.push({
      id: "assets",
      name: "Asset References",
      status: "pass",
      message:
        totalAssetRefs > 0
          ? `All ${totalAssetRefs} local asset references verified`
          : "No local asset references found",
    });
  }

  // 4. Custom Component (.dmd) Compilation Diagnostics
  const dmdDir = path.join(targetDir, ".dmd");
  if (!fs.existsSync(dmdDir)) {
    checks.push({
      id: "dmd-components",
      name: "Custom Components (.dmd)",
      status: "pass",
      message: "No custom components directory (.dmd) found (standard built-ins only)",
    });
  } else {
    const entries = fs.readdirSync(dmdDir);
    const EXCLUDED_SCRIPTS = [
      "setup.js",
      "setup.mjs",
      "setup.ts",
      "languages.js",
      "languages.ts",
      "components.js",
      "index.js",
    ];

    const svelteFiles = entries.filter((f) => f.endsWith(".svelte"));
    const reactFiles = entries.filter((f) => (f.endsWith(".tsx") || f.endsWith(".jsx")) && !f.startsWith("."));
    const webElementFiles = entries.filter(
      (f) => (f.endsWith(".ts") || f.endsWith(".js")) && !EXCLUDED_SCRIPTS.includes(f) && !f.endsWith(".d.ts"),
    );

    const componentErrors: string[] = [];
    let componentCount = 0;

    // Check Svelte components
    for (const svelteFile of svelteFiles) {
      componentCount++;
      const filePath = path.join(dmdDir, svelteFile);
      try {
        const rawSource = fs.readFileSync(filePath, "utf-8");
        const baseName = svelteFile.replace(/\.svelte$/, "");
        const tag = dmdTag(baseName);
        const taggedSource = ensureCustomElementTag(rawSource, tag);
        compile(taggedSource, {
          filename: svelteFile,
          customElement: true,
          generate: "client",
        });
      } catch (err) {
        componentErrors.push(`${svelteFile}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Check React TSX / JSX components
    for (const reactFile of reactFiles) {
      componentCount++;
      const filePath = path.join(dmdDir, reactFile);
      try {
        const rawSource = fs.readFileSync(filePath, "utf-8");
        const baseName = path.basename(reactFile, path.extname(reactFile));
        const tag = dmdTag(baseName);

        // Check if React-to-Svelte conversion works
        const converted = convertReactToSvelte(rawSource, {
          name: baseName,
          tag,
          filename: reactFile,
        });

        if (converted.success && converted.svelteSource) {
          compile(converted.svelteSource, {
            filename: `${baseName}.svelte`,
            customElement: true,
            generate: "client",
          });
        } else {
          // Verify TSX syntax compilation with esbuild
          transformSync(rawSource, {
            loader: reactFile.endsWith(".tsx") ? "tsx" : "jsx",
            target: "es2022",
          });
        }
      } catch (err) {
        componentErrors.push(`${reactFile}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Check Web Element components
    for (const weFile of webElementFiles) {
      componentCount++;
      const filePath = path.join(dmdDir, weFile);
      try {
        const rawSource = fs.readFileSync(filePath, "utf-8");
        transformSync(rawSource, {
          loader: weFile.endsWith(".ts") ? "ts" : "js",
          target: "es2022",
        });
      } catch (err) {
        componentErrors.push(`${weFile}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (componentErrors.length > 0) {
      checks.push({
        id: "dmd-components",
        name: "Custom Components (.dmd)",
        status: "fail",
        message: `Compilation failed for ${componentErrors.length} custom component(s)`,
        details: componentErrors,
      });
    } else {
      checks.push({
        id: "dmd-components",
        name: "Custom Components (.dmd)",
        status: "pass",
        message:
          componentCount > 0
            ? `All ${componentCount} custom component(s) compiled cleanly`
            : "No custom components in .dmd/ directory",
      });
    }
  }

  return finishReport(checks, options, targetDirArg);
}

function finishReport(checks: DoctorCheck[], options: DoctorOptions, targetDirArg: string): DoctorReport {
  const summary = {
    pass: checks.filter((c) => c.status === "pass").length,
    warn: checks.filter((c) => c.status === "warn").length,
    fail: checks.filter((c) => c.status === "fail").length,
  };
  const ok = summary.fail === 0;

  const report: DoctorReport = {
    ok,
    checks,
    summary,
  };

  if (!options.silent) {
    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(
        chalk.bold(`\n🩺 DocMeDown Doctor — System & Documentation Diagnostics (${chalk.cyan(targetDirArg)})`),
      );
      console.log("─".repeat(70));

      for (const check of checks) {
        let badge: string;
        if (check.status === "pass") {
          badge = chalk.green("✔ [PASS]");
        } else if (check.status === "warn") {
          badge = chalk.yellow("⚠ [WARN]");
        } else {
          badge = chalk.red("✖ [FAIL]");
        }

        console.log(`${badge} ${chalk.bold(check.name)}: ${check.message}`);
        if (check.details && check.details.length > 0) {
          for (const d of check.details) {
            console.log(chalk.red(`         └─ ${d}`));
          }
        }
      }

      console.log("─".repeat(70));
      if (ok) {
        console.log(
          chalk.green(
            `✨ Doctor found 0 critical issues (${summary.pass} passed, ${summary.warn} warning(s)). Ready to build/serve!\n`,
          ),
        );
      } else {
        console.log(
          chalk.red(`✖ Doctor found ${summary.fail} critical issue(s). Please resolve them before deployment.\n`),
        );
      }
    }
  }

  if (options.exitOnError && !ok && typeof process !== "undefined") {
    process.exitCode = 1;
  }

  return report;
}
