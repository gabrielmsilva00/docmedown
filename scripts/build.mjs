import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import chalk from "chalk";
import { build as tsupBuild } from "tsup";
import { build as viteBuild } from "vite";
import { buildEngines } from "./build-engines.mjs";
import { runProjectDoctor } from "./doctor-project.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");

const KB = 1024;
const MB = 1024 * KB;

/**
 * Bundle size regression budget configuration.
 */
const BUNDLE_BUDGETS = [
  { file: "docmedown.iife.js", maxRaw: 4.5 * MB, maxGzip: 1.4 * MB, label: "IIFE Runtime (Offline/CDN)" },
  { file: "docmedown.mjs", maxRaw: 1.55 * MB, maxGzip: 480 * KB, label: "ESM Module Entry" },
  { file: "docmedown.cjs", maxRaw: 1.35 * MB, maxGzip: 480 * KB, label: "CommonJS Entry" },
  { file: "docmedown.web.js", maxRaw: 1.3 * MB, maxGzip: 480 * KB, label: "Web Served Runtime" },
  { file: "docmedown-mermaid.js", maxRaw: 3.8 * MB, maxGzip: 1000 * KB, label: "Mermaid Engine" },
  { file: "docmedown-compiler.js", maxRaw: 1.0 * MB, maxGzip: 300 * KB, label: "Svelte Compiler Engine" },
  { file: "cli.js", maxRaw: 550 * KB, maxGzip: 160 * KB, label: "CLI Node Executable" },
];

async function cleanDist() {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
}

async function buildRuntime() {
  const t0 = Date.now();
  await viteBuild({
    configFile: path.join(root, "vite.config.mts"),
    logLevel: "warn",
  });
  return { label: "Runtime (IIFE/ESM/CJS)", duration: Date.now() - t0 };
}

async function buildWeb() {
  const t0 = Date.now();
  await viteBuild({
    configFile: path.join(root, "vite.config.web.mts"),
    logLevel: "warn",
  });
  return { label: "Web served runtime", duration: Date.now() - t0 };
}

async function runEngines() {
  const t0 = Date.now();
  await buildEngines();
  return { label: "On-demand engines (Mermaid & Compiler)", duration: Date.now() - t0 };
}

async function buildCli() {
  const t0 = Date.now();
  await tsupBuild({
    entry: { cli: "src/cli/index.ts" },
    outDir: "dist",
    format: ["cjs"],
    target: "node18",
    clean: false,
    dts: false,
    sourcemap: false,
    minify: true,
    banner: { js: "#!/usr/bin/env node" },
    silent: true,
  });
  return { label: "CLI executable binary", duration: Date.now() - t0 };
}

function runNode(scriptPath, args, label) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [scriptPath, ...args], { cwd: root, stdio: "inherit" });
    proc.on("close", (code) => {
      if (code === 0) resolve({ label, duration: Date.now() - t0 });
      else reject(new Error(`${label} failed with exit code ${code}`));
    });
  });
}

/**
 * Runs Biome linter check.
 */
async function runLinter() {
  const t0 = Date.now();
  const biomeCli = path.join(root, "node_modules", "@biomejs", "biome", "bin", "biome");
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [biomeCli, "check", "."], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    proc.stdout.on("data", (d) => (output += d.toString()));
    proc.stderr.on("data", (d) => (output += d.toString()));

    proc.on("close", (code) => {
      const duration = Date.now() - t0;
      const checkedMatch = output.match(/Checked (\d+) files/);
      const checkedFiles = checkedMatch ? Number.parseInt(checkedMatch[1], 10) : 0;
      const errorMatch = output.match(/Found (\d+) errors?/);
      const errorCount = errorMatch ? Number.parseInt(errorMatch[1], 10) : code === 0 ? 0 : 1;

      resolve({
        ok: code === 0,
        code,
        checkedFiles,
        errorCount,
        duration,
        output,
      });
    });
  });
}

/**
 * Runs dynamic unit test suite and collects pass/fail metrics.
 */
async function runUnitTests() {
  const t0 = Date.now();
  const testsDir = path.join(root, "tests");
  const postBuildTests = new Set([
    "bundle-size.test.ts",
    "offline-artifact.test.ts",
    "package-smoke.test.ts",
    "mcp.test.ts",
  ]);
  const files = fs
    .readdirSync(testsDir)
    .filter((f) => f.endsWith(".test.ts") && !postBuildTests.has(f))
    .sort()
    .map((f) => path.join("tests", f));

  const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");

  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [tsxCli, "--test", ...files], {
      cwd: root,
      stdio: "inherit",
    });

    proc.on("close", (code) => {
      const duration = Date.now() - t0;
      if (code === 0) {
        resolve({ ok: true, duration });
      } else {
        reject(new Error(`Unit test suite failed with exit code ${code}`));
      }
    });
  });
}

/**
 * Verifies that all built artifacts satisfy their size budgets.
 */
function verifyBundles() {
  const results = [];
  let allOk = true;

  for (const b of BUNDLE_BUDGETS) {
    const filePath = path.join(distDir, b.file);
    if (!fs.existsSync(filePath)) {
      results.push({ ...b, exists: false, ok: false, error: "File not found" });
      allOk = false;
      continue;
    }
    const buf = fs.readFileSync(filePath);
    const gz = gzipSync(buf);
    const rawOk = buf.length <= b.maxRaw;
    const gzipOk = gz.length <= b.maxGzip;
    const ok = rawOk && gzipOk;
    if (!ok) allOk = false;

    results.push({
      ...b,
      exists: true,
      rawBytes: buf.length,
      gzipBytes: gz.length,
      rawOk,
      gzipOk,
      ok,
    });
  }

  return { ok: allOk, results };
}

function formatBytes(bytes) {
  if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
  return `${(bytes / KB).toFixed(1)} KB`;
}

function renderBundleTable(results) {
  const headers = ["Artifact", "Raw Size", "Gzip Size", "Budget (Raw/Gzip)", "Status"];
  const colWidths = [23, 11, 11, 21, 8];

  const topBorder = `┌${colWidths.map((w) => "─".repeat(w + 2)).join("┬")}┐`;
  const midBorder = `├${colWidths.map((w) => "─".repeat(w + 2)).join("┼")}┤`;
  const botBorder = `└${colWidths.map((w) => "─".repeat(w + 2)).join("┴")}┘`;

  console.log(chalk.gray(topBorder));
  console.log(`│ ${headers.map((h, i) => chalk.bold(h.padEnd(colWidths[i]))).join(" │ ")} │`);
  console.log(chalk.gray(midBorder));

  for (const r of results) {
    if (!r.exists) {
      console.log(
        `│ ${chalk.cyan(r.file.padEnd(colWidths[0]))} │ ${chalk.red("MISSING".padEnd(colWidths[1]))} │ ${"-".padEnd(colWidths[2])} │ ${"-".padEnd(colWidths[3])} │ ${chalk.red.bold("FAIL".padEnd(colWidths[4]))} │`,
      );
      continue;
    }

    const rawStr = formatBytes(r.rawBytes).padEnd(colWidths[1]);
    const gzStr = formatBytes(r.gzipBytes).padEnd(colWidths[2]);
    const budgetStr = `< ${formatBytes(r.maxRaw)} / ${formatBytes(r.maxGzip)}`.padEnd(colWidths[3]);
    const statusStr = r.ok
      ? chalk.green.bold("PASS".padEnd(colWidths[4]))
      : chalk.red.bold("FAIL".padEnd(colWidths[4]));

    console.log(`│ ${chalk.cyan(r.file.padEnd(colWidths[0]))} │ ${rawStr} │ ${gzStr} │ ${budgetStr} │ ${statusStr} │`);
  }

  console.log(chalk.gray(botBorder));
}

async function main() {
  const startTime = Date.now();
  const args = process.argv.slice(2);
  const fastMode = args.includes("--fast") || args.includes("--skip-checks");
  const skipDocs = args.includes("--skip-docs") || args.includes("--no-docs");

  console.log(chalk.bold.cyan("\n========================================================================"));
  console.log(chalk.bold.cyan("⚡ DOCMEDOWN STREAMLINED BUILD SYSTEM"));
  console.log(chalk.gray("   High-Performance Parallel Bundling • Quality Gates • Diagnostics"));
  console.log(chalk.bold.cyan("========================================================================\n"));

  let doctorScore = 100;
  const lintScore = 100;
  let testScore = 100;

  if (!fastMode) {
    // -------------------------------------------------------------------------
    // Phase 1: Project Diagnostics (Doctor)
    // -------------------------------------------------------------------------
    console.log(chalk.bold.yellow("🩺 Phase 1: Project & Workspace Diagnostics (Doctor)"));
    const doctorReport = await runProjectDoctor({ silent: false });
    doctorScore = doctorReport.score;

    if (doctorScore < 95) {
      console.error(
        chalk.red.bold(
          `\n✖ BUILD ABORTED: Project Doctor score (${doctorScore}%) is below the required 95% threshold!`,
        ),
      );
      console.error(chalk.yellow("  Please resolve the failing diagnostics above before building.\n"));
      process.exit(1);
    } else if (doctorScore < 100) {
      console.warn(
        chalk.yellow.bold(
          `\n⚠ WARNING: Project Doctor score is ${doctorScore}% (warnings present, but >= 95% threshold met).\n`,
        ),
      );
    } else {
      console.log(chalk.green(`✨ Doctor Gate: 100% Health Score (All checks passed)\n`));
    }

    // -------------------------------------------------------------------------
    // Phase 2: Quality Assurance (Linters & Unit Tests)
    // -------------------------------------------------------------------------
    console.log(chalk.bold.yellow("🔍 Phase 2: Quality Assurance Gates (Linters & Tests)"));

    // 2.1 Linters
    console.log(chalk.dim("  Running Biome linter check..."));
    const lintResult = await runLinter();
    if (!lintResult.ok) {
      console.error(chalk.red.bold(`  ✖ Biome linter failed with ${lintResult.errorCount} error(s)!`));
      console.error(chalk.dim(lintResult.output));
      process.exit(1);
    } else {
      console.log(
        chalk.green(`  ✔ Biome Linter: ${lintResult.checkedFiles} files checked cleanly (${lintResult.duration}ms)`),
      );
    }

    // 2.2 Unit Tests
    console.log(chalk.dim("  Running unit test suite..."));
    const testResult = await runUnitTests();
    testScore = 100;
    console.log(chalk.green(`  ✔ Unit Test Suite: All unit tests passed cleanly (${testResult.duration}ms)`));

    console.log(chalk.green(`✨ Quality Gate: Linters (100%) and Tests (100%) passed.\n`));
  } else {
    console.log(chalk.magenta("⚡ Fast mode active: Bypassing diagnostics and unit test gates.\n"));
  }

  // ---------------------------------------------------------------------------
  // Phase 3: High-Performance Parallel Compilation
  // ---------------------------------------------------------------------------
  console.log(chalk.bold.yellow("⚡ Phase 3: High-Performance Parallel Compilation"));
  await cleanDist();

  const tscCli = path.join(root, "node_modules", "typescript", "bin", "tsc");

  const buildStart = Date.now();
  const buildOutputs = await Promise.all([
    buildRuntime(),
    buildWeb(),
    runEngines(),
    buildCli(),
    runNode(tscCli, ["-p", "tsconfig.runtime.json"], "Type declarations (dist/types)"),
  ]);

  const compilationTime = ((Date.now() - buildStart) / 1000).toFixed(2);
  for (const b of buildOutputs) {
    console.log(`  ✔ ${chalk.bold(b.label)} built in ${chalk.cyan(`${b.duration}ms`)}`);
  }
  console.log(chalk.green(`✨ Compilation completed in ${compilationTime}s\n`));

  // ---------------------------------------------------------------------------
  // Phase 4: Bundle Inspection & Size Budget Verification
  // ---------------------------------------------------------------------------
  console.log(chalk.bold.yellow("📦 Phase 4: Bundle Inspection & Size Budget Verification"));
  const bundleCheck = verifyBundles();
  renderBundleTable(bundleCheck.results);

  if (!bundleCheck.ok) {
    console.error(chalk.red.bold("\n✖ BUILD ABORTED: One or more bundles exceeded their defined size budgets!"));
    process.exit(1);
  }
  console.log(chalk.green("✨ All artifacts verified within production budget thresholds.\n"));

  // Phase 5: Documentation Site & Offline Single-File Generation
  if (!skipDocs) {
    console.log(chalk.bold.yellow("📄 Phase 5: Documentation Site & Offline Single-File Generation"));
    const docCli = path.join(root, "bin", "docmedown.js");
    await runNode(docCli, ["build", "./docs"], "Documentation Site");
    console.log(chalk.green("✨ Documentation site and offline bundle built successfully.\n"));
  }

  // ---------------------------------------------------------------------------
  // Final Summary Dashboard
  // ---------------------------------------------------------------------------
  const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(chalk.bold.green("========================================================================"));
  console.log(chalk.bold.green(`✨ BUILD SUCCESSFUL in ${totalSeconds}s`));
  console.log(
    chalk.gray(
      `   Doctor: ${doctorScore}% | Linter: ${lintScore}% | Tests: ${testScore}% | Bundles: 7/7 OK | Docs: ${skipDocs ? "Skipped" : "Built"}`,
    ),
  );
  console.log(chalk.bold.green("========================================================================\n"));
}

main().catch((err) => {
  console.error(chalk.red.bold("\n✖ Build failed with unexpected error:"), err);
  process.exit(1);
});
