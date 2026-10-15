import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const created = new Set<string>();

process.on("exit", () => {
  for (const dir of created) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup; the OS temp directory is disposable anyway.
    }
  }
});

/** Creates a temp directory that is removed automatically when the test process exits. */
export function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix.endsWith("-") ? prefix : `${prefix}-`));
  created.add(dir);
  return dir;
}

/** Writes a `{ relativePath: contents }` map under `root`, creating parent directories. */
export function writeFiles(root: string, files: Record<string, string>): void {
  for (const [relative, contents] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
}
