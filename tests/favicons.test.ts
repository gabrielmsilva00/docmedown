import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { resolveFaviconForOffline } from "../src/cli/commands/build";
import {
  DEFAULT_FAVICON_DATA_URI,
  DEFAULT_FAVICON_PRESET,
  FAVICON_DATA_URIS,
  FAVICON_PRESET_NAMES,
  FAVICON_SVGS,
  isFaviconPreset,
  resolveFavicon,
  svgToDataUri,
} from "../src/runtime/favicons";
import { createCompressedOfflineHtml } from "../src/runtime/offline-export";

test("Favicon presets are well-formed 32x32 SVGs with base64 data URIs", () => {
  assert.equal(DEFAULT_FAVICON_PRESET, "default");
  assert.deepEqual(FAVICON_PRESET_NAMES, ["default", "markdown", "terminal", "book", "minimal"]);

  for (const name of FAVICON_PRESET_NAMES) {
    const svg = FAVICON_SVGS[name];
    assert.ok(svg.startsWith("<svg"), `preset ${name} must start with <svg`);
    assert.ok(svg.includes('viewBox="0 0 32 32"'), `preset ${name} must declare 32x32 viewBox`);
    assert.ok(svg.endsWith("</svg>"), `preset ${name} must close </svg>`);

    const dataUri = FAVICON_DATA_URIS[name];
    assert.ok(dataUri.startsWith("data:image/svg+xml;base64,"), `preset ${name} data URI must be base64-encoded SVG`);

    // Verify round-trip decoding
    const base64Part = dataUri.replace("data:image/svg+xml;base64,", "");
    const decoded = Buffer.from(base64Part, "base64").toString("utf-8");
    assert.ok(decoded.includes("<svg"), `decoded ${name} must contain SVG markup`);
  }

  assert.ok(svgToDataUri("<svg></svg>").startsWith("data:image/svg+xml;base64,"));
  assert.equal(DEFAULT_FAVICON_DATA_URI, FAVICON_DATA_URIS.default);
});

test("isFaviconPreset validates known preset names", () => {
  assert.equal(isFaviconPreset("default"), true);
  assert.equal(isFaviconPreset("markdown"), true);
  assert.equal(isFaviconPreset("terminal"), true);
  assert.equal(isFaviconPreset("book"), true);
  assert.equal(isFaviconPreset("minimal"), true);

  assert.equal(isFaviconPreset("custom"), false);
  assert.equal(isFaviconPreset(""), false);
  assert.equal(isFaviconPreset(null), false);
  assert.equal(isFaviconPreset(undefined), false);
  assert.equal(isFaviconPreset("./assets/fav.ico"), false);
});

test("resolveFavicon maps presets to data URIs and preserves custom links", () => {
  // Empty / missing / data:, fallbacks to default
  assert.equal(resolveFavicon(undefined), DEFAULT_FAVICON_DATA_URI);
  assert.equal(resolveFavicon(null), DEFAULT_FAVICON_DATA_URI);
  assert.equal(resolveFavicon(""), DEFAULT_FAVICON_DATA_URI);
  assert.equal(resolveFavicon("data:,"), DEFAULT_FAVICON_DATA_URI);

  // Preset names resolve to base64 data URIs
  assert.equal(resolveFavicon("default"), FAVICON_DATA_URIS.default);
  assert.equal(resolveFavicon("markdown"), FAVICON_DATA_URIS.markdown);
  assert.equal(resolveFavicon("terminal"), FAVICON_DATA_URIS.terminal);
  assert.equal(resolveFavicon("book"), FAVICON_DATA_URIS.book);
  assert.equal(resolveFavicon("minimal"), FAVICON_DATA_URIS.minimal);

  // Custom paths or URLs are preserved
  assert.equal(resolveFavicon("./assets/logo.svg"), "./assets/logo.svg");
  assert.equal(resolveFavicon("https://example.com/favicon.ico"), "https://example.com/favicon.ico");
  assert.equal(resolveFavicon("data:image/png;base64,abc"), "data:image/png;base64,abc");
});

test("resolveFaviconForOffline inlines local image assets into self-contained base64 data URIs", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-fav-test-"));
  try {
    const customSvgPath = path.join(tmpDir, "custom.svg");
    fs.writeFileSync(customSvgPath, '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>', "utf-8");

    const customPngPath = path.join(tmpDir, "logo.png");
    fs.writeFileSync(customPngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    // Inlines local SVG
    const resolvedSvg = resolveFaviconForOffline("custom.svg", tmpDir);
    assert.ok(resolvedSvg.startsWith("data:image/svg+xml;base64,"));
    const decodedSvg = Buffer.from(resolvedSvg.replace("data:image/svg+xml;base64,", ""), "base64").toString("utf-8");
    assert.ok(decodedSvg.includes("<circle r="));

    // Inlines local PNG
    const resolvedPng = resolveFaviconForOffline("./logo.png", tmpDir);
    assert.ok(resolvedPng.startsWith("data:image/png;base64,"));

    // Presets still resolve to preset data URIs
    const resolvedTerminal = resolveFaviconForOffline("terminal", tmpDir);
    assert.equal(resolvedTerminal, FAVICON_DATA_URIS.terminal);

    // Fallbacks to default if file not found
    const missing = resolveFaviconForOffline("missing.svg", tmpDir);
    assert.equal(missing, "missing.svg");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("createCompressedOfflineHtml embeds the favicon inside index.html", () => {
  const mockGzip = Buffer.from("test").toString("base64");

  // Default favicon is embedded
  const defaultHtml = createCompressedOfflineHtml(mockGzip, "Test Offline");
  assert.ok(defaultHtml.includes(`<link rel="icon" type="image/svg+xml" href="${DEFAULT_FAVICON_DATA_URI}">`));
  assert.ok(!defaultHtml.includes('href="data:,"'));

  // Custom preset is embedded
  const bookHtml = createCompressedOfflineHtml(mockGzip, "Book Offline", {}, "book");
  assert.ok(bookHtml.includes(`<link rel="icon" type="image/svg+xml" href="${FAVICON_DATA_URIS.book}">`));

  // PNG data URI is embedded with appropriate type
  const pngDataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
  const pngHtml = createCompressedOfflineHtml(mockGzip, "PNG Offline", {}, pngDataUri);
  assert.ok(pngHtml.includes(`<link rel="icon" type="image/png" href="${pngDataUri}">`));
});
