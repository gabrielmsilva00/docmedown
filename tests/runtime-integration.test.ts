import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { loadDocConfig, normalizeConfig, parseDocConfigJson } from "../src/runtime/config";
import { LocalDocLoader } from "../src/runtime/loader/local-loader";

const originalWindow = (globalThis as any).window;
const originalDocument = (globalThis as any).document;
const originalFetch = globalThis.fetch;

afterEach(() => {
  (globalThis as any).window = originalWindow;
  (globalThis as any).document = originalDocument;
  globalThis.fetch = originalFetch;
});

test("normalizeConfig preserves nested defaults while applying integration overrides", () => {
  const config = normalizeConfig({
    name: "Embedded docs",
    theme: { preset: "emerald" },
    search: { enabled: false },
  });

  assert.equal(config.name, "Embedded docs");
  assert.equal(config.theme?.preset, "emerald");
  assert.equal(config.theme?.defaultMode, "auto");
  assert.equal(config.search?.enabled, false);
  assert.equal(config.search?.maxResults, 10);
});

test("configuration schema rejects unknown keys and invalid remote source definitions", () => {
  assert.throws(
    () => normalizeConfig({ name: "Invalid config", unknownOption: true }),
    /Unrecognized key: "unknownOption"/,
  );
  assert.throws(
    () => normalizeConfig({ source: { type: "github", repo: "not-a-repository-slug" } }),
    /source.repo: Use the owner\/repository format/,
  );
  assert.throws(() => parseDocConfigJson('{"name":"Broken"', "docs.json"), /docs.json:/);
});

test("loadDocConfig gives inline host configuration precedence over network files", async () => {
  (globalThis as any).window = {};
  (globalThis as any).document = {
    getElementById: (id: string) => (id === "dmd-config" ? { textContent: '{"name":"Host supplied docs"}' } : null),
  };
  globalThis.fetch = async () => {
    throw new Error("fetch should not be called when inline configuration exists");
  };

  const config = await loadDocConfig("/docs");
  assert.equal(config.name, "Host supplied docs");
});

test("loadDocConfig skips invalid higher-precedence configuration and uses the next valid source", async () => {
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args);

  try {
    (globalThis as any).window = { __DOCMEDOWN_CONFIG__: { name: "", unexpected: true } };
    (globalThis as any).document = {
      getElementById: (id: string) => (id === "dmd-config" ? { textContent: '{"name":"Inline fallback"}' } : null),
    };
    globalThis.fetch = async () => {
      throw new Error("fetch should not be called when the inline fallback is valid");
    };

    const config = await loadDocConfig("/docs");
    assert.equal(config.name, "Inline fallback");
    assert.equal(warnings.length, 1);
    assert.match(String(warnings[0][0]), /Invalid window.__DOCMEDOWN_CONFIG__/);
  } finally {
    console.warn = originalWarn;
  }
});

test("loadDocConfig skips invalid docs.json and accepts a valid dmd.json fallback", async () => {
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  const requestedUrls: string[] = [];
  console.warn = (...args: unknown[]) => warnings.push(args);

  try {
    (globalThis as any).window = {};
    (globalThis as any).document = { getElementById: () => null };
    globalThis.fetch = async (input: string | URL | Request) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.endsWith("docs.json")) {
        return new Response(JSON.stringify({ name: "Broken", search: { maxResults: 0 } }), { status: 200 });
      }
      if (url.endsWith("dmd.json")) {
        return new Response(JSON.stringify({ name: "dmd.json fallback", search: { maxResults: 25 } }), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    };

    const config = await loadDocConfig("/docs");
    assert.equal(config.name, "dmd.json fallback");
    assert.equal(config.search?.maxResults, 25);
    assert.deepEqual(requestedUrls, ["/docs/docs.json", "/docs/dmd.json"]);
    assert.equal(warnings.length, 1);
    assert.match(String(warnings[0][0]), /Ignoring invalid docs.json/);
  } finally {
    console.warn = originalWarn;
  }
});

test("loadDocConfig validates configuration embedded in a manifest", async () => {
  (globalThis as any).window = {};
  (globalThis as any).document = { getElementById: () => null };
  globalThis.fetch = async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith("_manifest.json")) {
      return new Response(JSON.stringify({ config: { name: "Manifest docs", theme: { preset: "violet" } } }), {
        status: 200,
      });
    }
    return new Response("Not found", { status: 404 });
  };

  const config = await loadDocConfig("/docs");
  assert.equal(config.name, "Manifest docs");
  assert.equal(config.theme?.preset, "violet");
  assert.equal(config.theme?.defaultMode, "auto");
});

test("LocalDocLoader reads an embedded offline manifest and document map before fetching", async () => {
  (globalThis as any).window = {
    location: { protocol: "file:" },
    __DOCMEDOWN_DATA__: {
      manifest: { version: "1", generatedAt: "now", config: { name: "Offline docs" }, docs: [], tree: [] },
      docs: { "guides/intro.md": "# Embedded intro" },
    },
  };
  (globalThis as any).document = { getElementById: () => null };
  globalThis.fetch = async () => {
    throw new Error("offline embedded content must not fetch");
  };

  const loader = new LocalDocLoader();
  assert.equal(loader.getEmbeddedManifest()?.config.name, "Offline docs");
  assert.equal(await loader.fetchDocContent("guides/intro"), "# Embedded intro");
  assert.equal(await loader.fetchDocContent("missing"), null);
});

test("Remote-source configuration remains available when a nested site embeds an empty local manifest", async () => {
  (globalThis as any).window = {
    __DOCMEDOWN_CONFIG__: {
      name: "Remote nested site",
      source: { type: "github", repo: "facebook/react", branch: "main", docsDir: "" },
    },
  };
  (globalThis as any).document = { getElementById: () => null };

  const config = await loadDocConfig();
  assert.equal(config.source?.type, "github");
  assert.equal(config.source?.repo, "facebook/react");
});
