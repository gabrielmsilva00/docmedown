import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import packageJson from "../../package.json";
import { buildCommand, watchBuildCommand } from "./commands/build";
import { configTuiCommand } from "./commands/config-tui";
import { initCommand, quickstartCommand } from "./commands/init";
import { serveCommand } from "./commands/serve";

const program = new Command();

program
  .name("docmedown")
  .description(
    "DocMeDown - The simplest MarkDown documenter yet. CLI, web runtime, and static-site compiler with AI-native distribution.",
  )
  .version(packageJson.version);

// Default action when directory is passed: npx docmedown [dir]
program
  .argument(
    "[dir]",
    "Documentation directory to quickstart or serve (automatically links root *.md and ./docs/ together by default)",
    "./docs",
  )
  .option("-p, --port <number>", "Port for local dev server", "3000")
  .option("--no-open", "Do not automatically open the browser")
  .option("-y, --yes", "Skip confirmation prompt in quickstart mode")
  .option("--default-locale <code>", "Original document language (default: en)")
  .option("--locales <codes>", "Additional languages, comma-separated")
  .action(async (dir, options) => {
    const targetDir = path.resolve(process.cwd(), dir);
    // If target directory or config or index doesn't exist, run quickstart
    const hasIndex = fs.existsSync(path.join(targetDir, "index.html"));
    const hasDocs =
      fs.existsSync(path.join(targetDir, "README.md")) || fs.existsSync(path.join(targetDir, "docs.json"));

    if (!hasIndex && !hasDocs) {
      await quickstartCommand(dir, {
        defaultLocale: options.defaultLocale,
        locales: options.locales,
        start: options.open,
        yes: options.yes,
        port: Number(options.port) || 3000,
      });
    } else {
      await serveCommand(dir, { port: options.port, open: options.open });
    }
  });

// Subcommand: init
program
  .command("init [dir]")
  .description("Launch the interactive setup wizard to scaffold a new DocMeDown documentation site")
  .option("-y, --yes", "Skip interactive prompts and confirmation, using defaults")
  .option("-n, --name <name>", "Project name for documentation")
  .option("--default-locale <code>", "Original document language (default: en)")
  .option("--locales <codes>", "Additional languages, comma-separated")
  .option("-t, --theme <family>", "Documentation theme family (atlas, blueprint, terminal, editorial)")
  .option("--no-start", "Do not start the local preview server after initialization")
  .action(async (dir, options) => {
    await initCommand(dir, {
      defaultLocale: options.defaultLocale,
      locales: options.locales,
      projectName: options.name,
      themeFamily: options.theme,
      start: options.start,
      yes: options.yes,
      interactive: !options.yes,
    });
  });

// Subcommand: serve / dev
program
  .command("serve [dir]")
  .alias("dev")
  .description("Start local live-reload development server (serves both root *.md and ./docs/ documents seamlessly)")
  .option("-p, --port <number>", "Port to listen on", "3000")
  .option("-H, --host <string>", "Host to bind server to (default: 0.0.0.0 for LAN access)", "0.0.0.0")
  .option("--preview", "Serve .preview staging directory with fallback to production source")
  .option("--mode <mode>", "Serving mode: preview or production", "production")
  .option("--no-open", "Do not automatically open browser")
  .option("--no-qr", "Do not print the network QR code")
  .action(async (dir = "./docs", options) => {
    await serveCommand(dir, options);
  });

// Subcommand: build
program
  .command("build [dir]")
  .description(
    "Build serveable documentation, a static site, and an offline bundle (merging root *.md and ./docs/ documents)",
  )
  .option("-w, --watch", "Watch source files and rebuild both outputs after changes")
  .option("--no-single-file", "Skip the default standalone offline index.html bundle")
  .option("--no-static", "Skip static page prerendering and SEO/AI context files")
  .option("-o, --out-dir <path>", "Offline bundle output directory (default: <dir>/.dmd/.singlefile)")
  .action(async (dir = "./docs", options) => {
    if (options.watch) {
      await watchBuildCommand(dir, options);
    } else {
      await buildCommand(dir, options);
    }
  });

// Subcommand: mcp
program
  .command("mcp [dir]")
  .description("Serve documentation as an MCP (Model Context Protocol) server")
  .option("-t, --transport <type>", "Transport type: stdio or sse", "stdio")
  .option("-p, --port <number>", "Port for SSE transport (default: 3001)")
  .option("-H, --host <string>", "Host to bind SSE server to", "localhost")
  .option("--allow-origins <origins>", "Allowed origins for SSE transport (comma-separated or '*')")
  .action(async (dir = "./docs", options) => {
    const { mcpCommand } = await import("./commands/mcp");
    await mcpCommand(dir, options);
  });

// Subcommand: validate
program
  .command("validate [dir]")
  .description("Validate Markdown links, frontmatter, and docs.json schema")
  .option("--json", "Output validation report as JSON")
  .action(async (dir = "./docs", options) => {
    const { validateCommand } = await import("./commands/validate");
    await validateCommand(dir, { ...options, exitOnError: true });
  });

// Subcommand: doctor
program
  .command("doctor [dir]")
  .description("Diagnose Node environment, missing assets, and .dmd custom component compilation")
  .option("--json", "Output diagnostic report as JSON")
  .action(async (dir = "./docs", options) => {
    const { doctorCommand } = await import("./commands/doctor");
    await doctorCommand(dir, { ...options, exitOnError: true });
  });

// Subcommand: config
program
  .command("config [path]")
  .description("Launch the interactive TUI configuration wizard for docs.json")
  .action(async (configPath) => {
    await configTuiCommand(configPath);
  });

program.parse(process.argv);
