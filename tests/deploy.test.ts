import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { incrementPatchVersion, listOutputLines, localIsoDate, promoteChangelog } from "../scripts/deploy-lib.mjs";

test("deploy helper increments stable patch versions", () => {
  assert.equal(incrementPatchVersion("0.1.4"), "0.1.5");
  assert.equal(incrementPatchVersion("12.9.99"), "12.9.100");
  assert.throws(() => incrementPatchVersion("1.0.0-beta.1"), /stable semantic version/);
});

test("deploy helper promotes Unreleased notes into a dated release", () => {
  const changelog = `# Changelog

## Unreleased

### Fixed

- Responsive shell.

---

## 0.1.4 - 2026-08-28

- Previous release.
`;
  const promoted = promoteChangelog(changelog, "0.1.5", "2026-08-28");

  assert.match(promoted, /## Unreleased\n\n---\n\n## 0\.1\.5 - 2026-08-28/);
  assert.match(promoted, /## 0\.1\.5[\s\S]*### Fixed[\s\S]*Responsive shell/);
  assert.equal(promoteChangelog(promoted, "0.1.5", "2026-08-28"), promoted);
});

test("deploy helper rejects empty release notes and normalizes command output", () => {
  assert.throws(() => promoteChangelog("# Changelog\n\n## Unreleased\n\n---\n", "0.1.5", "2026-08-28"), /at least one/);
  assert.deepEqual(listOutputLines(" alpha\r\n\r\n beta \n"), ["alpha", "beta"]);
  assert.equal(localIsoDate(new Date(2026, 7, 28)), "2026-08-28");
});

test("deploy command auto-commits tracked changes but refuses untracked files", () => {
  const script = fs.readFileSync(path.resolve(__dirname, "../scripts/deploy.mjs"), "utf-8");

  assert.match(script, /git", \["ls-files", "--others", "--exclude-standard"\]/);
  assert.match(script, /git", \["add", "-u"\]/);
  assert.match(script, /chore\(release\): v\$\{version\}/);
  assert.match(script, /incrementPatchVersion\(version\)/);
  assert.match(script, /runNpm\(\["run", "test:release"\]\)/);
  assert.match(script, /Registry metadata has not propagated yet/);
  assert.match(script, /git", \["fetch", "origin", "main"\]/);
  assert.doesNotMatch(script, /git", \["fetch", "origin", "main", "--tags"\]/);

  // A missing Unreleased section must abort before the version bump mutates
  // package files, so a failed promotion never leaves a half-applied release.
  const prepareVersionBlock = script.match(/function prepareVersion\(nextVersion\) \{\n([\s\S]*?)\n\}/)?.[1] || "";
  const promoteIndex = prepareVersionBlock.indexOf("promoteChangelog");
  const versionCallIndex = prepareVersionBlock.indexOf('runNpm(["version"');
  assert.ok(promoteIndex !== -1, "prepareVersion should compute the promoted changelog");
  assert.ok(promoteIndex < versionCallIndex, "prepareVersion should validate the changelog before running npm version");
});
