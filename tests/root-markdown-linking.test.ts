import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { shouldWatchDocumentationSource } from "../src/cli/commands/build";
import { detectRootMarkdownFiles, linkRootMarkdownFiles } from "../src/cli/utils/link-root";
import { generateManifest, scanDirectory } from "../src/cli/utils/scanner";
import { DEFAULT_CONFIG } from "../src/runtime/config";

test("detectRootMarkdownFiles discovers root markdown files and ignores excluded/hidden files", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-root-test-"));
  try {
    fs.writeFileSync(path.join(tempDir, "README.md"), "# Project Readme", "utf-8");
    fs.writeFileSync(path.join(tempDir, "CONTRIBUTING.md"), "# Contributing", "utf-8");
    fs.writeFileSync(path.join(tempDir, "ROADMAP.md"), "# Roadmap", "utf-8");
    fs.writeFileSync(path.join(tempDir, ".hidden.md"), "# Hidden", "utf-8");
    fs.writeFileSync(path.join(tempDir, "SKILL.md"), "# Skill", "utf-8");
    fs.writeFileSync(path.join(tempDir, "package.json"), "{}", "utf-8");

    const detected = detectRootMarkdownFiles(tempDir);
    assert.ok(detected.includes("README.md"));
    assert.ok(detected.includes("CONTRIBUTING.md"));
    assert.ok(detected.includes("ROADMAP.md"));
    assert.ok(!detected.includes(".hidden.md"));
    assert.ok(!detected.includes("SKILL.md"));
    assert.ok(!detected.includes("package.json"));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("linkRootMarkdownFiles links root markdown files into docs folder by default without subdivision", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-link-test-"));
  const docsDir = path.join(tempDir, "docs");

  try {
    fs.writeFileSync(path.join(tempDir, "README.md"), "# Real Root Readme", "utf-8");
    fs.writeFileSync(path.join(tempDir, "CONTRIBUTING.md"), "# Contribution Guide", "utf-8");
    fs.writeFileSync(path.join(tempDir, "CHANGELOG.md"), "# Version Log", "utf-8");

    const result = linkRootMarkdownFiles(tempDir, docsDir);
    assert.equal(result.linked.length, 3);
    assert.ok(result.linked.includes("README.md"));
    assert.ok(result.linked.includes("CONTRIBUTING.md"));
    assert.ok(result.linked.includes("CHANGELOG.md"));

    // Verify files exist in docsDir and read the original root content
    assert.ok(fs.existsSync(path.join(docsDir, "README.md")));
    assert.ok(fs.existsSync(path.join(docsDir, "CONTRIBUTING.md")));
    assert.equal(fs.readFileSync(path.join(docsDir, "README.md"), "utf-8"), "# Real Root Readme");

    // Also add a docs-specific file in docsDir
    fs.writeFileSync(path.join(docsDir, "getting-started.md"), "# Getting Started", "utf-8");

    // Scan directory should find all files as top-level documents
    const scanned = scanDirectory(docsDir);
    assert.ok(scanned.includes("README.md"));
    assert.ok(scanned.includes("CONTRIBUTING.md"));
    assert.ok(scanned.includes("CHANGELOG.md"));
    assert.ok(scanned.includes("getting-started.md"));

    // Manifest should index them without any './docs/' category subdivision
    const manifest = generateManifest(docsDir, DEFAULT_CONFIG);
    const slugs = manifest.docs.map((d) => d.slug);
    assert.ok(slugs.includes("README"));
    assert.ok(slugs.includes("CONTRIBUTING"));
    assert.ok(slugs.includes("CHANGELOG"));
    assert.ok(slugs.includes("getting-started"));

    for (const doc of manifest.docs) {
      assert.notEqual(doc.category, "docs");
    }

    // Running linkRootMarkdownFiles again should skip already linked files
    const secondPass = linkRootMarkdownFiles(tempDir, docsDir);
    assert.equal(secondPass.linked.length, 0);
    assert.equal(secondPass.skipped.length, 3);

    // Watcher accepts both docs-internal and parent root markdown files
    assert.ok(shouldWatchDocumentationSource(docsDir, path.join(docsDir, "getting-started.md")));
    assert.ok(shouldWatchDocumentationSource(docsDir, path.join(tempDir, "CONTRIBUTING.md")));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("linkRootMarkdownFiles cleans up stale symlinks when a root markdown file is deleted", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-cleanup-test-"));
  const docsDir = path.join(tempDir, "docs");

  try {
    const tempMd = path.join(tempDir, "TEMP.md");
    fs.writeFileSync(tempMd, "# Temporary", "utf-8");

    linkRootMarkdownFiles(tempDir, docsDir);
    assert.ok(fs.existsSync(path.join(docsDir, "TEMP.md")));

    // Delete root file
    fs.unlinkSync(tempMd);

    // Next pass cleans up stale link
    const cleanupPass = linkRootMarkdownFiles(tempDir, docsDir);
    assert.ok(cleanupPass.cleaned.includes("TEMP.md"));
    assert.ok(!fs.existsSync(path.join(docsDir, "TEMP.md")));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
