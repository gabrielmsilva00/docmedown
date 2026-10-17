import fs from "node:fs";
import os from "node:os";
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
  qr?: boolean;
}

/** First reachable LAN IPv4 (Wi-Fi/Ethernet), or null when offline. */
export function getLanIpv4(): string | null {
  try {
    const interfaces = os.networkInterfaces();
    const candidates: string[] = [];
    for (const addrs of Object.values(interfaces)) {
      for (const addr of addrs ?? []) {
        if (addr.family !== "IPv4" || addr.internal) continue;
        if (addr.address.startsWith("169.254.")) continue;
        candidates.push(addr.address);
      }
    }
    // Prefer private LAN ranges (192.168/10/172.16) over docker/virtual ones.
    const preferred =
      candidates.find((ip) => ip.startsWith("192.168.")) ??
      candidates.find((ip) => ip.startsWith("10.")) ??
      candidates.find((ip) => /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) ??
      candidates[0];
    return preferred ?? null;
  } catch {
    return null;
  }
}

// qrcode-terminal ships CJS without bundled @types; see src/qrcode-terminal.d.ts.
/** Renders a terminal QR code for the URL; best-effort, never throws. */
async function printQrCode(url: string): Promise<boolean> {
  try {
    // NOTE: intentionally resolved via a runtime require indirection so the
    // CLI bundler (tsup/esbuild) keeps this dependency external. A static
    // `import("qrcode-terminal")` would be compiled to a require wrapper at
    // build time and could never resolve from node_modules at serve time.
    const req = new Function("m", "return require(m);") as (id: string) => unknown;
    const mod = req("qrcode-terminal") as { generate?: (text: string, opts?: unknown) => void } | undefined;
    const generate = mod?.generate;
    if (typeof generate !== "function") return false;
    console.log(chalk.dim("  Scan to open on your phone:"));
    generate(url, { small: true });
    return true;
  } catch {
    // QR is a convenience — a missing/unreachable dep must not break serve.
    return false;
  }
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

  if (isDirectSubfolder) {
    linkRootMarkdownFiles(rootDir, targetDir);
  }

  const effectiveMode = options.preview ? "preview" : options.mode || "production";

  console.log(chalk.bold.magenta("\n⚡ DocMeDown Dev Server\n"));
  console.log(chalk.dim(`  Serving directory: ${targetDir}`));
  if (isDirectSubfolder) {
    console.log(
      chalk.dim(
        `  Unified documents: Root (*.md) + ${path.relative(rootDir, targetDir) || targetDirArg} (linked by default)`,
      ),
    );
  }
  console.log(
    chalk.dim(
      `  Mode: ${effectiveMode === "preview" ? chalk.yellow("Preview (.preview staging)") : chalk.green("Production (direct source)")}`,
    ),
  );

  try {
    const result = await buildCommand(targetDir, { silent: true });
    const nestedSuffix = result.nestedCount > 0 ? ` + ${result.nestedCount} nested` : "";
    console.log(chalk.green(`  ✔ Artifacts ready (${result.pages} pages${nestedSuffix})`));

    // Bind all interfaces so the Network URL below is actually reachable.
    const bindHost = options.host || "0.0.0.0";
    const devServer = await startDevServer({
      rootDir: targetDir,
      host: bindHost,
      port: options.port ? Number(options.port) : 3000,
      mode: effectiveMode,
      onSourceChange: () => {
        void buildCommand(targetDir, { silent: true });
      },
    });

    const localUrl = `http://localhost:${devServer.port}`;
    const lanIp = getLanIpv4();
    const networkUrl = lanIp ? `http://${lanIp}:${devServer.port}` : null;
    console.log(chalk.bold.green(`\n✔ Live Documentation Server running at:`));
    console.log(chalk.bold.cyan(`  ➜  Local:   ${chalk.underline(localUrl)}`));
    if (networkUrl) {
      console.log(chalk.bold.cyan(`  ➜  Network: ${chalk.underline(networkUrl)}`));
      if (options.qr !== false) {
        // Best-effort only; warn loudly when the QR dep is unreachable so a
        // missing code never looks like a silent success again.
        const shown = await printQrCode(networkUrl);
        if (!shown) {
          console.log(chalk.yellow("  ⚠ Network QR unavailable (qrcode-terminal not installed)."));
        }
      }
    }
    console.log(chalk.dim(`  ➜  HMR:   In-place hot reloading active (no full page reload on markdown edits)`));
    console.log(chalk.dim(`  ➜  2-Way: 2-Way Editor enabled (Ctrl+E on page to edit & save)`));
    console.log(chalk.dim(`\n  Press Ctrl+C to stop.\n`));

    // Open the Network URL by default so phones can follow immediately;
    // fall back to Local when no LAN address is available.
    if (options.open !== false) {
      await open(networkUrl ?? localUrl);
    }
  } catch (err: any) {
    console.error(chalk.red(`\n✖ Error starting server: ${err.message}\n`));
    process.exit(1);
  }
}
