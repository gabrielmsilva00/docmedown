import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const packageRoot = path.resolve(__dirname, "..");

function readArtifact(...segments: string[]): string {
  return fs.readFileSync(path.join(packageRoot, ...segments), "utf-8");
}

test("serveable and single-file artifacts keep custom components, Mermaid, and typography self-contained", () => {
  const serveableRuntime = readArtifact("docs", "docmedown.iife.js");
  const offlineHtml = readArtifact("docs", ".dist", "index.html");
  const onlineHtml = readArtifact("docs", "index.html");
  const embeddedDocs = readArtifact("docs", "_docs.js");

  assert.ok(serveableRuntime.includes("mermaid"));
  assert.ok(!serveableRuntime.includes('import("./'));
  assert.ok(!offlineHtml.includes("cdn.jsdelivr.net/npm/mermaid"));
  assert.ok(!offlineHtml.includes("fonts.googleapis.com"));
  assert.ok(!onlineHtml.includes("fonts.googleapis.com"));
  assert.ok(embeddedDocs.includes("InteractiveThemeDemo"));
  assert.ok(!embeddedDocs.includes('from "./'));
  assert.ok(offlineHtml.includes("componentsSource"));
  assert.ok(serveableRuntime.includes("__DOCMEDOWN_COMPONENTS_READY__"));
});

test("nested offline artifacts embed their own bundled custom components", () => {
  const offlineHtml = readArtifact("docs", "examples", "local-docs", ".dist", "index.html");
  const embeddedDocs = readArtifact("docs", "examples", "local-docs", "_docs.js");

  assert.ok(embeddedDocs.includes("OrbitCounter"));
  assert.ok(offlineHtml.includes("componentsSource"));
  assert.ok(!offlineHtml.includes("fonts.googleapis.com"));
});
