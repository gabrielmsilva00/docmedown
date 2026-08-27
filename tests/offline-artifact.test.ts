import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { gunzipSync } from "node:zlib";

const packageRoot = path.resolve(__dirname, "..");

function readArtifact(...segments: string[]): string {
  return fs.readFileSync(path.join(packageRoot, ...segments), "utf-8");
}

function decodeOfflineArtifact(html: string) {
  const encoded = html.match(/<script id="d" type="application\/octet-stream">([^<]+)<\/script>/)?.[1];
  assert.ok(encoded, "offline artifact should contain a compressed payload");
  return JSON.parse(gunzipSync(Buffer.from(encoded, "base64")).toString("utf-8"));
}

test("serveable and single-file artifacts keep custom components, Mermaid, and typography self-contained", () => {
  const serveableRuntime = readArtifact("docs", "docmedown.iife.js");
  const offlineHtml = readArtifact("docs", ".dist", "index.html");
  const onlineHtml = readArtifact("docs", "index.html");
  const embeddedDocs = readArtifact("docs", "_docs.js");
  const offlineEnvelope = decodeOfflineArtifact(offlineHtml);

  assert.ok(serveableRuntime.includes("mermaid"));
  assert.ok(!serveableRuntime.includes('import("./'));
  assert.ok(!offlineEnvelope.runtime.includes("cdn.jsdelivr.net/npm/mermaid"));
  assert.ok(!offlineHtml.includes("fonts.googleapis.com"));
  assert.ok(!onlineHtml.includes("fonts.googleapis.com"));
  assert.ok(embeddedDocs.includes("InteractiveThemeDemo"));
  assert.ok(embeddedDocs.includes("Live appearance state"));
  assert.ok(embeddedDocs.includes("data-dmd-theme"));
  assert.ok(!embeddedDocs.includes("data-preset"));
  assert.ok(!embeddedDocs.includes('from "./'));
  assert.ok(offlineEnvelope.data.componentsSource.includes("InteractiveThemeDemo"));
  assert.equal(offlineEnvelope.version, 1);
  assert.ok(offlineHtml.includes('new DecompressionStream("gzip")'));
  assert.ok(offlineHtml.includes("window.__DOCMEDOWN_OFFLINE__=true"));
  assert.ok(serveableRuntime.includes("This page is already a self-contained offline documentation copy."));
  assert.ok(onlineHtml.includes("data-docmedown-runtime"));
  assert.ok(serveableRuntime.includes("__DOCMEDOWN_COMPONENTS_READY__"));
  assert.ok(serveableRuntime.includes("dmd-diagram-host"));
  assert.ok(serveableRuntime.includes("data-dmd-diagram"));
  assert.ok(serveableRuntime.includes("viewBox"));
  assert.ok(serveableRuntime.includes("Copy graph Markdown"));
  assert.ok(serveableRuntime.includes("dmd-diagram-subgraph-copy"));
  assert.ok(!serveableRuntime.includes("dmd-diagram-node-copy"));
  assert.ok(serveableRuntime.includes("Clipboard access is unavailable"));
});

test("nested offline artifacts embed their own bundled custom components", () => {
  const offlineHtml = readArtifact("docs", "examples", "local-docs", ".dist", "index.html");
  const embeddedDocs = readArtifact("docs", "examples", "local-docs", "_docs.js");
  const offlineEnvelope = decodeOfflineArtifact(offlineHtml);

  assert.ok(embeddedDocs.includes("OrbitCounter"));
  assert.ok(offlineEnvelope.data.componentsSource.includes("OrbitCounter"));
  assert.ok(!offlineHtml.includes("fonts.googleapis.com"));
});
