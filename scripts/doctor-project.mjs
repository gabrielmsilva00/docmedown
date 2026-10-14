import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import { transformSync } from "esbuild";
import { compile } from "svelte/compiler";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Checks whether current Node version satisfies requirement (>=20.19.0).
 */
export function checkNodeVersion(versionStr = process.version) {
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
 * Runs a comprehensive project-wide diagnostic on the DocMeDown codebase.
 * @param {object} [options]
 * @param {boolean} [options.silent]
 * @param {boolean} [options.json]
 * @returns {Promise<{ ok: boolean, score: number, checks: Array<{ id: string, name: string, status: "pass" | "warn" | "fail", message: string, details?: string[] }>, summary: { pass: number, warn: number, fail: number, total: number } }>}
 */
export async function runProjectDoctor(options = {}) {
  const checks = [];

  // 1. Node.js Environment Check
  const nodeEnv = checkNodeVersion();
  if (nodeEnv.supported) {
    checks.push({
      id: "node-env",
      name: "Node.js Environment",
      status: "pass",
      message: `${nodeEnv.version} (satisfies requirement ${nodeEnv.minRequired})`,
    });
  } else {
    checks.push({
      id: "node-env",
      name: "Node.js Environment",
      status: "fail",
      message: `${nodeEnv.version} does not satisfy requirement ${nodeEnv.minRequired}`,
    });
  }

  // 2. Package Manifest (package.json) Integrity
  const pkgPath = path.join(root, "package.json");
  if (!fs.existsSync(pkgPath)) {
    checks.push({
      id: "package-manifest",
      name: "Package Manifest",
      status: "fail",
      message: "package.json not found in repository root",
    });
  } else {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const requiredFields = ["name", "version", "main", "module", "types", "bin", "exports", "scripts"];
      const missing = requiredFields.filter((f) => !pkg[f]);
      if (missing.length > 0) {
        checks.push({
          id: "package-manifest",
          name: "Package Manifest",
          status: "fail",
          message: `Missing required package.json fields: ${missing.join(", ")}`,
        });
      } else {
        checks.push({
          id: "package-manifest",
          name: "Package Manifest",
          status: "pass",
          message: `v${pkg.version} (${pkg.name}) — All required manifest contracts satisfied`,
        });
      }
    } catch (err) {
      checks.push({
        id: "package-manifest",
        name: "Package Manifest",
        status: "fail",
        message: `Failed to parse package.json: ${err.message}`,
      });
    }
  }

  // 3. Schemas & Tooling Configuration
  const schemaPath = path.join(root, "schemas", "docs.schema.json");
  const tsconfigPath = path.join(root, "tsconfig.json");
  const tsconfigRuntimePath = path.join(root, "tsconfig.runtime.json");
  const biomePath = fs.existsSync(path.join(root, "biome.jsonc"))
    ? path.join(root, "biome.jsonc")
    : path.join(root, "biome.json");

  const configErrors = [];
  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
    if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
      configErrors.push("schemas/docs.schema.json: invalid draft version");
    }
  } catch (err) {
    configErrors.push(`schemas/docs.schema.json: ${err.message}`);
  }

  for (const [name, filePath] of [
    ["tsconfig.json", tsconfigPath],
    ["tsconfig.runtime.json", tsconfigRuntimePath],
    [path.basename(biomePath), biomePath],
  ]) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      try {
        JSON.parse(raw);
      } catch {
        const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
        JSON.parse(stripped);
      }
    } catch (err) {
      configErrors.push(`${name}: ${err.message}`);
    }
  }

  if (configErrors.length > 0) {
    checks.push({
      id: "tooling-config",
      name: "Tooling & Schemas",
      status: "fail",
      message: `Encountered ${configErrors.length} configuration error(s)`,
      details: configErrors,
    });
  } else {
    checks.push({
      id: "tooling-config",
      name: "Tooling & Schemas",
      status: "pass",
      message: "Valid JSON schema, TypeScript configurations, and Biome setup",
    });
  }

  // 4. Starter Templates & Assets
  const templateFiles = [
    "templates/docs.json",
    "templates/index.html",
    "templates/README.md",
    "templates/favicon.svg",
    "templates/.dmd/CounterWidget.svelte",
  ];
  const missingTemplates = templateFiles.filter((f) => !fs.existsSync(path.join(root, f)));
  let templateSvelteOk = true;
  let templateSvelteErr = null;

  const counterPath = path.join(root, "templates", ".dmd", "CounterWidget.svelte");
  if (fs.existsSync(counterPath)) {
    try {
      const code = fs.readFileSync(counterPath, "utf-8");
      compile(code, { filename: "CounterWidget.svelte", generate: "client" });
    } catch (err) {
      templateSvelteOk = false;
      templateSvelteErr = err.message;
    }
  }

  if (missingTemplates.length > 0 || !templateSvelteOk) {
    checks.push({
      id: "templates-integrity",
      name: "Starter Templates",
      status: "fail",
      message: "Templates integrity issue detected",
      details: [
        ...missingTemplates.map((m) => `Missing template file: ${m}`),
        ...(templateSvelteErr ? [`CounterWidget.svelte compiler error: ${templateSvelteErr}`] : []),
      ],
    });
  } else {
    checks.push({
      id: "templates-integrity",
      name: "Starter Templates",
      status: "pass",
      message: "Scaffolded templates, starter docs, and Svelte 5 counter widget verified",
    });
  }

  // 5. Source Entry Points & Core Pipelines
  const coreEntries = [
    "src/cli/index.ts",
    "src/ui/index.ts",
    "src/runtime/svelte-runtime.ts",
    "src/runtime/markdown/mermaid-engine.ts",
    "src/runtime/svelte-compiler-engine.ts",
    "scripts/build-engines.mjs",
  ];
  const missingEntries = coreEntries.filter((f) => !fs.existsSync(path.join(root, f)));
  if (missingEntries.length > 0) {
    checks.push({
      id: "source-entrypoints",
      name: "Source Entry Points",
      status: "fail",
      message: `Missing ${missingEntries.length} core entry file(s)`,
      details: missingEntries,
    });
  } else {
    checks.push({
      id: "source-entrypoints",
      name: "Source Entry Points",
      status: "pass",
      message: "All 6 build targets and runtime entry modules verified",
    });
  }

  // 6. Documentation Site Health & Link Integrity (./docs)
  const docsDir = path.join(root, "docs");
  const docsJsonPath = path.join(docsDir, "docs.json");
  const docsReadmePath = path.join(docsDir, "README.md");
  const docsDmdDir = path.join(docsDir, ".dmd");

  const docIssues = [];
  if (!fs.existsSync(docsJsonPath)) docIssues.push("docs/docs.json not found");
  if (!fs.existsSync(docsReadmePath)) docIssues.push("docs/README.md not found");

  if (fs.existsSync(docsJsonPath)) {
    try {
      const docsJson = JSON.parse(fs.readFileSync(docsJsonPath, "utf-8"));
      if (Array.isArray(docsJson.nav)) {
        for (const item of docsJson.nav) {
          if (item.href?.startsWith("#/")) {
            const routePath = item.href.slice(2).split("#")[0];
            const candidate1 = path.join(docsDir, `${routePath}.md`);
            const candidate2 = path.join(docsDir, routePath, "README.md");
            const candidate3 = path.join(docsDir, routePath);
            if (!fs.existsSync(candidate1) && !fs.existsSync(candidate2) && !fs.existsSync(candidate3)) {
              docIssues.push(`docs.json nav item "${item.label}" points to missing target: ${item.href}`);
            }
          }
        }
      }
    } catch (err) {
      docIssues.push(`docs/docs.json parse error: ${err.message}`);
    }
  }

  if (fs.existsSync(docsDmdDir)) {
    const dmdEntries = fs.readdirSync(docsDmdDir);
    for (const file of dmdEntries) {
      const fullPath = path.join(docsDmdDir, file);
      try {
        const raw = fs.readFileSync(fullPath, "utf-8");
        if (file.endsWith(".svelte")) {
          compile(raw, { filename: file, generate: "client" });
        } else if (file.endsWith(".tsx") || file.endsWith(".jsx")) {
          transformSync(raw, { loader: "tsx", target: "es2022" });
        } else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
          transformSync(raw, { loader: "ts", target: "es2022" });
        }
      } catch (err) {
        docIssues.push(`.dmd/${file}: ${err.message}`);
      }
    }
  }

  // Markdown link integrity verification across all docs
  function scanMarkdownLinks(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === ".dist" || ent.name === "examples" || ent.name === "node_modules") continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanMarkdownLinks(full);
      } else if (ent.name.endsWith(".md")) {
        const content = fs.readFileSync(full, "utf-8");
        const linkRegex = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;
        const matches = [...content.matchAll(linkRegex)];
        for (const match of matches) {
          const [_, text, target] = match;
          const cleanTarget = target.trim();
          if (
            cleanTarget.startsWith("http://") ||
            cleanTarget.startsWith("https://") ||
            cleanTarget.startsWith("mailto:")
          ) {
            continue;
          }
          if (cleanTarget.startsWith("#/")) {
            const routePath = cleanTarget.slice(2).split("#")[0];
            const candidate1 = path.join(docsDir, `${routePath}.md`);
            const candidate2 = path.join(docsDir, routePath, "README.md");
            const candidate3 = path.join(docsDir, routePath);
            if (!fs.existsSync(candidate1) && !fs.existsSync(candidate2) && !fs.existsSync(candidate3)) {
              docIssues.push(`${path.relative(docsDir, full)}: Broken route link [${text}](${cleanTarget})`);
            }
          } else if (!cleanTarget.startsWith("#")) {
            const relPath = cleanTarget.split("#")[0];
            const resolved = path.resolve(path.dirname(full), relPath);
            if (!fs.existsSync(resolved)) {
              docIssues.push(`${path.relative(docsDir, full)}: Broken relative link [${text}](${cleanTarget})`);
            }
          }
        }
      }
    }
  }
  scanMarkdownLinks(docsDir);

  if (docIssues.length > 0) {
    checks.push({
      id: "docs-health",
      name: "Documentation Site",
      status: "fail",
      message: `Encountered ${docIssues.length} issue(s) in ./docs`,
      details: docIssues,
    });
  } else {
    checks.push({
      id: "docs-health",
      name: "Documentation Site",
      status: "pass",
      message: "docs.json, navigation routes, document link integrity, and .dmd custom components verified",
    });
  }

  // 7. Workspace & Git Hygiene (No unresolved conflict markers)
  // 7. Workspace & Git Hygiene (No unresolved git conflict markers)
  const conflictHits = [];
  function scanForConflicts(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name === "node_modules" || ent.name === "dist" || ent.name === ".git") continue;
      // Skip generated bundles in docs
      if (ent.name.endsWith(".web.js") || ent.name === "_docs.js") continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanForConflicts(full);
      } else if (/\.(ts|tsx|js|mjs|svelte|json|md)$/.test(ent.name)) {
        try {
          const content = fs.readFileSync(full, "utf-8");
          const hasStart = /^<{7}\s+[^\r\n]+/m.test(content);
          const hasMid = /^={7}\r?$/m.test(content);
          const hasEnd = /^>{7}\s+[^\r\n]+/m.test(content);
          if (hasStart && hasMid && hasEnd) {
            conflictHits.push(path.relative(root, full));
          }
        } catch {}
      }
    }
  }
  scanForConflicts(path.join(root, "src"));
  scanForConflicts(path.join(root, "templates"));
  scanForConflicts(path.join(root, "scripts"));
  scanForConflicts(path.join(root, "tests"));

  if (conflictHits.length > 0) {
    checks.push({
      id: "workspace-hygiene",
      name: "Workspace Hygiene",
      status: "fail",
      message: `Found unresolved git conflict markers in ${conflictHits.length} file(s)`,
      details: conflictHits,
    });
  } else {
    checks.push({
      id: "workspace-hygiene",
      name: "Workspace Hygiene",
      status: "pass",
      message: "No git conflict markers detected across source and template trees",
    });
  }

  // Calculate Doctor Health Score
  const passCount = checks.filter((c) => c.status === "pass").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const total = checks.length;
  const score = Math.round(((passCount + warnCount * 0.5) / total) * 100);
  const ok = failCount === 0 && score >= 95;

  const result = {
    ok,
    score,
    checks,
    summary: { pass: passCount, warn: warnCount, fail: failCount, total },
  };

  if (!options.silent) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold("\n🩺 DocMeDown Project Doctor — Full Repository Diagnostics"));
      console.log(chalk.gray("─".repeat(70)));
      for (const check of checks) {
        let badge;
        if (check.status === "pass") badge = chalk.green("✔ [PASS]");
        else if (check.status === "warn") badge = chalk.yellow("⚠ [WARN]");
        else badge = chalk.red("✖ [FAIL]");

        console.log(`${badge} ${chalk.bold(check.name)}: ${check.message}`);
        if (check.details) {
          for (const d of check.details) {
            console.log(chalk.red(`         └─ ${d}`));
          }
        }
      }
      console.log(chalk.gray("─".repeat(70)));
      const scoreBadge = score >= 95 ? chalk.green.bold(`${score}%`) : chalk.red.bold(`${score}%`);
      console.log(
        `Health Score: ${scoreBadge} (${passCount}/${total} checks passed, ${warnCount} warnings, ${failCount} failures)`,
      );
      if (ok) {
        console.log(chalk.green("✨ Project health is excellent. Ready for release & build pipelines!\n"));
      } else {
        console.log(chalk.red("✖ Project health is below the 95% threshold. Please resolve diagnostics above.\n"));
      }
    }
  }

  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isJson = process.argv.includes("--json");
  const report = await runProjectDoctor({ json: isJson });
  if (!report.ok) {
    process.exit(1);
  }
}
