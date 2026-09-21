import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { LocalDocLoader } from "../src/runtime/loader/local-loader";

const originalWindow = (globalThis as any).window;
const originalDocument = (globalThis as any).document;
const originalFetch = globalThis.fetch;

afterEach(() => {
  (globalThis as any).window = originalWindow;
  (globalThis as any).document = originalDocument;
  globalThis.fetch = originalFetch;
});

/** Installs a page whose entire corpus is embedded (the static/offline shape). */
function installEmbeddedCorpus(docs: Record<string, string>): void {
  (globalThis as any).window = {
    location: { protocol: "https:" },
    __DOCMEDOWN_DATA__: {
      manifest: { version: "1", generatedAt: "now", config: { name: "Test" }, docs: [], tree: [] },
      docs,
    },
  };
  (globalThis as any).document = { getElementById: () => null };
}

test("LocalDocLoader caching, synchronous embedded document peek, and HTTP cache warming", async () => {
  // Synchronous peek for embedded documents and miss handling
  installEmbeddedCorpus({ "guides/intro.md": "# Intro", "README.md": "# Home" });
  const loader = new LocalDocLoader();

  assert.equal(loader.peekDocContent("guides/intro"), "# Intro");
  assert.equal(loader.peekDocContent("guides/intro.md"), "# Intro");
  assert.equal(loader.peekDocContent("README"), "# Home");
  assert.equal(loader.peekDocContent("not-embedded"), undefined);

  // Corpus exposition for warming parse cache
  assert.deepEqual(loader.embeddedDocSources(), { "guides/intro": "# Intro", README: "# Home" });

  // HTTP fetching and caching on revisit
  (globalThis as any).window = { location: { protocol: "https:" } };
  (globalThis as any).document = { getElementById: () => null };

  let calls = 0;
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls += 1;
    return String(input).endsWith("guide.md")
      ? new Response("# Guide", { status: 200 })
      : new Response("Not found", { status: 404 });
  }) as typeof fetch;

  const httpLoader = new LocalDocLoader();
  assert.equal(httpLoader.peekDocContent("guide"), undefined);

  assert.equal(await httpLoader.fetchDocContent("guide"), "# Guide");
  assert.equal(calls, 1);

  // Revisiting the page needs no request and no await
  assert.equal(httpLoader.peekDocContent("guide"), "# Guide");
  assert.equal(calls, 1);
});
