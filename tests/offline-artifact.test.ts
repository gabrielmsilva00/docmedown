import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { gunzipSync } from "node:zlib";
import { buildCommand } from "../src/cli/commands/build";
import { isRelativeHtmlLink, matchEmbeddedNestedSite } from "../src/runtime/offline-export";

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
  const serveableRuntime = readArtifact("docs", "docmedown.web.js");
  const mermaidEngine = readArtifact("docs", "docmedown-mermaid.js");
  const offlineHtml = readArtifact("docs", ".dist", "index.html");
  const onlineHtml = readArtifact("docs", "index.html");
  const embeddedDocs = readArtifact("docs", "_docs.js");
  const offlineEnvelope = decodeOfflineArtifact(offlineHtml);

  // The served runtime defers Mermaid to an on-demand classic script so pages
  // without a diagram never download it; the offline copy inlines it instead.
  assert.ok(mermaidEngine.includes("mermaid"));
  assert.ok(serveableRuntime.includes("docmedown-mermaid.js"));
  assert.ok(offlineEnvelope.runtime.includes("mermaid"));
  assert.ok(!serveableRuntime.includes('import("./'));
  assert.ok(!offlineEnvelope.runtime.includes("cdn.jsdelivr.net/npm/mermaid"));
  assert.ok(!offlineHtml.includes("fonts.googleapis.com"));
  assert.ok(!onlineHtml.includes("fonts.googleapis.com"));
  // Served and offline shells both open on the inline branded splash.
  assert.ok(offlineHtml.includes('id="dmd-splash"'));
  assert.ok(onlineHtml.includes('id="dmd-splash"'));
  // The offline shell no longer ships a plain "Opening…" placeholder.
  assert.ok(!offlineHtml.includes("Opening offline documentation"));
  assert.ok(embeddedDocs.includes("InteractiveThemeDemo"));
  assert.ok(embeddedDocs.includes("Live appearance state"));
  assert.ok(embeddedDocs.includes("data-dmd-theme"));
  assert.ok(!embeddedDocs.includes("data-preset"));
  assert.ok(!embeddedDocs.includes('from "./'));
  assert.ok(offlineEnvelope.data.componentsSource.includes("InteractiveThemeDemo"));
  assert.equal(offlineEnvelope.version, 2);
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
  // Offline copies without diagrams omit Mermaid, shrinking from 1.8 MB to ~570 KB.
  assert.ok(
    offlineHtml.length < 700 * 1024,
    `offline html size ${(offlineHtml.length / 1024) | 0} KB should be under 700 KB`,
  );
  assert.ok(
    !offlineEnvelope.runtime.includes("sequenceDiagram"),
    "offline runtime must not inline Mermaid when no diagrams exist",
  );
});

test("the root offline bundle embeds nested documentation sites for self-contained navigation", () => {
  const offlineHtml = readArtifact("docs", ".dist", "index.html");
  const offlineEnvelope = decodeOfflineArtifact(offlineHtml);
  const nested = offlineEnvelope.data.nestedSites;

  assert.ok(nested, "root offline bundles embed nested sites by default");
  assert.ok(nested["examples/local-docs"], "nested sites are keyed by their relative folder");
  assert.equal(nested["examples/local-docs"].manifest.config.name, "Orbit Notes");
  assert.ok(nested["examples/local-docs"].docs.README);
  assert.ok(nested["examples/local-docs"].componentsSource?.includes("OrbitCounter"));
  assert.ok(offlineHtml.includes("__DOCMEDOWN_RUNTIME_URL__"));
});

test("offline link helpers classify file links and embedded nested targets", () => {
  assert.equal(isRelativeHtmlLink("examples/local-docs/index.html"), true);
  assert.equal(isRelativeHtmlLink("./guides/extra.html"), true);
  assert.equal(isRelativeHtmlLink("#/guides/extra"), false);
  assert.equal(isRelativeHtmlLink("https://example.com/page.html"), false);
  assert.equal(isRelativeHtmlLink("mailto:someone@example.com"), false);

  const sites = { "examples/local-docs": { name: "Orbit Notes", manifest: {}, docs: {} } };
  assert.equal(matchEmbeddedNestedSite("examples/local-docs/index.html", sites), "examples/local-docs");
  assert.equal(matchEmbeddedNestedSite("./examples/local-docs/", sites), "examples/local-docs");
  assert.equal(matchEmbeddedNestedSite("examples/local-docs/index.html#/README", sites), "examples/local-docs");
  assert.equal(matchEmbeddedNestedSite("missing/index.html", sites), null);
  assert.equal(matchEmbeddedNestedSite("examples/local-docs/index.html", null), null);
});

test("offline.embedNestedDocs: false keeps the single-file bundle free of nested sites", async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "docmedown-offline-"));
  try {
    fs.writeFileSync(
      path.join(workspace, "docs.json"),
      JSON.stringify({ name: "Tiny Docs", offline: { embedNestedDocs: false } }),
      "utf-8",
    );
    fs.writeFileSync(path.join(workspace, "README.md"), "# Tiny Docs\n\nStandalone copy.", "utf-8");
    fs.mkdirSync(path.join(workspace, "sub"));
    fs.writeFileSync(path.join(workspace, "sub", "docs.json"), JSON.stringify({ name: "Sub Docs" }), "utf-8");
    fs.writeFileSync(path.join(workspace, "sub", "note.md"), "# Sub note", "utf-8");

    await buildCommand(workspace);

    const rootOfflineHtml = fs.readFileSync(path.join(workspace, ".dist", "index.html"), "utf-8");
    const rootEnvelope = decodeOfflineArtifact(rootOfflineHtml);
    assert.equal(rootEnvelope.data.nestedSites, undefined);
    assert.ok(fs.existsSync(path.join(workspace, "sub", ".dist", "index.html")));
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
