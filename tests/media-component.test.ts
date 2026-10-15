import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { inlineMediaSources } from "../src/cli/commands/build";
import {
  detectMediaCategory,
  isDataUri,
  isMediaFile,
  parseDataUri,
  resolveMimeType,
  toLosslessDataUri,
} from "../src/runtime/media";
import { ComponentRegistry } from "../src/ui/registry";
import { makeTempDir } from "./helpers/temp";

const mediaSrc = fs.readFileSync(path.resolve(__dirname, "../src/ui/builtins/Media.svelte"), "utf-8");
const mainCss = fs.readFileSync(path.resolve(__dirname, "../src/runtime/styles/main.css"), "utf-8");

test("Media component contract: custom element tag, styling options, format, and fallback", () => {
  // Custom element tag
  assert.match(mediaSrc, /<svelte:options customElement=\{\{\s*tag:\s*"dmd-media"\s*\}\}\s*\/>/);

  // Adopt shared styles
  assert.match(mediaSrc, /adoptSharedStyles\(root\)/);

  // Styling props declared
  assert.match(mediaSrc, /width\s*=/);
  assert.match(mediaSrc, /height\s*=/);
  assert.match(mediaSrc, /maxWidth|maxwidth/);
  assert.match(mediaSrc, /maxHeight|maxheight/);
  assert.match(mediaSrc, /aspectRatio|aspectratio/);
  assert.match(mediaSrc, /objectFit|fit|objectfit/);
  assert.match(mediaSrc, /align\s*=\s*"center"/);
  assert.match(mediaSrc, /rounded\s*=/);
  assert.match(mediaSrc, /shadow\s*=/);
  assert.match(mediaSrc, /border\s*=/);
  assert.match(mediaSrc, /caption\s*=/);
  assert.match(mediaSrc, /captionAlign|captionalign/);

  // Format & Source props declared
  assert.match(mediaSrc, /src\s*=\s*""/);
  assert.match(mediaSrc, /type\s*=\s*""/);
  assert.match(mediaSrc, /format\s*=\s*""/);
  assert.match(mediaSrc, /fallback\s*=\s*""/);
  assert.match(mediaSrc, /fallbackText|fallbacktext/);
  assert.match(mediaSrc, /poster\s*=\s*""/);

  // Audio/Video player control props declared
  assert.match(mediaSrc, /controls\s*=\s*true/);
  assert.match(mediaSrc, /autoplay\s*=\s*false/);
  assert.match(mediaSrc, /loop\s*=\s*false/);
  assert.match(mediaSrc, /muted\s*=\s*false/);
  assert.match(mediaSrc, /playsinline\s*=\s*true/);

  // Embedding control props
  assert.match(mediaSrc, /embed\s*=\s*""/);
  assert.match(mediaSrc, /zoomable\s*=\s*false/);

  // Check embedded media store lookup for offline bundle compatibility
  assert.match(mediaSrc, /__DOCMEDOWN_DATA__\?\.media/);
  assert.match(mediaSrc, /dmd-media-store/);

  // Error fallback markup and media elements
  assert.match(mediaSrc, /class="dmd-media-fallback"/);
  assert.match(mediaSrc, /<video\b/);
  assert.match(mediaSrc, /<audio\b/);
  assert.match(mediaSrc, /<img\b/);
});

test("Media registry: Media is registered and maps to dmd-media custom element tag", () => {
  const uiIndexSrc = fs.readFileSync(path.resolve(__dirname, "../src/ui/index.ts"), "utf-8");
  assert.match(uiIndexSrc, /import\s+["']\.\/builtins\/Media\.svelte["']/);
  assert.match(uiIndexSrc, /"Media"/);

  const registry = ComponentRegistry.getInstance();
  registry.register("Media", "dmd-media");
  assert.equal(registry.resolveTag("Media"), "dmd-media");
  assert.equal(registry.resolveTag("media"), "dmd-media");
  assert.equal(registry.resolveTag("dmd-media"), "dmd-media");
});

test("CSS rules: dmd-media is included in display:contents and has component classes", () => {
  // Host element display: contents
  assert.match(mainCss, /dmd-media[\s,]/);

  // Styling classes
  assert.match(mainCss, /\.dmd-media\s*\{/);
  assert.match(mainCss, /\.dmd-media-align-center/);
  assert.match(mainCss, /\.dmd-media-align-left/);
  assert.match(mainCss, /\.dmd-media-align-right/);
  assert.match(mainCss, /\.dmd-media-wrapper/);
  assert.match(mainCss, /\.dmd-media-image/);
  assert.match(mainCss, /\.dmd-media-video/);
  assert.match(mainCss, /\.dmd-media-audio/);
  assert.match(mainCss, /\.dmd-media-caption/);
  assert.match(mainCss, /\.dmd-media-fallback/);
});

test("Media utilities: format detection and MIME type resolution across all formats", () => {
  // Raster Images
  assert.equal(resolveMimeType("photo.png"), "image/png");
  assert.equal(resolveMimeType("photo.jpg"), "image/jpeg");
  assert.equal(resolveMimeType("photo.jpeg"), "image/jpeg");
  assert.equal(resolveMimeType("photo.webp"), "image/webp");
  assert.equal(resolveMimeType("anim.gif"), "image/gif");
  assert.equal(resolveMimeType("pic.avif"), "image/avif");
  assert.equal(resolveMimeType("graphic.bmp"), "image/bmp");
  assert.equal(resolveMimeType("favicon.ico"), "image/x-icon");
  assert.equal(resolveMimeType("diagram.tiff"), "image/tiff");
  assert.equal(detectMediaCategory("photo.png"), "image");
  assert.equal(detectMediaCategory("photo.webp"), "image");

  // Vector Graphics (SVG)
  assert.equal(resolveMimeType("logo.svg"), "image/svg+xml");
  assert.equal(detectMediaCategory("logo.svg"), "vector");
  assert.equal(detectMediaCategory("arbitrary-name", "image/svg+xml"), "vector");
  assert.equal(detectMediaCategory("arbitrary-name", "svg"), "vector");

  // Video Formats
  assert.equal(resolveMimeType("clip.mp4"), "video/mp4");
  assert.equal(resolveMimeType("clip.webm"), "video/webm");
  assert.equal(resolveMimeType("clip.ogv"), "video/ogg");
  assert.equal(resolveMimeType("clip.mov"), "video/quicktime");
  assert.equal(detectMediaCategory("clip.mp4"), "video");
  assert.equal(detectMediaCategory("clip.webm"), "video");
  assert.equal(detectMediaCategory("asset", "video/mp4"), "video");

  // Audio Formats
  assert.equal(resolveMimeType("track.mp3"), "audio/mpeg");
  assert.equal(resolveMimeType("sound.wav"), "audio/wav");
  assert.equal(resolveMimeType("sound.ogg"), "audio/ogg");
  assert.equal(resolveMimeType("sound.flac"), "audio/flac");
  assert.equal(resolveMimeType("sound.aac"), "audio/aac");
  assert.equal(resolveMimeType("sound.m4a"), "audio/mp4");
  assert.equal(detectMediaCategory("track.mp3"), "audio");
  assert.equal(detectMediaCategory("sound.wav"), "audio");
  assert.equal(detectMediaCategory("sound.flac"), "audio");
  assert.equal(detectMediaCategory("recording", "audio/mpeg"), "audio");

  // Helper flags
  assert.equal(isMediaFile("doc.pdf"), false);
  assert.equal(isMediaFile("script.ts"), false);
  assert.equal(isMediaFile("image.png"), true);
  assert.equal(isMediaFile("track.flac"), true);
});

test("Media utilities: lossless Data URI encoding and decoding preserves exact bytes", () => {
  // Test binary fidelity with random byte sequence
  const originalBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0xaa, 0x55]);
  const dataUri = toLosslessDataUri(originalBytes, "image/png");

  assert.ok(isDataUri(dataUri));
  assert.ok(dataUri.startsWith("data:image/png;base64,"));

  const parsed = parseDataUri(dataUri);
  assert.ok(parsed);
  assert.equal(parsed.mimeType, "image/png");
  assert.equal(parsed.isBase64, true);

  const decodedBytes = Buffer.from(parsed.data, "base64");
  assert.deepEqual(Uint8Array.from(decodedBytes), originalBytes);
});

test("inlineMediaSources: inlines <Media> raster, vector, video, and audio assets losslessly for offline compilation", async () => {
  const tempDir = makeTempDir("dmd-media-test-");
  try {
    const assetsDir = path.join(tempDir, "assets");
    fs.mkdirSync(assetsDir, { recursive: true });

    // 1. Create sample test files
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG header
    fs.writeFileSync(path.join(assetsDir, "logo.png"), pngBytes);

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>`;
    fs.writeFileSync(path.join(assetsDir, "icon.svg"), svgContent, "utf-8");

    const mp4Bytes = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]); // MP4 ftyp header
    fs.writeFileSync(path.join(assetsDir, "intro.mp4"), mp4Bytes);

    const mp3Bytes = Buffer.from([0xff, 0xfb, 0x90, 0x64]); // MP3 syncword
    fs.writeFileSync(path.join(assetsDir, "chime.mp3"), mp3Bytes);

    const fallbackBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG SOI
    fs.writeFileSync(path.join(assetsDir, "backup.jpg"), fallbackBytes);

    const docsMap: Record<string, string> = {
      README: `# Media Showcase

<Media
  src="./assets/logo.png"
  alt="Company Logo"
  width="240px"
  rounded="md"
  shadow="sm"
/>

<Media
  src="./assets/icon.svg"
  format="svg"
  width="48px"
  caption="Vector Icon"
/>

<Media
  src="./assets/intro.mp4"
  type="video/mp4"
  fallback="./assets/backup.jpg"
  controls={true}
  width="100%"
/>

<Media
  src="./assets/chime.mp3"
  format="audio/mpeg"
  controls
/>

<!-- Standard Markdown image -->
![Markdown Inlined](./assets/logo.png)

<!-- Explicitly non-embedded remote or external asset -->
<Media src="https://example.com/live.png" embed="none" />
`,
    };

    const { inlinedCount, mediaMap } = await inlineMediaSources(docsMap, tempDir);

    // Verify inlining counts and map entries
    assert.equal(inlinedCount, 5); // logo.png, icon.svg, intro.mp4, chime.mp3, backup.jpg
    assert.ok(mediaMap["./assets/logo.png"]?.startsWith("data:image/png;base64,"));
    assert.ok(mediaMap["./assets/icon.svg"]?.startsWith("data:image/svg+xml;base64,"));
    assert.ok(mediaMap["./assets/intro.mp4"]?.startsWith("data:video/mp4;base64,"));
    assert.ok(mediaMap["./assets/chime.mp3"]?.startsWith("data:audio/mpeg;base64,"));
    assert.ok(mediaMap["./assets/backup.jpg"]?.startsWith("data:image/jpeg;base64,"));

    // Verify doc content attributes were rewritten with lossless data URIs
    const updatedDoc = docsMap.README;
    assert.ok(updatedDoc.includes('src="data:image/png;base64,'));
    assert.ok(updatedDoc.includes('src="data:image/svg+xml;base64,'));
    assert.ok(updatedDoc.includes('src="data:video/mp4;base64,'));
    assert.ok(updatedDoc.includes('fallback="data:image/jpeg;base64,'));
    assert.ok(updatedDoc.includes('src="data:audio/mpeg;base64,'));
    assert.ok(updatedDoc.includes("![Markdown Inlined](data:image/png;base64,"));

    // Verify embed="none" retained original URL
    assert.ok(updatedDoc.includes('src="https://example.com/live.png"'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
