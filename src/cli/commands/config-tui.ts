import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import prompts from "prompts";
import { normalizeConfig, parseDocConfigJson } from "../../runtime/config";
import { defaultLocale, projectLocales } from "../../runtime/i18n";
import type { ColorMode, DocConfig, ThemeFamily } from "../../runtime/types";
import { candidateConfigPaths, resolveConfigDir, resolveExistingConfigPath } from "../utils/docs-layout";
import { setupLanguages } from "../utils/language-setup";

export async function configTuiCommand(configPathArg?: string) {
  console.log(chalk.bold.magenta("\n⚡ DocMeDown - Interactive Configuration Wizard\n"));

  // Resolve config path — `.dmd/.config/docs.json` by default, with legacy
  // bare `docs.json` / `dmd.json` fallbacks for backward compatibility.
  let configPath = "";
  if (configPathArg) {
    configPath = path.resolve(process.cwd(), configPathArg);
    if (fs.existsSync(configPath) && fs.statSync(configPath).isDirectory()) {
      const existing = resolveExistingConfigPath(configPath);
      configPath = fs.existsSync(existing)
        ? existing
        : path.join(resolveConfigDir(path.resolve(process.cwd(), configPathArg)), "docs.json");
    }
  } else {
    const cwd = process.cwd();
    const candidates = [
      ...candidateConfigPaths(path.join(cwd, "docs")),
      path.resolve(cwd, "docs.json"),
      path.resolve(cwd, "dmd.json"),
    ];
    configPath =
      candidates.find((p) => fs.existsSync(p)) || path.join(resolveConfigDir(path.join(cwd, "docs")), "docs.json");
  }

  let existingConfig: DocConfig = normalizeConfig();
  if (fs.existsSync(configPath)) {
    try {
      existingConfig = normalizeConfig(parseDocConfigJson(fs.readFileSync(configPath, "utf-8"), configPath));
      console.log(chalk.dim(`  Loaded existing configuration from: ${configPath}\n`));
    } catch (error) {
      console.warn(chalk.yellow(`  ⚠ ${error instanceof Error ? error.message : String(error)}\n`));
    }
  } else {
    console.log(chalk.dim(`  Creating new configuration at: ${configPath}\n`));
  }

  const language = await setupLanguages({}, true, projectLocales(existingConfig));
  if (!language) return;
  const response = await prompts([
    {
      type: "text",
      name: "name",
      message: "Project Name:",
      initial: existingConfig.name || "My Project Docs",
    },
    {
      type: "text",
      name: "tagline",
      message: "Tagline / Short description:",
      initial: existingConfig.tagline || "The simplest Markdown documenter yet",
    },
    {
      type: "select",
      name: "family",
      message: "Select Documentation Theme Family:",
      choices: [
        { title: "Atlas (Editorial technical reference)", value: "atlas" },
        { title: "Blueprint (Structured and schematic)", value: "blueprint" },
        { title: "Terminal (Compact operational console)", value: "terminal" },
        { title: "Editorial (Spacious publication reading)", value: "editorial" },
      ],
      initial: ["atlas", "blueprint", "terminal", "editorial"].indexOf(existingConfig.theme?.family || "atlas"),
    },
    {
      type: "select",
      name: "defaultMode",
      message: "Default Color Mode:",
      choices: [
        { title: "Auto (Follows OS system preference)", value: "auto" },
        { title: "Dark (Default dark theme)", value: "dark" },
        { title: "Light (Default light theme)", value: "light" },
      ],
      initial: ["auto", "dark", "light"].indexOf(existingConfig.theme?.defaultMode || "auto"),
    },
    {
      type: "select",
      name: "sourceType",
      message: "Documentation Source Mode:",
      choices: [
        { title: "Local Markdown Files (hosted together in folder)", value: "local" },
        { title: "Remote GitHub Repository (live dynamic fetch)", value: "github" },
        { title: "Remote GitLab Repository (live dynamic fetch)", value: "gitlab" },
      ],
      initial: existingConfig.source?.type ? (existingConfig.source.type === "github" ? 1 : 2) : 0,
    },
    {
      type: (prev) => (prev === "github" ? "text" : null),
      name: "githubRepo",
      message: "GitHub Repository (owner/repo):",
      initial:
        existingConfig.source?.type === "raw" ? "facebook/react" : existingConfig.source?.repo || "facebook/react",
    },
    {
      type: (_prev, values) => (values.sourceType === "github" ? "text" : null),
      name: "githubBranch",
      message: "GitHub Branch:",
      initial: existingConfig.source?.branch || "main",
    },
    {
      type: (_prev, values) => (values.sourceType === "github" ? "text" : null),
      name: "githubDocsDir",
      message: "GitHub Docs Subfolder (leave empty for root):",
      initial: existingConfig.source?.docsDir || "docs",
    },
    {
      type: "text",
      name: "githubSocial",
      message: "GitHub Repository URL for Navbar link (optional):",
      initial: existingConfig.socials?.find((s) => s.type === "github")?.url || "",
    },
  ]);

  if (!response.name) {
    console.log(chalk.yellow("\nConfiguration cancelled."));
    return;
  }

  const original = language.defaultLocale;
  const locales = language.locales;
  const fallback = await prompts({
    type: "confirm",
    name: "enabled",
    message: "Show originals when translations are missing?",
    initial: existingConfig.i18n?.fallbackToDefault !== false,
  });
  if (fallback.enabled === undefined) return;
  const removed = projectLocales(existingConfig).filter((item) => !locales.includes(item.code));
  if (original !== defaultLocale(existingConfig) || removed.length) {
    console.log(
      chalk.yellow(
        "Changing the original language reinterprets unsuffixed files. Removed languages are no longer recognized. No documents will be renamed or deleted.",
      ),
    );
    const answer = await prompts({
      type: "confirm",
      name: "proceed",
      message: "Save these language changes?",
      initial: false,
    });
    if (!answer.proceed) return;
  }

  const updatedConfig = normalizeConfig({
    ...existingConfig,
    name: response.name,
    i18n: {
      ...existingConfig.i18n,
      defaultLocale: original,
      fallbackToDefault: fallback.enabled,
      locales: locales.map((code) => ({
        ...existingConfig.i18n?.locales.find((item) => item.code === code),
        code,
        label: language.languageEntries.find((item) => item.code === code)?.label,
      })),
    },
    tagline: response.tagline,
    theme: {
      ...existingConfig.theme,
      family: response.family as ThemeFamily,
      defaultMode: response.defaultMode as ColorMode,
    },
    socials: response.githubSocial ? [{ type: "github", url: response.githubSocial }] : existingConfig.socials,
  });

  if (response.sourceType === "github") {
    updatedConfig.source = {
      type: "github",
      repo: response.githubRepo,
      branch: response.githubBranch,
      docsDir: response.githubDocsDir,
    };
  } else if (response.sourceType === "local") {
    delete updatedConfig.source;
  }

  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const validatedConfig = normalizeConfig(updatedConfig);
  fs.writeFileSync(configPath, JSON.stringify(validatedConfig, null, 2), "utf-8");
  console.log(chalk.bold.green(`\n✔ Configuration successfully saved to: ${configPath}\n`));
}
