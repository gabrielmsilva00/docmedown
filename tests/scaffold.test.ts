import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import prompts from "prompts";
import { initCommand, quickstartCommand } from "../src/cli/commands/init";
import { detectProjectInfo, planScaffold, renderScaffoldTree } from "../src/cli/utils/scaffold-tree";
import { makeTempDir } from "./helpers/temp";

test("detectProjectInfo extracts metadata from package.json or defaults cleanly", () => {
  const root = makeTempDir("dmd-scaffold-info");
  const defaultInfo = detectProjectInfo(root);
  assert.equal(defaultInfo.name, path.basename(root));
  assert.equal(defaultInfo.description, "The simplest Markdown documentation yet");

  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "my-package", description: "Awesome package description" }),
    "utf-8",
  );

  const customInfo = detectProjectInfo(root);
  assert.equal(customInfo.name, "my-package");
  assert.equal(customInfo.description, "Awesome package description");
});

test("planScaffold identifies linked root markdown files without mutating disk", () => {
  const root = makeTempDir("dmd-scaffold-plan-root");
  const targetDir = path.join(root, "docs");

  // Create root markdown files
  fs.writeFileSync(path.join(root, "README.md"), "# Root Readme", "utf-8");
  fs.writeFileSync(path.join(root, "CHANGELOG.md"), "# Changelog", "utf-8");

  // Plan scaffold
  const plan = planScaffold({
    targetDirArg: "./docs",
    rootDir: root,
    includeSamples: true,
  });

  // Target directory must NOT be created yet
  assert.equal(fs.existsSync(targetDir), false, "targetDir must not be created during planning");

  assert.equal(plan.targetDir, targetDir);
  assert.equal(plan.displayDir, "./docs");

  // Check items
  const readmeItem = plan.items.find((i) => i.relPath === "README.md");
  assert.ok(readmeItem, "README.md item must be planned");
  assert.equal(readmeItem.action, "link");
  assert.equal(readmeItem.annotation, "(linked from root)");

  const changelogItem = plan.items.find((i) => i.relPath === "CHANGELOG.md");
  assert.ok(changelogItem, "CHANGELOG.md item must be planned as link");
  assert.equal(changelogItem.action, "link");

  const indexItem = plan.items.find((i) => i.relPath === "index.html");
  assert.ok(indexItem);
  assert.equal(indexItem.action, "create");

  const guideItem = plan.items.find((i) => i.relPath === "guides/custom-components.md");
  assert.ok(guideItem);
  assert.equal(guideItem.action, "create");

  const dmdItem = plan.items.find((i) => i.relPath === ".dmd/CounterWidget.svelte");
  assert.ok(dmdItem);
  assert.equal(dmdItem.action, "create");
});

test("planScaffold creates README.md from template if root has no README.md", () => {
  const root = makeTempDir("dmd-scaffold-plan-no-readme");
  const targetDir = path.join(root, "docs");

  const plan = planScaffold({
    targetDirArg: "./docs",
    rootDir: root,
    includeSamples: true,
  });

  assert.equal(fs.existsSync(targetDir), false);
  const readmeItem = plan.items.find((i) => i.relPath === "README.md");
  assert.ok(readmeItem);
  assert.equal(readmeItem.action, "create");
  assert.equal(readmeItem.annotation, undefined);
});

test("planScaffold marks existing files as skip with preservation annotation", () => {
  const root = makeTempDir("dmd-scaffold-plan-existing");
  const targetDir = path.join(root, "docs");
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "docs.json"), '{"name":"existing"}', "utf-8");

  const plan = planScaffold({
    targetDirArg: "./docs",
    rootDir: root,
    includeSamples: true,
  });

  const configItem = plan.items.find((i) => i.relPath === "docs.json");
  assert.ok(configItem);
  assert.equal(configItem.action, "skip");
  assert.equal(configItem.annotation, "(already exists, will keep)");
});

test("planScaffold omits guides and custom components when includeSamples is false", () => {
  const root = makeTempDir("dmd-scaffold-plan-nosamples");

  const plan = planScaffold({
    targetDirArg: "./docs",
    rootDir: root,
    includeSamples: false,
  });

  assert.equal(
    plan.items.some((i) => i.relPath.startsWith("guides/")),
    false,
  );
  assert.equal(
    plan.items.some((i) => i.relPath.startsWith(".dmd/")),
    false,
  );
});

test("renderScaffoldTree outputs clean directory tree with connectors and annotations", () => {
  const root = makeTempDir("dmd-scaffold-tree-view");
  fs.writeFileSync(path.join(root, "README.md"), "# Root", "utf-8");
  fs.writeFileSync(path.join(root, "CHANGELOG.md"), "# Changes", "utf-8");

  const plan = planScaffold({
    targetDirArg: "./docs",
    rootDir: root,
    includeSamples: true,
  });

  const tree = renderScaffoldTree(plan);

  assert.ok(tree.includes("docs/"), "Tree root should be docs/");
  assert.ok(tree.includes("index.html"), "Tree should list index.html");
  assert.ok(tree.includes("docs.json"), "Tree should list docs.json");
  assert.ok(tree.includes("README.md"), "Tree should list README.md");
  assert.ok(tree.includes("getting-started.md"), "Tree should list getting-started.md");
  assert.ok(tree.includes("CHANGELOG.md"), "Tree should list CHANGELOG.md");
  assert.ok(tree.includes("guides/"), "Tree should list guides/");
  assert.ok(tree.includes("custom-components.md"), "Tree should list custom-components.md under guides/");
  assert.ok(tree.includes(".dmd/"), "Tree should list .dmd/");
  assert.ok(tree.includes("CounterWidget.svelte"), "Tree should list CounterWidget.svelte under .dmd/");

  // Tree connectors
  assert.ok(tree.includes("├──") || tree.includes("└──"), "Tree must include branch box characters");
  assert.ok(tree.includes("(linked from root)"), "Tree must include linked annotations");
});

test("quickstartCommand does NOT create any files when confirmation is declined", async () => {
  const root = makeTempDir("dmd-scaffold-quickstart-cancel");
  const targetDir = path.join(root, "docs");

  const originalCwd = process.cwd();
  try {
    process.chdir(root);

    // Inject confirmation: false
    prompts.inject([false]);

    const result = await quickstartCommand("./docs", { start: false });
    assert.equal(result, false, "quickstartCommand should return false on cancel");
    assert.equal(fs.existsSync(targetDir), false, "target directory must NOT exist after cancellation");
  } finally {
    process.chdir(originalCwd);
  }
});

test("quickstartCommand scaffolds files and builds artifacts when confirmed or --yes", async () => {
  const root = makeTempDir("dmd-scaffold-quickstart-yes");
  const targetDir = path.join(root, "docs");

  const originalCwd = process.cwd();
  try {
    process.chdir(root);

    const result = await quickstartCommand("./docs", { yes: true, start: false });
    assert.equal(result, true, "quickstartCommand should return true on success");
    assert.equal(fs.existsSync(targetDir), true, "target directory must exist");
    assert.equal(fs.existsSync(path.join(targetDir, "index.html")), true, "index.html must exist");
    assert.equal(fs.existsSync(path.join(targetDir, "docs.json")), true, "docs.json must exist");
    assert.equal(fs.existsSync(path.join(targetDir, "README.md")), true, "README.md must exist");
    assert.equal(fs.existsSync(path.join(targetDir, "getting-started.md")), true, "getting-started.md must exist");
    assert.equal(fs.existsSync(path.join(targetDir, "guides/custom-components.md")), true);
    assert.equal(fs.existsSync(path.join(targetDir, ".dmd/CounterWidget.svelte")), true);
    assert.equal(fs.existsSync(path.join(targetDir, ".dist/index.html")), true, "offline bundle must be built");
  } finally {
    process.chdir(originalCwd);
  }
});

test("initCommand does NOT create any files when questionnaire is cancelled", async () => {
  const root = makeTempDir("dmd-scaffold-init-cancel-questionnaire");
  const targetDir = path.join(root, "docs");

  const originalCwd = process.cwd();
  try {
    process.chdir(root);

    // Cancel questionnaire by injecting undefined (Escape / Ctrl+C)
    prompts.inject([undefined]);

    const result = await initCommand(undefined, { start: false });
    assert.equal(result, false);
    assert.equal(fs.existsSync(targetDir), false, "target directory must NOT be created");
  } finally {
    process.chdir(originalCwd);
  }
});

test("initCommand does NOT create any files when confirmation prompt is declined", async () => {
  const root = makeTempDir("dmd-scaffold-init-cancel-confirm");
  const targetDir = path.join(root, "docs");

  const originalCwd = process.cwd();
  try {
    process.chdir(root);

    // dir, name, tagline, family, defaultMode, includeSamples, proceed (false)
    prompts.inject(["./docs", "My Test Project", "Awesome Tagline", "terminal", "dark", true, false]);

    const result = await initCommand(undefined, { start: false });
    assert.equal(result, false);
    assert.equal(fs.existsSync(targetDir), false, "target directory must NOT exist after cancellation");
  } finally {
    process.chdir(originalCwd);
  }
});

test("initCommand applies interactive choices to docs.json and scaffolds when confirmed", async () => {
  const root = makeTempDir("dmd-scaffold-init-success");
  const targetDir = path.join(root, "docs");

  const originalCwd = process.cwd();
  try {
    process.chdir(root);

    // dir, name, tagline, family, defaultMode, includeSamples (false), proceed (true), startServer (false)
    prompts.inject(["./docs", "Custom Docs", "Fast and Beautiful", "blueprint", "dark", false, true, false]);

    const result = await initCommand(undefined, { start: false });
    assert.equal(result, true);
    assert.equal(fs.existsSync(targetDir), true);

    const config = JSON.parse(fs.readFileSync(path.join(targetDir, "docs.json"), "utf-8"));
    assert.equal(config.name, "Custom Docs");
    assert.equal(config.tagline, "Fast and Beautiful");
    assert.equal(config.theme.family, "blueprint");
    assert.equal(config.theme.defaultMode, "dark");

    // includeSamples was false, so guides/ and .dmd/ should NOT exist
    assert.equal(fs.existsSync(path.join(targetDir, "guides")), false);
    assert.equal(fs.existsSync(path.join(targetDir, ".dmd")), false);
  } finally {
    process.chdir(originalCwd);
  }
});
