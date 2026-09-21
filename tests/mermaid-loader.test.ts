import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  configureMermaidEngine,
  loadExternalMermaidEngine,
  loadMermaidEngine,
  type MermaidEngine,
} from "../src/runtime/markdown/mermaid-loader";

const MERMAID_GLOBAL = "__DOCMEDOWN_MERMAID__";

const originalDocument = (globalThis as any).document;
const originalMermaid = (globalThis as any)[MERMAID_GLOBAL];

interface FakeScript {
  src: string;
  async: boolean;
  dataset: Record<string, string>;
  addEventListener(type: string, cb: () => void): void;
  fire(type: string): void;
}

function createFakeScript(): FakeScript {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    src: "",
    async: false,
    dataset: {},
    addEventListener(type, cb) {
      const existing = listeners[type];
      if (existing) existing.push(cb);
      else listeners[type] = [cb];
    },
    fire(type) {
      for (const cb of listeners[type] ?? []) cb();
    },
  };
}

/** Minimal document stub: records created scripts and serves them back to querySelector. */
function installFakeDocument(): { created: FakeScript[]; appended: FakeScript[] } {
  const created: FakeScript[] = [];
  const appended: FakeScript[] = [];
  const fakeDocument = {
    createElement() {
      const script = createFakeScript();
      created.push(script);
      return script;
    },
    querySelector() {
      return appended.length > 0 ? appended[appended.length - 1] : null;
    },
    head: {
      appendChild(node: FakeScript) {
        appended.push(node);
      },
    },
  };
  (globalThis as any).document = fakeDocument;
  return { created, appended };
}

function fakeEngine(): MermaidEngine {
  return {
    initialize() {},
    parse: async () => ({}),
    render: async () => ({ svg: "<svg/>" }),
  };
}

afterEach(() => {
  (globalThis as any).document = originalDocument;
  if (originalMermaid === undefined) delete (globalThis as any)[MERMAID_GLOBAL];
  else (globalThis as any)[MERMAID_GLOBAL] = originalMermaid;
});

test("the served loader injects docmedown-mermaid.js relative to the doc base", async () => {
  const { created, appended } = installFakeDocument();
  configureMermaidEngine("../");

  const pending = loadExternalMermaidEngine();

  assert.equal(created.length, 1);
  assert.equal(created[0].src, "../docmedown-mermaid.js");
  assert.equal(created[0].dataset.dmdEngine, "mermaid");

  const engine = fakeEngine();
  (globalThis as any)[MERMAID_GLOBAL] = engine;
  appended[0].fire("load");

  assert.equal(await pending, engine);
});

test("the served loader rejects with a clear error when the engine script fails", async () => {
  const { appended } = installFakeDocument();
  configureMermaidEngine("");

  const pending = loadExternalMermaidEngine();
  appended[0].fire("error");

  await assert.rejects(pending, /could not load docmedown-mermaid\.js/);
});

test("a preloaded engine global short-circuits without any network request", async () => {
  const { created } = installFakeDocument();
  const engine = fakeEngine();
  (globalThis as any)[MERMAID_GLOBAL] = engine;

  assert.equal(await loadMermaidEngine(), engine);
  assert.equal(created.length, 0);
});

test("the loader reports a clear error outside a browser", async () => {
  (globalThis as any).document = undefined;
  configureMermaidEngine("");

  await assert.rejects(loadExternalMermaidEngine(), /can only be loaded in a browser/);
});
