import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { buildSync, transformSync } from "esbuild";
import { compileModule } from "svelte/compiler";
import { generateManifest } from "../src/cli/utils/scanner";
import { normalizeConfig } from "../src/runtime/config";
import { makeTempDir } from "./helpers/temp";

test("compiled Svelte store keeps locale routes, physical editor paths, search and HMR isolated", async () => {
  const dir = makeTempDir("dmd-i18n-store");
  const settings = normalizeConfig({ i18n: { locales: [{ code: "pt-BR" }, { code: "fr" }] } });
  fs.writeFileSync(path.join(dir, "guide.en.md"), "# Original\n\nEnglish source.");
  fs.writeFileSync(path.join(dir, "guide.pt-br.md"), "# Guia\n\nPortuguês.");
  fs.writeFileSync(path.join(dir, "other.md"), "# Other");
  const manifest = generateManifest(dir, settings);
  const source = path.resolve(__dirname, "../src/ui/doc-context.svelte.ts");
  const javascript = transformSync(fs.readFileSync(source, "utf-8"), { loader: "ts", target: "es2022" }).code;
  const compiled = compileModule(javascript, { filename: source, generate: "client" });
  const output = path.join(dir, "store.mjs");
  buildSync({
    stdin: { contents: compiled.js.code, resolveDir: path.dirname(source), loader: "ts" },
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: output,
    nodePaths: [path.resolve(__dirname, "../node_modules")],
    define: { __DMD_EXTERNAL_HEAVY__: "true" },
  });
  const originals = {
    Element: (globalThis as any).Element,
    window: (globalThis as any).window,
    document: (globalThis as any).document,
    localStorage: (globalThis as any).localStorage,
  };
  const listeners = new Map<string, () => void>();
  const eventListeners = new Map<string, Set<() => void>>();
  const values = new Map<string, string>();
  (globalThis as any).Element = class {
    matches() {
      return false;
    }
  };
  (globalThis as any).window = {
    __DOCMEDOWN_DATA__: {
      manifest,
      docs: Object.fromEntries(
        manifest.docs.map((item) => [item.path, fs.readFileSync(path.join(dir, item.path), "utf-8")]),
      ),
    },
    location: { protocol: "https:", pathname: "/", hash: "#/guide.pt-br" },
    addEventListener: (name: string, callback: () => void) => {
      if (!eventListeners.has(name)) eventListeners.set(name, new Set());
      eventListeners.get(name)!.add(callback);
      listeners.set(name, () => [...eventListeners.get(name)!].forEach((listener) => listener()));
    },
    removeEventListener: (name: string, callback: () => void) => eventListeners.get(name)?.delete(callback),
    scrollTo: () => {},
    setTimeout: () => 0,
  };
  (globalThis as any).document = { getElementById: () => null };
  (globalThis as any).localStorage = {
    getItem: (key: string) => values.get(key),
    setItem: (key: string, value: string) => values.set(key, value),
    length: 0,
  };
  try {
    const { doc } = await import(pathToFileURL(output).href);
    await doc.init(settings);
    assert.equal(doc.locale, "pt-BR");
    assert.equal(doc.sourcePath, "guide.pt-br.md");
    assert.equal(doc.currentDoc.title, "Guia");
    doc.selectLocale("fr");
    listeners.get("hashchange")?.();
    assert.equal(doc.currentSlug, "guide.fr");
    assert.equal(doc.sourcePath, "guide.en.md");
    assert.equal(doc.contentLocale, "en");
    assert.equal(doc.searchIndex.search("Original")[0].slug, "guide.fr");
    doc.applyHmrUpdate("guide.en", "# Updated original");
    assert.equal(doc.currentDoc.title, "Updated original");
    doc.selectLocale("pt-BR");
    listeners.get("hashchange")?.();
    assert.equal(doc.currentDoc.title, "Guia");
    doc.updateDocContent("# Novo título");
    doc.selectLocale("en");
    listeners.get("hashchange")?.();
    assert.equal(doc.currentDoc.title, "Updated original");
    doc.selectLocale("pt-BR");
    listeners.get("hashchange")?.();
    assert.equal(doc.currentDoc.title, "Novo título");
    doc.navigate("DMD");
    listeners.get("hashchange")?.();
    assert.equal(doc.currentSlug, "DMD.pt-br");
    assert.equal(doc.contentLocale, "pt-BR");
    assert.ok(doc.currentDoc.rawContent.includes("Navegar na documentação"));
    doc.selectLocale("en");
    listeners.get("hashchange")?.();
    assert.equal(doc.currentSlug, "DMD");
    assert.equal(doc.contentLocale, "en");
    doc.navigate("DMD/for-developers");
    listeners.get("hashchange")?.();
    assert.ok(doc.currentDoc.rawContent.includes("DocMeDown for Developers"));
    doc.selectLocale("pt-BR");
    listeners.get("hashchange")?.();
    assert.ok(doc.currentDoc.html.includes("#/DMD.pt-br"));
    doc.destroy();
  } finally {
    Object.assign(globalThis, originals);
  }
});
