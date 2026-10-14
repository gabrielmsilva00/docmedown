import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import open from "open";
import { linkRootMarkdownFiles } from "../utils/link-root";
import { startDevServer } from "../utils/server";
import { buildCommand } from "./build";

export interface ServeOptions {
  port?: number;
  host?: string;
  open?: boolean;
  preview?: boolean;
  mode?: "preview" | "production";
}

export async function serveCommand(targetDirArg: string = "./docs", options: ServeOptions = {}) {
  let targetDir = path.resolve(process.cwd(), targetDirArg);

  // If specified dir doesn't exist, check current dir or default docs
  if (!fs.existsSync(targetDir)) {
    if (fs.existsSync(path.resolve(process.cwd(), "docs"))) {
      targetDir = path.resolve(process.cwd(), "docs");
    } else {
      targetDir = process.cwd();
    }
  }

  const rootDir = process.cwd();

  // Link root markdown files into targetDir if targetDir is a direct subfolder of root (e.g. ./docs)
  const isDirectSubfolder =
    path.resolve(rootDir).toLowerCase() !== path.resolve(targetDir).toLowerCase() &&
    path.dirname(targetDir).toLowerCase() === path.resolve(rootDir).toLowerCase();

  let linkedRootFiles: string[] = [];
  if (isDirectSubfolder) {
    const linkResult = linkRootMarkdownFiles(rootDir, targetDir);
    linkedRootFiles = linkResult.linked;
  }

  const effectiveMode = options.preview ? "preview" : options.mode || "production";

  console.log(chalk.bold.magenta("\n⚡ DocMeDown Dev Server\n"));
  console.log(chalk.dim(`  Serving directory: ${targetDir}`));
  if (isDirectSubfolder) {
    console.log(
      chalk.dim(
        `  Unified documents: Root (*.md) + ${path.relative(rootDir, targetDir) || targetDirArg} (linked by default without ./docs/ subdivision)`,
      ),
    );
    if (linkedRootFiles.length > 0) {
      console.log(
        chalk.green(
          `  ✔ Linked root markdown file${linkedRootFiles.length === 1 ? "" : "s"}: ${linkedRootFiles.join(", ")}`,
        ),
      );
    }
  }
  console.log(
    chalk.dim(
      `  Mode: ${effectiveMode === "preview" ? chalk.yellow("Preview (.preview staging)") : chalk.green("Production (direct source)")}`,
    ),
  );

  try {
    console.log(chalk.dim("  Building serveable and offline documentation artifacts..."));
    await buildCommand(targetDir);

    const devServer = await startDevServer({
      rootDir: targetDir,
      host: options.host || "localhost",
      port: options.port ? Number(options.port) : 3000,
      mode: effectiveMode,
      onSourceChange: () => buildCommand(targetDir),
    });

    const url = `http://${options.host || "localhost"}:${devServer.port}`;
    console.log(chalk.bold.green(`\n✔ Live Documentation Server running at:`));
    console.log(chalk.bold.cyan(`  ➜  Local:   ${chalk.underline(url)}`));
    console.log(chalk.dim(`  ➜  HMR:   In-place hot reloading active (no full page reload on markdown edits)`));
    console.log(chalk.dim(`  ➜  2-Way: 2-Way Editor enabled (Ctrl+E on page to edit & save)`));
    console.log(chalk.dim(`\n  Press Ctrl+C to stop.\n`));

    if (options.open !== false) {
      await open(url);
    }
  } catch (err: any) {
    console.error(chalk.red(`\n✖ Error starting server: ${err.message}\n`));
    process.exit(1);
  }
}
