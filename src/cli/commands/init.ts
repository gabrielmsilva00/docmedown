import chalk from "chalk";
import open from "open";
import prompts from "prompts";
import type { ColorMode, ThemeFamily } from "../../runtime/types";
import { setupLanguages } from "../utils/language-setup";
import { detectProjectInfo, executeScaffold, planScaffold, renderScaffoldTree } from "../utils/scaffold-tree";
import { startDevServer } from "../utils/server";

export interface InitOptions {
  defaultLocale?: string;
  locales?: string;
  projectName?: string;
  preset?: string;
  copyBundle?: boolean;
  start?: boolean;
  interactive?: boolean;
  yes?: boolean;
  tagline?: string;
  themeFamily?: ThemeFamily | string;
  colorMode?: ColorMode | string;
  includeSamples?: boolean;
  port?: number;
}

export interface QuickstartOptions {
  defaultLocale?: string;
  locales?: string;
  start?: boolean;
  yes?: boolean;
  port?: number;
}

/**
 * Quickstart action triggered when `docmedown` is run with no arguments
 * (or on an uninitialized directory). Uses quickstart defaults and prompts
 * for confirmation after showing the scaffold preview tree.
 */
export async function quickstartCommand(
  targetDirArg: string = "./docs",
  options: QuickstartOptions = {},
): Promise<boolean> {
  console.log(chalk.bold.magenta("\n⚡ DocMeDown - Quickstart Documentation Setup\n"));

  const rootDir = process.cwd();
  const projectInfo = detectProjectInfo(rootDir);
  const language = await setupLanguages(
    options,
    !options.yes && Boolean(process.stdin.isTTY || (prompts as any)._injected?.length),
  );
  if (!language) return false;
  const plan = planScaffold({
    targetDirArg,
    rootDir,
    includeSamples: true,
  });

  console.log(chalk.bold(`📁 Documentation Scaffold Preview for ${chalk.cyan(plan.displayDir)}:\n`));
  console.log(renderScaffoldTree(plan));
  console.log(`  Original language: ${language.defaultLocale}; languages: ${language.locales.join(", ")}`);
  console.log("");

  let proceed = !!options.yes;
  if (!proceed) {
    if (process.stdout.isTTY || process.stdin.isTTY || (prompts as any)._injected?.length) {
      const response = await prompts({
        type: "confirm",
        name: "proceed",
        message: `Proceed with scaffolding documentation in ${chalk.cyan(plan.displayDir)}?`,
        initial: true,
      });
      proceed = !!response.proceed;
    } else {
      console.log(
        chalk.yellow("Confirmation required. Re-run with --yes to scaffold in non-interactive environments.\n"),
      );
      return false;
    }
  }

  if (!proceed) {
    console.log(chalk.yellow("\nQuickstart cancelled. No files or directories were created.\n"));
    return false;
  }

  console.log(chalk.dim(`\nScaffolding documentation in ${plan.targetDir}...`));
  await executeScaffold(plan, {
    projectName: projectInfo.name,
    tagline: projectInfo.description,
    themeFamily: "atlas",
    colorMode: "auto",
    ...language,
  });

  console.log(chalk.bold.green("\n✨ DocMeDown site successfully initialized!\n"));
  console.log(chalk.dim(`  Location: ${plan.targetDir}`));
  console.log(
    chalk.dim(
      `  Documents source: Root (*.md) and ${plan.displayDir} are unified by default (no ./docs/ subdivision).\n`,
    ),
  );
  console.log(chalk.cyan("  To preview your docs:"));
  console.log(chalk.white(`    npx docmedown serve ${plan.displayDir}\n`));
  console.log(chalk.cyan("  To customize settings:"));
  console.log(chalk.white(`    npx docmedown config ${plan.displayDir}/docs.json\n`));

  if (options.start !== false && process.stdout.isTTY) {
    const serverPrompt = await prompts({
      type: "confirm",
      name: "startServer",
      message: "Would you like to start the local preview server now?",
      initial: true,
    });

    if (serverPrompt.startServer) {
      console.log(chalk.cyan("\n🚀 Starting local live preview server..."));
      const devServer = await startDevServer({ rootDir: plan.targetDir, port: options.port || 3000 });
      const url = `http://localhost:${devServer.port}`;
      console.log(chalk.bold.green(`\n✔ Documentation live at: ${chalk.underline(url)}\n`));
      console.log(chalk.dim("  Press Ctrl+C to stop the server\n"));
      await open(url);
    }
  }

  return true;
}

/**
 * Interactive initial setup command (`docmedown init [dir]`).
 * Walks through an interactive setup wizard for customizing project documentation,
 * shows a directory preview tree view, and confirms before creating any files.
 */
export async function initCommand(targetDirArg?: string, options: InitOptions = {}): Promise<boolean> {
  console.log(chalk.bold.magenta("\n⚡ DocMeDown - Interactive Documentation Initializer\n"));

  const rootDir = process.cwd();
  const projectInfo = detectProjectInfo(rootDir);

  let targetDir = targetDirArg;
  let projectName = options.projectName || projectInfo.name;
  let tagline = options.tagline || projectInfo.description;
  let themeFamily = options.themeFamily || "atlas";
  let colorMode = options.colorMode || "auto";
  let includeSamples = options.includeSamples !== false;
  const language = await setupLanguages(options, options.interactive !== false && !options.yes);
  if (!language) return false;

  const isInteractive = options.interactive !== false && !options.yes;

  if (isInteractive) {
    const questions: prompts.PromptObject[] = [];

    if (!targetDir) {
      questions.push({
        type: "text",
        name: "targetDir",
        message: "Documentation directory:",
        initial: "./docs",
      });
    }

    if (!options.projectName) {
      questions.push({
        type: "text",
        name: "projectName",
        message: "Project Name:",
        initial: projectName,
      });
    }

    if (!options.tagline) {
      questions.push({
        type: "text",
        name: "tagline",
        message: "Tagline / Short description:",
        initial: tagline,
      });
    }

    if (!options.themeFamily) {
      questions.push({
        type: "select",
        name: "themeFamily",
        message: "Select Documentation Theme Family:",
        choices: [
          { title: "Atlas (Editorial technical reference)", value: "atlas" },
          { title: "Blueprint (Structured and schematic)", value: "blueprint" },
          { title: "Terminal (Compact operational console)", value: "terminal" },
          { title: "Editorial (Spacious publication reading)", value: "editorial" },
          { title: "Botanical (Sage field guide)", value: "botanical" },
          { title: "Studio (Expressive graphic workbook)", value: "studio" },
        ],
        initial: 0,
      });
    }

    if (!options.colorMode) {
      questions.push({
        type: "select",
        name: "colorMode",
        message: "Default Color Mode:",
        choices: [
          { title: "Auto (Follows OS system preference)", value: "auto" },
          { title: "Dark (Default dark theme)", value: "dark" },
          { title: "Light (Default light theme)", value: "light" },
        ],
        initial: 0,
      });
    }

    questions.push({
      type: "confirm",
      name: "includeSamples",
      message: "Include sample guides and custom component (.dmd)?",
      initial: true,
    });

    const answers = await prompts(questions);

    if (!targetDir && !answers.targetDir) {
      console.log(chalk.yellow("\nInitialization cancelled. No files or directories were created.\n"));
      return false;
    }
    if (!options.projectName && answers.projectName === undefined) {
      console.log(chalk.yellow("\nInitialization cancelled. No files or directories were created.\n"));
      return false;
    }

    if (answers.targetDir) targetDir = answers.targetDir;
    if (answers.projectName) projectName = answers.projectName;
    if (answers.tagline !== undefined) tagline = answers.tagline;
    if (answers.themeFamily) themeFamily = answers.themeFamily;
    if (answers.colorMode) colorMode = answers.colorMode;
    if (answers.includeSamples !== undefined) includeSamples = answers.includeSamples;
  }

  const resolvedTargetArg = targetDir || "./docs";
  const plan = planScaffold({
    targetDirArg: resolvedTargetArg,
    rootDir,
    includeSamples,
  });

  console.log(chalk.bold(`📁 Documentation Scaffold Preview for ${chalk.cyan(plan.displayDir)}:\n`));
  console.log(renderScaffoldTree(plan));
  console.log(`  Original language: ${language.defaultLocale}; languages: ${language.locales.join(", ")}`);
  console.log("");

  let proceed = !!options.yes;
  if (!proceed) {
    if (process.stdout.isTTY || process.stdin.isTTY || (prompts as any)._injected?.length) {
      const confirmResponse = await prompts({
        type: "confirm",
        name: "proceed",
        message: `Proceed with scaffolding documentation in ${chalk.cyan(plan.displayDir)}?`,
        initial: true,
      });
      proceed = !!confirmResponse.proceed;
    } else {
      console.log(
        chalk.yellow("Confirmation required. Re-run with --yes to scaffold in non-interactive environments.\n"),
      );
      return false;
    }
  }

  if (!proceed) {
    console.log(chalk.yellow("\nInitialization cancelled. No files or directories were created.\n"));
    return false;
  }

  console.log(chalk.dim(`\nScaffolding documentation in ${plan.targetDir}...`));
  await executeScaffold(plan, {
    projectName,
    tagline,
    themeFamily,
    colorMode,
    ...language,
  });

  console.log(chalk.bold.green("\n✨ DocMeDown site successfully initialized!\n"));
  console.log(chalk.dim(`  Location: ${plan.targetDir}`));
  console.log(
    chalk.dim(
      `  Documents source: Root (*.md) and ${plan.displayDir} are unified by default (no ./docs/ subdivision).\n`,
    ),
  );
  console.log(chalk.cyan("  To preview your docs:"));
  console.log(chalk.white(`    npx docmedown serve ${plan.displayDir}\n`));
  console.log(chalk.cyan("  To customize settings:"));
  console.log(chalk.white(`    npx docmedown config ${plan.displayDir}/docs.json\n`));

  if (options.start !== false && process.stdout.isTTY) {
    const serverPrompt = await prompts({
      type: "confirm",
      name: "startServer",
      message: "Would you like to start the local preview server now?",
      initial: true,
    });

    if (serverPrompt.startServer) {
      console.log(chalk.cyan("\n🚀 Starting local live preview server..."));
      const devServer = await startDevServer({ rootDir: plan.targetDir, port: options.port || 3000 });
      const url = `http://localhost:${devServer.port}`;
      console.log(chalk.bold.green(`\n✔ Documentation live at: ${chalk.underline(url)}\n`));
      console.log(chalk.dim("  Press Ctrl+C to stop the server\n"));
      await open(url);
    }
  }

  return true;
}
