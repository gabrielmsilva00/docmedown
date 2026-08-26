import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import open from "open";
import { startDevServer } from "../utils/server";
import { buildCommand } from "./build";

export interface ServeOptions {
  port?: number;
  host?: string;
  open?: boolean;
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

  console.log(chalk.bold.magenta("\n⚡ DocMeDown Dev Server\n"));
  console.log(chalk.dim(`  Serving directory: ${targetDir}`));

  try {
    console.log(chalk.dim("  Building serveable and offline documentation artifacts..."));
    await buildCommand(targetDir);

    const devServer = await startDevServer({
      rootDir: targetDir,
      host: options.host || "localhost",
      port: options.port ? Number(options.port) : 3000,
      onSourceChange: () => buildCommand(targetDir),
    });

    const url = `http://${options.host || "localhost"}:${devServer.port}`;
    console.log(chalk.bold.green(`\n✔ Live Documentation Server running at:`));
    console.log(chalk.bold.cyan(`  ➜  Local:   ${chalk.underline(url)}`));
    console.log(chalk.dim(`  ➜  Watch: Source changes rebuild preview and .dist/index.html`));
    console.log(chalk.dim(`\n  Press Ctrl+C to stop.\n`));

    if (options.open !== false) {
      await open(url);
    }
  } catch (err: any) {
    console.error(chalk.red(`\n✖ Error starting server: ${err.message}\n`));
    process.exit(1);
  }
}
