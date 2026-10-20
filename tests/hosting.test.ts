import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const packageRoot = path.resolve(__dirname, "..");

test("GitHub Pages workflow builds and publishes the complete generated docs directory", () => {
  const workflow = fs.readFileSync(path.join(packageRoot, ".github/workflows/pages.yml"), "utf-8");

  assert.match(workflow, /npm run build\n/);
  assert.match(workflow, /npm run build:docs\n/);
  assert.match(workflow, /test -f docs\/.dmd\/_docs\.js/);
  assert.match(workflow, /test -f docs\/.dmd\/.nojekyll/);
  assert.match(workflow, /test -f docs\/.dmd\/docmedown\.web\.js/);
  assert.match(workflow, /actions\/upload-pages-artifact@v3/);
  assert.ok(
    workflow.includes(String.fromCharCode(112, 97, 116, 104, 58, 32, 100, 111, 99, 115, 47, 46, 100, 109, 100)),
  );
  assert.match(workflow, /actions\/deploy-pages@v4/);
});

test("authored documentation widgets are available to clean checkouts", () => {
  const componentsDir = path.join(packageRoot, "docs", ".dmd", ".components");
  for (const name of [
    "CounterWidget.svelte",
    "ReactMetricCard.tsx",
    "LitStatusBadge.ts",
    "InteractiveThemeDemo.svelte",
    "setup.js",
  ]) {
    assert.ok(fs.existsSync(path.join(componentsDir, name)), `Missing authored docs component: ${name}`);
  }
  assert.ok(fs.existsSync(path.join(packageRoot, "docs/examples/local-docs/.dmd/.components/OrbitCounter.svelte")));
});

test("serveable docs entrypoint uses same-directory relative generated assets", () => {
  const siteDir = path.join(packageRoot, "docs", ".dmd");
  const indexHtml = fs.readFileSync(path.join(siteDir, "index.html"), "utf-8");

  assert.match(indexHtml, /<script src="\.\/_docs\.js"><\/script>/);
  assert.match(indexHtml, /<script src="\.\/docmedown\.web\.js" data-docmedown-runtime><\/script>/);
  assert.doesNotMatch(indexHtml, /src="\/(?:_docs|docmedown)/);
  // Prerendered SEO head metadata (canonical, Open Graph, JSON-LD) intentionally
  // carries absolute URLs; script references must stay same-directory relative
  // so the site works at both custom domains and project subpaths.
  for (const match of indexHtml.matchAll(/<script\b[^>]*?\bsrc="([^"]*)"/g)) {
    const url = match[1];
    assert.ok(
      !url.startsWith("/") && !/^https?:\/\//.test(url),
      `Script reference must be same-directory relative: ${url}`,
    );
  }
  assert.match(indexHtml, /<link rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml;base64,[^"]+" \/>/);
  assert.doesNotMatch(indexHtml, /<link rel="icon" href="data:,"/);
  assert.ok(fs.existsSync(path.join(siteDir, ".nojekyll")));
});

test("docs root keeps ONLY documentation plus the index.html symlink distributable", () => {
  const docsDir = path.join(packageRoot, "docs");
  const linkPath = path.join(docsDir, "index.html");
  const stat = fs.lstatSync(linkPath);
  assert.ok(stat.isSymbolicLink() || stat.isFile(), "docs/index.html must exist as the distributable");
  if (stat.isSymbolicLink()) {
    const target = path.resolve(docsDir, fs.readlinkSync(linkPath));
    assert.equal(target, path.join(docsDir, ".dmd", "index.html"));
    // The symlink target must be the serveable SEO shell, not the blob.
    const targetHtml = fs.readFileSync(target, "utf-8");
    assert.ok(targetHtml.includes("data-docmedown-runtime"));
  }
  // No other generated artifacts may live at the docs root.
  for (const name of ["_manifest.json", "_docs.js", "docmedown.web.js", "docmedown-mermaid.js"]) {
    assert.equal(fs.existsSync(path.join(docsDir, name)), false, `${name} must live in docs/.dmd/`);
  }
  assert.equal(fs.existsSync(path.join(docsDir, ".dist")), false, "legacy .dist must be gone");
});
