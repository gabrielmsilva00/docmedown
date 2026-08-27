import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const packageRoot = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf-8"));

test("package metadata exposes stable CommonJS, ESM, type, and browser entry points", () => {
  assert.equal(packageJson.name, "docmedown");
  assert.match(packageJson.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  assert.equal(packageJson.main, "./dist/docmedown.cjs");
  assert.equal(packageJson.module, "./dist/docmedown.mjs");
  assert.equal(packageJson.types, "./dist/types/runtime/index.d.ts");
  assert.equal(packageJson.exports["."].require, "./dist/docmedown.cjs");
  assert.equal(packageJson.exports["."].import, "./dist/docmedown.mjs");
  assert.equal(packageJson.exports["./iife"], "./dist/docmedown.iife.js");
  assert.equal(packageJson.repository.url, "git+https://github.com/gabrielmsilva00/docmedown.git");
  assert.equal(packageJson.scripts.deploy, "node ./scripts/deploy.mjs");
  assert.equal(packageJson.scripts["deploy:dry-run"], "npm run deploy -- --dry-run");
  assert.equal(packageJson.scripts.lint, "biome check .");
  assert.equal(packageJson.scripts["test:artifacts"], "npx tsx --test tests/offline-artifact.test.ts");
  assert.ok(fs.existsSync(path.join(packageRoot, "scripts", "deploy.mjs")));
  assert.ok(fs.existsSync(path.join(packageRoot, "schemas", "docs.schema.json")));
});

test("published JSON Schema is valid JSON and exposes the supported configuration contract", () => {
  const schemaPath = path.join(packageRoot, "schemas", "docs.schema.json");
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.additionalProperties, false);
  assert.ok(schema.properties.$schema);
  assert.ok(schema.properties.source);
  assert.ok(schema.$defs.source);
  assert.deepEqual(schema.$defs.search.properties.maxResults, { type: "integer", minimum: 1, maximum: 100 });
});
