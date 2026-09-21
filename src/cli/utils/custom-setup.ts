import fs from "node:fs";
import path from "node:path";
import { buildSync } from "esbuild";
import { registerLanguage } from "../../runtime/markdown/highlighter";

/**
 * Loads custom setup files (e.g. `.dmd/setup.js`, `.dmd/languages.js`) at build
 * time so custom Prism grammars and runtime hooks are active when prerendering
 * static HTML pages.
 */
export function loadBuildTimeCustomSetup(targetPath: string): void {
  let dmdDir: string | undefined;
  if (fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      if (fs.existsSync(path.join(targetPath, ".dmd"))) {
        dmdDir = path.join(targetPath, ".dmd");
      } else {
        dmdDir = targetPath;
      }
    } else {
      dmdDir = path.dirname(targetPath);
    }
  }

  if (!dmdDir || !fs.existsSync(dmdDir)) return;

  const setupCandidates = [
    "setup.js",
    "setup.mjs",
    "setup.cjs",
    "setup.ts",
    "languages.js",
    "languages.ts",
    "components.js",
    "index.js",
  ];

  for (const candidate of setupCandidates) {
    const fullPath = path.join(dmdDir, candidate);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      try {
        if (typeof (globalThis as any).window === "undefined") {
          (globalThis as any).window = globalThis;
        }
        (globalThis as any).DocMeDown = {
          ...((globalThis as any).DocMeDown || {}),
          registerLanguage,
        };

        const bundled = buildSync({
          entryPoints: [fullPath],
          bundle: false,
          format: "cjs",
          platform: "node",
          target: "node18",
          write: false,
          logLevel: "silent",
        });

        const code = bundled.outputFiles[0]?.text;
        if (code) {
          const fn = new Function("exports", "require", "module", "__filename", "__dirname", code);
          const dummyModule = { exports: {} };
          fn(dummyModule.exports, require, dummyModule, fullPath, path.dirname(fullPath));
        }
      } catch {
        // User setup may contain browser-only code; ignore gracefully
      }
    }
  }
}
