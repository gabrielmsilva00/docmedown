import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = path.join(root, "tests");
// Exclude tests that require compiled artifacts from dist/
const postBuildTests = new Set([
  "bundle-size.test.ts",
  "offline-artifact.test.ts",
  "package-smoke.test.ts",
  "mcp.test.ts",
]);

const files = fs
  .readdirSync(testsDir)
  .filter((file) => file.endsWith(".test.ts") && !postBuildTests.has(file))
  .sort()
  .map((file) => path.join("tests", file));

const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");

const result = spawnSync(process.execPath, [tsxCli, "--test", ...files], {
  cwd: root,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
