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

test("peekDocContent resolves embedded documents synchronously", () => {
  installEmbeddedCorpus({ "guides/intro.md": "# Intro", "README.md": "# Home" });
  const loader = new LocalDocLoader();

  assert.equal(loader.peekDocContent("guides/intro"), "# Intro");
  assert.equal(loader.peekDocContent("guides/intro.md"), "# Intro");
  assert.equal(loader.peekDocContent("README"), "# Home");
});

test("peekDocContent reports a miss when a network fetch is still required", () => {
  installEmbeddedCorpus({ "README.md": "# Home" });
  const loader = new LocalDocLoader();

  assert.equal(loader.peekDocContent("not-embedded"), undefined);
});

test("a document fetched over HTTP is cached, so the next visit is synchronous", async () => {
  (globalThis as any).window = { location: { protocol: "https:" } };
  (globalThis as any).document = { getElementById: () => null };

  let calls = 0;
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls += 1;
    return String(input).endsWith("guide.md")
      ? new Response("# Guide", { status: 200 })
      : new Response("Not found", { status: 404 });
  }) as typeof fetch;

  const loader = new LocalDocLoader();
  assert.equal(loader.peekDocContent("guide"), undefined);

  assert.equal(await loader.fetchDocContent("guide"), "# Guide");
  assert.equal(calls, 1);

  // Revisiting the page needs no request and no await.
  assert.equal(loader.peekDocContent("guide"), "# Guide");
  assert.equal(calls, 1);
});

test("embeddedDocSources exposes the corpus so the parse cache can be warmed", () => {
  installEmbeddedCorpus({ "a.md": "A", "b.md": "B" });
  const loader = new LocalDocLoader();

  assert.deepEqual(loader.embeddedDocSources(), { a: "A", b: "B" });
});
