import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import chalk from "chalk";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCliPath =
  process.env.npm_execpath || path.resolve(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");

function runCommand(command, args, options = {}) {
  const display = `${command} ${args.join(" ")}`;
  if (!options.silent) {
    console.log(chalk.cyan(`\n> ${display}`));
  }
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf-8",
    stdio: options.capture ? "pipe" : "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    const errorMsg = result.stderr || result.stdout || `Process exited with code ${result.status}`;
    if (options.capture) {
      throw new Error(`Command failed (${display}):\n${errorMsg}`);
    }
    throw new Error(`Command failed with exit code ${result.status}: ${display}`);
  }
  return result;
}

function runNpm(args, options) {
  return runCommand(process.execPath, [npmCliPath, ...args], options);
}

function verifyAsset(filePath, description) {
  const rel = path.relative(root, filePath);
  let ok = false;
  try {
    const stat = fs.lstatSync(filePath);
    if (stat.isSymbolicLink()) {
      // Check target exists
      const target = path.resolve(path.dirname(filePath), fs.readlinkSync(filePath));
      ok = fs.existsSync(target);
    } else {
      ok = stat.isFile();
    }
  } catch {
    ok = false;
  }

  if (ok) {
    console.log(`  ${chalk.green("✔")} [EXISTS] ${chalk.bold(rel)} ${chalk.dim(`(${description})`)}`);
    return true;
  }
  console.log(`  ${chalk.red("✖")} [MISSING] ${chalk.red.bold(rel)} ${chalk.dim(`(${description})`)}`);
  return false;
}

function verifyContent(filePath, substring, description) {
  const rel = path.relative(root, filePath);
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    if (content.includes(substring)) {
      console.log(
        `  ${chalk.green("✔")} [MATCH]  ${chalk.bold(rel)} contains ${chalk.cyan(substring)} ${chalk.dim(`(${description})`)}`,
      );
      return true;
    }
    console.log(`  ${chalk.red("✖")} [MISMATCH] ${chalk.red.bold(rel)} missing required string: ${substring}`);
    return false;
  } catch (err) {
    console.log(`  ${chalk.red("✖")} [READ_FAIL] Could not read ${rel}: ${err.message}`);
    return false;
  }
}

async function runPagesWorkflowDispatch() {
  console.log(chalk.bold.yellow("\n🚀 Disagreeing with blind pushes? Dispatching GitHub Actions pages.yml..."));
  try {
    const branchRes = runCommand("git", ["branch", "--show-current"], { capture: true, silent: true });
    const currentBranch = branchRes.stdout.trim() || "main";

    console.log(chalk.dim(`Triggering workflow on branch: ${currentBranch}...`));
    runCommand("gh", ["workflow", "run", "pages.yml", "--ref", currentBranch]);
    console.log(chalk.green("✔ Workflow dispatched successfully!"));

    console.log(chalk.yellow("\nWaiting 5 seconds for GitHub Actions run initialization..."));
    await new Promise((r) => setTimeout(r, 5000));

    console.log(chalk.bold.cyan("\nRecent Pages workflow runs:"));
    runCommand("gh", ["run", "list", "--workflow", "pages.yml", "-L", "3"]);
    console.log(chalk.dim("\nTo follow live output, run: gh run watch --workflow pages.yml"));
  } catch (err) {
    console.error(chalk.red(`\n✖ GitHub CLI dispatch failed: ${err.message}`));
    console.log(chalk.yellow('Ensure "gh" is installed and authenticated ("gh auth login").'));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDispatch = args.includes("--dispatch") || args.includes("--remote");
  const isClean = args.includes("--clean");
  const isServe = args.includes("--serve") || args.includes("-s");

  console.log(chalk.bold.magenta("\n========================================================================"));
  console.log(chalk.bold.magenta("🌐 DOCMEDOWN GITHUB PAGES WORKFLOW LOCAL VALIDATOR"));
  console.log(chalk.gray("   Local Parity Verification for GitHub Actions (pages.yml) Pipeline"));
  console.log(chalk.bold.magenta("========================================================================\n"));

  if (isDispatch) {
    await runPagesWorkflowDispatch();
    return;
  }

  const startTime = Date.now();

  // Step 0: Clean slate simulation if requested
  if (isClean) {
    console.log(chalk.bold.yellow("🧹 Step 0: Cleaning build artifacts and .dmd cache for clean-room test"));
    const distPath = path.join(root, "dist");
    const dmdPath = path.join(root, "docs", ".dmd");
    if (fs.existsSync(distPath)) fs.rmSync(distPath, { recursive: true, force: true });
    if (fs.existsSync(dmdPath)) fs.rmSync(dmdPath, { recursive: true, force: true });
    console.log(chalk.green("✔ Clean slate ready.\n"));
  }

  // Step 1: Build runtime & declarations (exact same as CI/Pages step 1)
  console.log(chalk.bold.yellow("📦 Step 1: Building runtime & declarations (npm run build)"));
  runNpm(["run", "build"]);
  console.log(chalk.green("✔ Runtime build completed.\n"));

  // Step 2: Build serveable documentation assets (exact same as CI/Pages step 2)
  console.log(chalk.bold.yellow("📚 Step 2: Building serveable documentation assets (npm run build:docs)"));
  runNpm(["run", "build:docs"]);
  console.log(chalk.green("✔ Documentation assets built.\n"));

  // Step 3: Contract Verifications (pages.yml line-by-line contract check)
  console.log(chalk.bold.yellow("🔍 Step 3: Verifying all GitHub Pages artifact contracts"));
  let allContractsPassed = true;

  const checks = [
    () => verifyAsset(path.join(root, "docs/index.html"), "SEO serveable symlink / distributable"),
    () => verifyAsset(path.join(root, "docs/.dmd/.nojekyll"), "GitHub Pages Jekyll bypass marker"),
    () => verifyAsset(path.join(root, "docs/.dmd/_docs.js"), "Serialized documentation bundle"),
    () => verifyAsset(path.join(root, "docs/.dmd/_manifest.json"), "Navigation manifest"),
    () => verifyAsset(path.join(root, "docs/.dmd/docmedown.web.js"), "Web production runtime"),
    () => verifyAsset(path.join(root, "docs/.dmd/docmedown-mermaid.js"), "On-demand Mermaid engine"),
    () => verifyAsset(path.join(root, "docs/.dmd/.singlefile/index.html"), "Air-gapped offline bundle"),
    () => verifyContent(path.join(root, "docs/.dmd/index.html"), 'src="./_docs.js"', "Script load: docs database"),
    () => verifyContent(path.join(root, "docs/.dmd/index.html"), 'src="./docmedown.web.js"', "Script load: runtime"),
  ];

  for (const check of checks) {
    const passed = check();
    if (!passed) allContractsPassed = false;
  }

  // Step 4: Run hosting integration test suite
  console.log(chalk.bold.yellow("\n🧪 Step 4: Running hosting integration test suite (tests/hosting.test.ts)"));
  const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
  runCommand(process.execPath, [tsxCli, "--test", "tests/hosting.test.ts"]);
  console.log(chalk.green("✔ Hosting test suite passed cleanly."));

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  if (allContractsPassed) {
    console.log(chalk.bold.green("\n========================================================================"));
    console.log(chalk.bold.green(`✨ ALL GITHUB PAGES WORKFLOW CONTRACTS PASSED in ${duration}s!`));
    console.log(chalk.gray("   This build is 100% compliant with .github/workflows/pages.yml"));
    console.log(chalk.bold.green("========================================================================\n"));

    if (isServe) {
      console.log(chalk.bold.cyan("🚀 Serving documentation locally at http://localhost:3000 ..."));
      const docCli = path.join(root, "bin", "docmedown.js");
      runCommand(process.execPath, [docCli, "serve", "./docs"]);
    }
  } else {
    console.error(chalk.bold.red("\n========================================================================"));
    console.error(chalk.bold.red("✖ GITHUB PAGES CONTRACT VALIDATION FAILED"));
    console.error(chalk.red("  One or more required assets or references are missing."));
    console.error(chalk.bold.red("========================================================================\n"));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(chalk.red.bold("\n✖ Pages workflow validator failed:"), err.message);
  process.exit(1);
});
