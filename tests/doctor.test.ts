import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { checkNodeVersion, doctorCommand } from "../src/cli/commands/doctor";

function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `dmd-doctor-${prefix}-`));
}

test("checkNodeVersion accurately verifies engine compatibility", () => {
  assert.equal(checkNodeVersion("v20.19.0").supported, true);
  assert.equal(checkNodeVersion("v20.19.1").supported, true);
  assert.equal(checkNodeVersion("v20.20.0").supported, true);
  assert.equal(checkNodeVersion("v22.5.0").supported, true);
  assert.equal(checkNodeVersion("v26.0.0").supported, true);

  assert.equal(checkNodeVersion("v20.18.0").supported, false);
  assert.equal(checkNodeVersion("v18.20.0").supported, false);
  assert.equal(checkNodeVersion("v16.0.0").supported, false);
});

test("doctorCommand reports healthy status on valid project with assets", async () => {
  const dir = createTempDir("healthy");
  const assetDir = path.join(dir, "assets");
  fs.mkdirSync(assetDir, { recursive: true });
  fs.writeFileSync(path.join(assetDir, "logo.svg"), "<svg></svg>", "utf-8");

  fs.writeFileSync(
    path.join(dir, "docs.json"),
    JSON.stringify({
      name: "Healthy Docs",
      logo: "assets/logo.svg",
      theme: { family: "atlas" },
    }),
    "utf-8",
  );

  fs.writeFileSync(
    path.join(dir, "README.md"),
    `# Welcome

![Logo](./assets/logo.svg)

Documentation overview page.
`,
    "utf-8",
  );

  const report = await doctorCommand(dir, { silent: true });
  assert.equal(report.ok, true);
  assert.equal(report.summary.fail, 0);
  assert.ok(report.checks.some((c) => c.id === "assets" && c.status === "pass"));
  assert.ok(report.checks.some((c) => c.id === "docs-content" && c.status === "pass"));
});

test("doctorCommand detects missing local assets referenced in markdown and config", async () => {
  const dir = createTempDir("missing-asset");
  fs.writeFileSync(
    path.join(dir, "docs.json"),
    JSON.stringify({
      name: "Missing Asset Docs",
      logo: "assets/missing-logo.png",
    }),
    "utf-8",
  );

  fs.writeFileSync(
    path.join(dir, "README.md"),
    `# Welcome

![Screenshot](./images/non-existent-screenshot.png)
<img src="./images/non-existent-badge.svg" />
`,
    "utf-8",
  );

  const report = await doctorCommand(dir, { silent: true });
  assert.equal(report.ok, false);
  const assetCheck = report.checks.find((c) => c.id === "assets");
  assert.ok(assetCheck);
  assert.equal(assetCheck!.status, "fail");
  assert.ok(assetCheck!.message.includes("missing local asset file(s)"));
  assert.ok(assetCheck!.details && assetCheck!.details.length >= 3);
});

test("doctorCommand verifies valid .dmd custom components", async () => {
  const dir = createTempDir("valid-components");
  const dmdDir = path.join(dir, ".dmd");
  fs.mkdirSync(dmdDir, { recursive: true });

  fs.writeFileSync(
    path.join(dmdDir, "StatusPill.svelte"),
    `<svelte:options customElement="dmd-status-pill" />
<script>
  let { text = "active" } = $props();
</script>
<span class="pill">{text}</span>
`,
    "utf-8",
  );

  fs.writeFileSync(
    path.join(dmdDir, "CounterWidget.tsx"),
    `import React, { useState } from 'react';

export default function CounterWidget({ initial = 0 }: { initial?: number }) {
  const [count, setCount] = useState(initial);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
`,
    "utf-8",
  );

  fs.writeFileSync(path.join(dir, "README.md"), "# Home\n\nCustom components test.", "utf-8");

  const report = await doctorCommand(dir, { silent: true });
  assert.equal(report.ok, true);
  const compCheck = report.checks.find((c) => c.id === "dmd-components");
  assert.ok(compCheck);
  assert.equal(compCheck!.status, "pass");
  assert.ok(compCheck!.message.includes("compiled cleanly"));
});

test("doctorCommand diagnoses syntax and compilation errors in .dmd custom components", async () => {
  const dir = createTempDir("broken-components");
  const dmdDir = path.join(dir, ".dmd");
  fs.mkdirSync(dmdDir, { recursive: true });

  fs.writeFileSync(
    path.join(dmdDir, "BrokenComponent.svelte"),
    `<script>
  let count = $props(;;; invalid svelte code
</script>
<div>unclosed
`,
    "utf-8",
  );

  fs.writeFileSync(path.join(dir, "README.md"), "# Home\n\nTesting broken component.", "utf-8");

  const report = await doctorCommand(dir, { silent: true });
  assert.equal(report.ok, false);
  const compCheck = report.checks.find((c) => c.id === "dmd-components");
  assert.ok(compCheck);
  assert.equal(compCheck!.status, "fail");
  assert.ok(compCheck!.message.includes("Compilation failed"));
  assert.ok(compCheck!.details?.some((d) => d.includes("BrokenComponent.svelte")));
});

test("doctorCommand reports missing documentation root", async () => {
  const missingDir = path.join(os.tmpdir(), "dmd-missing-doctor-dir-9999");
  const report = await doctorCommand(missingDir, { silent: true });
  assert.equal(report.ok, false);
  const structCheck = report.checks.find((c) => c.id === "structure");
  assert.ok(structCheck);
  assert.equal(structCheck!.status, "fail");
});
