import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { validateCommand } from "../src/cli/commands/validate";

function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `dmd-validate-${prefix}-`));
}

test("validateCommand passes on valid documentation with cross-links and anchors", async () => {
  const dir = createTempDir("valid");
  fs.writeFileSync(
    path.join(dir, "docs.json"),
    JSON.stringify({
      name: "Valid Docs",
      theme: { family: "atlas", defaultMode: "auto" },
    }),
    "utf-8",
  );
  fs.writeFileSync(
    path.join(dir, "README.md"),
    `---
title: Welcome
category: general
order: 1
---

# Introduction

Welcome! Check out the [Guide](./guide.md) or jump to [Local Section](#local-section).
You can also see [Guide Setup](./guide.md#setup).

## Local Section

Here is the local section details.
`,
    "utf-8",
  );
  fs.writeFileSync(
    path.join(dir, "guide.md"),
    `---
title: Guide
category: guides
order: 2
---

# Guide

Instructions on getting started.

## Setup

Setup details here.
`,
    "utf-8",
  );

  const result = await validateCommand(dir, { silent: true });
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.stats.docs, 2);
  assert.ok(result.stats.links >= 3);
  assert.ok(result.stats.headings >= 4);
});

test("validateCommand detects invalid docs.json configuration schema", async () => {
  const dir = createTempDir("invalid-config");
  fs.writeFileSync(
    path.join(dir, "docs.json"),
    JSON.stringify({
      name: "Invalid Config",
      theme: { family: "non_existent_family" },
    }),
    "utf-8",
  );
  fs.writeFileSync(path.join(dir, "README.md"), "# Home\n\nContent", "utf-8");

  const result = await validateCommand(dir, { silent: true });
  assert.equal(result.valid, false);
  const configErrors = result.errors.filter((e) => e.type === "config");
  assert.ok(configErrors.length > 0);
  assert.ok(configErrors.some((e) => e.message.includes("theme.family")));
});

test("validateCommand flags deprecated theme.preset in docs.json", async () => {
  const dir = createTempDir("deprecated-preset");
  fs.writeFileSync(
    path.join(dir, "docs.json"),
    JSON.stringify({
      name: "Deprecated Preset",
      theme: { preset: "ocean" },
    }),
    "utf-8",
  );
  fs.writeFileSync(path.join(dir, "README.md"), "# Home", "utf-8");

  const result = await validateCommand(dir, { silent: true });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.message.includes('Deprecated "theme.preset"')));
});

test("validateCommand detects malformed YAML frontmatter syntax", async () => {
  const dir = createTempDir("bad-yaml");
  fs.writeFileSync(
    path.join(dir, "README.md"),
    `---
title: "Unclosed title string
broken_yaml: [
---

# Home
`,
    "utf-8",
  );

  const result = await validateCommand(dir, { silent: true });
  assert.equal(result.valid, false);
  const fmErrors = result.errors.filter((e) => e.type === "frontmatter");
  assert.ok(fmErrors.length > 0);
  assert.ok(fmErrors[0].message.includes("frontmatter YAML syntax"));
});

test("validateCommand validates frontmatter field types", async () => {
  const dir = createTempDir("bad-fm-types");
  fs.writeFileSync(
    path.join(dir, "README.md"),
    `---
title: 12345
order: "not-a-number"
hidden: "yes"
tags: "not-an-array"
---

# Home
`,
    "utf-8",
  );

  const result = await validateCommand(dir, { silent: true });
  assert.equal(result.valid, false);
  const messages = result.errors.map((e) => e.message);
  assert.ok(messages.some((m) => m.includes('"title" must be a string')));
  assert.ok(messages.some((m) => m.includes('"order" must be a number')));
  assert.ok(messages.some((m) => m.includes('"hidden" must be a boolean')));
  assert.ok(messages.some((m) => m.includes('"tags" must be an array')));
});

test("validateCommand catches broken local anchors, relative file links, and remote anchors", async () => {
  const dir = createTempDir("broken-links");
  fs.writeFileSync(
    path.join(dir, "README.md"),
    `# Home

Line 3 has [Broken Local Anchor](#does-not-exist).
Line 4 has [Missing File](./guides/non-existent.md).
Line 5 has [Existing File Broken Anchor](./other.md#missing-heading).
`,
    "utf-8",
  );
  fs.writeFileSync(
    path.join(dir, "other.md"),
    `# Other

## Valid Heading

Content here.
`,
    "utf-8",
  );

  const result = await validateCommand(dir, { silent: true });
  assert.equal(result.valid, false);

  const anchorErrors = result.errors.filter((e) => e.type === "anchor");
  const linkErrors = result.errors.filter((e) => e.type === "link");

  assert.ok(anchorErrors.some((e) => e.message.includes("#does-not-exist")));
  assert.ok(anchorErrors.some((e) => e.message.includes("#missing-heading")));
  assert.ok(linkErrors.some((e) => e.message.includes("non-existent.md")));
});

test("validateCommand handles missing directory gracefully", async () => {
  const missingPath = path.join(os.tmpdir(), "dmd-nonexistent-dir-12345");
  const result = await validateCommand(missingPath, { silent: true });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.message.includes("does not exist")));
});
