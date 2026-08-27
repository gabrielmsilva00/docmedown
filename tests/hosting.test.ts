import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const packageRoot = path.resolve(__dirname, "..");

test("GitHub Pages workflow builds and publishes the complete generated docs directory", () => {
  const workflow = fs.readFileSync(path.join(packageRoot, ".github/workflows/pages.yml"), "utf-8");

  assert.match(workflow, /npm run build\n/);
  assert.match(workflow, /npm run build:docs\n/);
  assert.match(workflow, /test -f docs\/_docs\.js/);
  assert.match(workflow, /test -f docs\/.nojekyll/);
  assert.match(workflow, /test -f docs\/docmedown\.iife\.js/);
  assert.match(workflow, /actions\/upload-pages-artifact@v3/);
  assert.match(workflow, /path: docs/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});

test("serveable docs entrypoint uses same-directory relative generated assets", () => {
  const indexHtml = fs.readFileSync(path.join(packageRoot, "docs/index.html"), "utf-8");

  assert.match(indexHtml, /<script src="\.\/_docs\.js"><\/script>/);
  assert.match(indexHtml, /<script src="\.\/docmedown\.iife\.js" data-docmedown-runtime><\/script>/);
  assert.doesNotMatch(indexHtml, /src="\/(?:_docs|docmedown\.iife)/);
  assert.doesNotMatch(indexHtml, /https?:\/\//);
  assert.ok(indexHtml.includes('<link rel="icon" href="data:," />'));
  assert.ok(fs.existsSync(path.join(packageRoot, "docs/.nojekyll")));
});
