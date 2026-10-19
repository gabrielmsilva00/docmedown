import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import prompts from "prompts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCliPath =
  process.env.npm_execpath || path.resolve(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");

function runCommand(command, args, options = {}) {
  const display = `${command} ${args.join(" ")}`;
  if (!options.silent) {
    console.log(chalk.cyan(`> ${display}`));
  }
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf-8",
    stdio: options.capture ? "pipe" : "inherit",
    env: process.env,
  });

  if (options.capture) {
    return {
      status: result.status ?? 1,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
    };
  }

  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status}: ${display}`);
  }
  return result;
}

function runNpm(args, options) {
  return runCommand(process.execPath, [npmCliPath, ...args], options);
}

function getBranch() {
  const res = runCommand("git", ["branch", "--show-current"], { capture: true, silent: true });
  return res.stdout.trim() || "main";
}

function getGitStatus() {
  const res = runCommand("git", ["status", "--short"], { capture: true, silent: true });
  return res.stdout.trim();
}

function generateAutoCommitMessage() {
  const status = runCommand("git", ["status", "--porcelain"], { capture: true, silent: true }).stdout.trim();
  if (!status) return "chore: fast commit";
  const lines = status.split(/\r?\n/).filter(Boolean);
  const files = lines.map((l) => l.slice(3).trim()).filter(Boolean);
  if (files.length === 1) {
    return `chore: update ${path.basename(files[0])}`;
  }
  if (files.length <= 3) {
    return `chore: update ${files.map((f) => path.basename(f)).join(", ")}`;
  }
  return `chore: fast update (${files.length} files)`;
}

function printHelp() {
  console.log(`
${chalk.bold.cyan("DocMeDown Smart Commit Utility")}

${chalk.bold("Usage:")}
  npm run commit:fast                Instant stage + commit + push with zero prompts
  npm run commit:fast -- "message"   Instant commit with custom message & auto push
  npm run commit                     Interactive conventional commit wizard & quality checks
  npm run commit -- "feat: msg"      Commit directly with specified message

${chalk.bold("Options:")}
  -f, --fast         Fast mode: auto message, stages all, skips checks, auto pushes
  -p, --push         Push to upstream remote after successful commit
  -a, --all          Stage untracked files as well as modified files
  --no-verify        Skip pre-commit quality gates (linter, types, tests)
  -y, --yes          Bypass confirmation prompts
  -h, --help         Show this help message
`);
}

async function collectCommitMessage(explicitArgs, isFast) {
  // 1. Check for -m or --message flag
  const mIndex = explicitArgs.findIndex((a) => a === "-m" || a === "--message");
  if (mIndex !== -1 && explicitArgs[mIndex + 1]) {
    return explicitArgs[mIndex + 1].trim();
  }

  // 2. Filter out known flags and their values to find positional message
  const flagsWithValues = new Set(["-m", "--message"]);
  const nonFlags = [];
  for (let i = 0; i < explicitArgs.length; i++) {
    const arg = explicitArgs[i];
    if (flagsWithValues.has(arg)) {
      i++; // Skip the value
      continue;
    }
    if (!arg.startsWith("-")) {
      nonFlags.push(arg);
    }
  }

  if (nonFlags.length > 0) {
    return nonFlags.join(" ").trim();
  }

  // 3. In fast mode, auto-generate commit message without prompts
  if (isFast) {
    return generateAutoCommitMessage();
  }

  // 4. Interactive prompt
  const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  if (!isInteractive) {
    return generateAutoCommitMessage();
  }

  console.log(chalk.bold.cyan("\n📝 Interactive Conventional Commit\n"));

  const response = await prompts(
    [
      {
        type: "select",
        name: "type",
        message: "Select commit type:",
        choices: [
          { title: "feat:     A new feature", value: "feat" },
          { title: "fix:      A bug fix", value: "fix" },
          { title: "docs:     Documentation only changes", value: "docs" },
          { title: "refactor: Code restructuring without feature/fix changes", value: "refactor" },
          { title: "perf:     Performance improvements", value: "perf" },
          { title: "test:     Adding or correcting tests", value: "test" },
          { title: "build:    Build system or dependency updates", value: "build" },
          { title: "ci:       CI/CD or Pages workflow changes", value: "ci" },
          { title: "chore:    Maintenance tasks or tooling config", value: "chore" },
          { title: "style:    Code style, whitespace, formatting", value: "style" },
        ],
        initial: 0,
      },
      {
        type: "text",
        name: "scope",
        message: "Scope (optional, e.g. pages, cli, ui, runtime):",
      },
      {
        type: "text",
        name: "description",
        message: "Commit message / description:",
        validate: (value) => (value.trim().length > 0 ? true : "Commit description cannot be empty"),
      },
    ],
    {
      onCancel: () => {
        console.log(chalk.yellow("\nCommit cancelled."));
        process.exit(0);
      },
    },
  );

  const scope = response.scope?.trim() ? `(${response.scope.trim()})` : "";
  return `${response.type}${scope}: ${response.description.trim()}`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }

  const isFast = args.includes("-f") || args.includes("--fast");
  const autoYes = isFast || args.includes("-y") || args.includes("--yes");
  const shouldPushArg = isFast || args.includes("-p") || args.includes("--push");
  const stageAll = isFast || args.includes("-a") || args.includes("--all");
  const skipVerify = isFast || args.includes("--no-verify") || args.includes("--skip-checks");

  console.log(chalk.bold.cyan("\n========================================================================"));
  console.log(chalk.bold.cyan(isFast ? "⚡ DOCMEDOWN FAST COMMIT" : "🚀 DOCMEDOWN COMMIT SYSTEM"));
  console.log(
    chalk.gray(
      isFast
        ? "   Instant Stage • Zero Prompts • Automated Remote Push"
        : "   Safe Staging • Quality Assurance Gates • Conventional Commits",
    ),
  );
  console.log(chalk.bold.cyan("========================================================================\n"));

  // Check git status
  const initialStatus = getGitStatus();
  if (!initialStatus) {
    console.log(chalk.yellow("ℹ Working tree is clean. Nothing to commit.\n"));
    return;
  }

  // Get commit message
  const commitMessage = await collectCommitMessage(args, isFast);
  console.log(`📌 Commit message: ${chalk.bold.green(commitMessage)}`);

  // Run pre-commit QA gates
  if (!skipVerify) {
    console.log(chalk.bold.yellow("\n🔍 Running pre-commit quality gates..."));

    // 1. Biome Check & Lint
    console.log(chalk.dim("1/3 Running Biome check (linter & formatter)..."));
    runNpm(["run", "lint"]);
    console.log(chalk.green("  ✔ Biome check passed."));

    // 2. TypeScript compilation
    console.log(chalk.dim("2/3 Running TypeScript check (tsc --noEmit)..."));
    runNpm(["run", "typecheck"]);
    console.log(chalk.green("  ✔ Typecheck passed."));

    // 3. Unit tests
    console.log(chalk.dim("3/3 Running unit test suite (scripts/test-unit.mjs)..."));
    runNpm(["run", "test"]);
    console.log(chalk.green("  ✔ Unit tests passed."));

    console.log(chalk.bold.green("✨ All pre-commit quality gates passed!\n"));
  } else {
    console.log(chalk.dim("⚡ Skipping pre-commit verification gates (fast mode)."));
  }

  // Stage changes
  console.log(chalk.bold.yellow("\n📦 Staging files..."));
  if (stageAll) {
    runCommand("git", ["add", "-A"]);
  } else {
    runCommand("git", ["add", "-u"]);
  }

  // Check what is staged
  const stagedDiff = runCommand("git", ["diff", "--cached", "--name-only"], { capture: true, silent: true });
  const stagedFiles = stagedDiff.stdout.trim().split(/\r?\n/).filter(Boolean);

  if (stagedFiles.length === 0) {
    console.log(chalk.yellow("⚠ No modifications staged."));
    return;
  }

  console.log(chalk.cyan(`Staged ${stagedFiles.length} file(s):`));
  for (const f of stagedFiles) {
    console.log(chalk.gray(`  • ${f}`));
  }

  // Commit
  console.log(chalk.bold.yellow("\n✍ Committing changes..."));
  runCommand("git", ["commit", "-m", commitMessage]);
  console.log(chalk.bold.green("✔ Commit successful!"));

  // Push flow
  const currentBranch = getBranch();
  let doPush = shouldPushArg;

  if (!doPush && !autoYes && process.stdin.isTTY && process.stdout.isTTY) {
    const pushPrompt = await prompts({
      type: "confirm",
      name: "confirmPush",
      message: `Push commit to origin/${currentBranch}?`,
      initial: true,
    });
    doPush = Boolean(pushPrompt.confirmPush);
  }

  if (doPush) {
    console.log(chalk.bold.yellow(`\n🚀 Pushing to origin/${currentBranch}...`));
    runCommand("git", ["push", "origin", currentBranch]);
    console.log(chalk.bold.green(`✔ Pushed successfully to origin/${currentBranch}!`));

    if (currentBranch === "main") {
      console.log(chalk.cyan("\n💡 GitHub Pages & CI workflows will be triggered."));
      console.log(chalk.gray("   • Test Pages locally anytime with: npm run test:pages"));
      console.log(chalk.gray("   • Check Pages remote status with:  gh run list --workflow pages.yml"));
    }
  } else {
    console.log(
      chalk.dim(`\nCommit kept locally on ${currentBranch}. Push when ready with: git push origin ${currentBranch}`),
    );
  }

  console.log("");
}

main().catch((err) => {
  console.error(chalk.red.bold("\n✖ Commit process failed:"), err.message);
  process.exit(1);
});
