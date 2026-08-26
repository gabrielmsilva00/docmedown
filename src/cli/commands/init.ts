import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import open from "open";
import prompts from "prompts";
import { startDevServer } from "../utils/server";
import { buildCommand } from "./build";

export interface InitOptions {
  projectName?: string;
  preset?: string;
  copyBundle?: boolean;
  start?: boolean;
}

export async function initCommand(targetDirArg: string = "./docs", options: InitOptions = {}) {
  const targetDir = path.resolve(process.cwd(), targetDirArg);
  console.log(chalk.bold.magenta("\n⚡ DocMeDown - Instant Documentation Initializer\n"));

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const templatesDir = path.resolve(__dirname, "../../templates");
  const fallbackTemplatesDir = path.resolve(__dirname, "../templates");
  const activeTemplateDir = fs.existsSync(templatesDir) ? templatesDir : fallbackTemplatesDir;

  // 1. Copy or create index.html
  const indexPath = path.join(targetDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    const templateHtml = fs.readFileSync(path.join(activeTemplateDir, "index.html"), "utf-8");
    fs.writeFileSync(indexPath, templateHtml, "utf-8");
    console.log(chalk.green("  ✔ Created index.html"));
  }

  // 2. Copy or create docs.json
  const configPath = path.join(targetDir, "docs.json");
  if (!fs.existsSync(configPath)) {
    const templateConfig = fs.readFileSync(path.join(activeTemplateDir, "docs.json"), "utf-8");
    fs.writeFileSync(configPath, templateConfig, "utf-8");
    console.log(chalk.green("  ✔ Created docs.json"));
  }

  // 3. Copy or create README.md
  const readmePath = path.join(targetDir, "README.md");
  if (!fs.existsSync(readmePath)) {
    const templateReadme = fs.readFileSync(path.join(activeTemplateDir, "README.md"), "utf-8");
    fs.writeFileSync(readmePath, templateReadme, "utf-8");
    console.log(chalk.green("  ✔ Created README.md"));
  }

  // 4. Copy or create getting-started.md
  const gsPath = path.join(targetDir, "getting-started.md");
  if (!fs.existsSync(gsPath)) {
    const templateGs = fs.readFileSync(path.join(activeTemplateDir, "getting-started.md"), "utf-8");
    fs.writeFileSync(gsPath, templateGs, "utf-8");
    console.log(chalk.green("  ✔ Created getting-started.md"));
  }

  // 5. Create guides/ subdirectory with sample guide
  const guidesDir = path.join(targetDir, "guides");
  if (!fs.existsSync(guidesDir)) {
    fs.mkdirSync(guidesDir, { recursive: true });
  }
  const guidePath = path.join(guidesDir, "custom-components.md");
  if (!fs.existsSync(guidePath)) {
    const templateGuide = fs.readFileSync(path.join(activeTemplateDir, "guides/custom-components.md"), "utf-8");
    fs.writeFileSync(guidePath, templateGuide, "utf-8");
    console.log(chalk.green("  ✔ Created guides/custom-components.md"));
  }

  // 6. Create .dmd/ custom components folder
  const dmdDir = path.join(targetDir, ".dmd");
  if (!fs.existsSync(dmdDir)) {
    fs.mkdirSync(dmdDir, { recursive: true });
  }
  const dmdComponentPath = path.join(dmdDir, "components.js");
  if (!fs.existsSync(dmdComponentPath)) {
    const templateDmd = fs.readFileSync(path.join(activeTemplateDir, ".dmd/components.js"), "utf-8");
    fs.writeFileSync(dmdComponentPath, templateDmd, "utf-8");
    console.log(chalk.green("  ✔ Created .dmd/components.js"));
  }

  // 7. Generate the same serveable and offline artifacts as `docmedown build`.
  await buildCommand(targetDir);

  console.log(chalk.bold.green("\n✨ DocMeDown site successfully initialized!\n"));
  console.log(chalk.dim(`  Location: ${targetDir}\n`));
  console.log(chalk.cyan("  To preview your docs:"));
  console.log(chalk.white(`    npx docmedown serve ${targetDirArg}\n`));
  console.log(chalk.cyan("  To customize settings:"));
  console.log(chalk.white(`    npx docmedown config ${targetDirArg}/docs.json\n`));

  // Ask to start dev server immediately if interactive
  if (options.start !== false && process.stdout.isTTY) {
    const response = await prompts({
      type: "confirm",
      name: "startServer",
      message: "Would you like to start the local preview server now?",
      initial: true,
    });

    if (response.startServer) {
      console.log(chalk.cyan("\n🚀 Starting local live preview server..."));
      const devServer = await startDevServer({ rootDir: targetDir, port: 3000 });
      const url = `http://localhost:${devServer.port}`;
      console.log(chalk.bold.green(`\n✔ Documentation live at: ${chalk.underline(url)}\n`));
      console.log(chalk.dim("  Press Ctrl+C to stop the server\n"));
      await open(url);
    }
  }
}
