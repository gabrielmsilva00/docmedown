import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { emitAiContextFiles } from "../src/cli/ai-context";
import { validateCommand } from "../src/cli/commands/validate";
import { emitStaticSite, renderStaticPage } from "../src/cli/seo";
import { generateManifest } from "../src/cli/utils/scanner";
import { normalizeConfig } from "../src/runtime/config";
import {
  collectVariants,
  documentVariant,
  localeConfig,
  localizedDocs,
  projectLocales,
  resolveVariant,
} from "../src/runtime/i18n";
import { parseMarkdown } from "../src/runtime/markdown/parser";
import { HashRouter } from "../src/runtime/router";
import { DocSearchIndex } from "../src/runtime/search/search-index";
import { makeTempDir } from "./helpers/temp";

const config = normalizeConfig({
  i18n: { defaultLocale: "en", locales: [{ code: "en" }, { code: "pt-br" }, { code: "fr" }] },
});

test("suffixes normalize configured locales without consuming ordinary dotted names", () => {
  assert.equal(documentVariant("guide.pt-br.md", config).locale, "pt-BR");
  assert.equal(documentVariant("guide.pt-BR.md", config).slug, "guide.pt-br");
  assert.equal(documentVariant("guide.api.md", config).docId, "guide.api");
  assert.equal(documentVariant("README.fr.mdx", config).docId, "README");
  assert.equal(documentVariant("index.fr.md", config).slug, "README.fr");
  assert.equal(documentVariant("guide.en.md", config).slug, "guide");
  assert.equal(projectLocales(normalizeConfig()).length, 1);
});

test("explicit default wins deterministically and equivalent variants fail", () => {
  for (const files of [
    ["guide.md", "guide.en.md"],
    ["guide.en.md", "guide.md"],
  ]) {
    assert.equal(collectVariants(files, config)[0].path, "guide.en.md");
  }
  assert.throws(() => collectVariants(["guide.pt-br.md", "guide.pt-BR.md"], config), /Conflicting/);
  assert.throws(() => normalizeConfig({ i18n: { locales: [{ code: "pt-br" }, { code: "pt-BR" }] } }), /Duplicate/);
  assert.throws(() => normalizeConfig({ i18n: { defaultLocale: "not_a_tag" } }), /language tag/);
});

test("fallback is explicit and respects a non-English original", () => {
  const portuguese = normalizeConfig({ i18n: { defaultLocale: "pt-br", locales: [{ code: "fr" }] } });
  assert.equal(documentVariant("guide.md", portuguese).locale, "pt-BR");
  assert.equal(resolveVariant(["guide.md"], "guide.fr", portuguese)?.path, "guide.md");
  const strict = normalizeConfig({ i18n: { ...portuguese.i18n, fallbackToDefault: false } });
  assert.equal(resolveVariant(["guide.md"], "guide.fr", strict), undefined);
});

test("manifest groups variants, translates views and emits correct static language metadata", () => {
  const dir = makeTempDir("dmd-i18n");
  fs.writeFileSync(path.join(dir, "guide.md"), "# Original");
  fs.writeFileSync(path.join(dir, "guide.en.md"), "# Explicit original");
  fs.writeFileSync(path.join(dir, "guide.pt-br.md"), "---\ntitle: Guia\n---\n# Guia");
  fs.writeFileSync(path.join(dir, "other.md"), "# Other");
  const manifest = generateManifest(dir, config);
  assert.equal(manifest.docs.length, 3);
  assert.equal(manifest.tree.length, 2);
  assert.equal(manifest.docs.find((doc) => doc.slug === "guide")?.path, "guide.en.md");
  const localized = localizedDocs(manifest.docs, "pt-BR", config);
  assert.equal(localized.length, 2);
  assert.equal(localized.find((doc) => doc.slug === "guide.pt-br")?.title, "Guia");
  assert.equal(localized.find((doc) => doc.slug === "other.pt-br")?.locale, "en");
  const html = renderStaticPage({
    config: { ...config, url: "https://example.test" },
    doc: localized[0],
    contentHtml: "<p>Test</p>",
    alternatives: manifest.docs,
  });
  assert.match(html, /hreflang=/);
});

test("relative links inherit locale while explicit links and external URLs are preserved", () => {
  const router = new HashRouter();
  router.i18nConfig = config;
  router.locale = "pt-BR";
  assert.equal(router.resolveLink("../other.md#install", "guides/guide.pt-br"), "#/other.pt-br#install");
  assert.equal(router.resolveLink("guide.fr.md", "guide.pt-br"), "#/guide.fr");
  assert.equal(router.resolveLink("guide.en.md", "guide.pt-br"), "#/guide");
  assert.equal(router.resolveLink("https://example.test", "guide.pt-br"), "https://example.test");
  assert.match(parseMarkdown("[Other](other.md)", "guide.pt-br", config).html, /#\/other.pt-br/);
  router.destroy();
});

test("localized editorial settings inherit defaults and search replaces stale entries", () => {
  const settings = normalizeConfig({
    nav: [{ label: "Guide", href: "#/guide" }],
    i18n: {
      locales: [
        { code: "fr", overrides: { description: "Documentation française", search: { placeholder: "Rechercher" } } },
      ],
    },
  });
  const view = localeConfig(settings, "fr");
  assert.equal(view.description, "Documentation française");
  assert.equal(view.nav?.[0].label, "Guide");
  assert.equal(view.search?.maxResults, 10);
  const index = new DocSearchIndex();
  const doc = { slug: "guide", path: "guide.md", title: "Before", frontmatter: {}, headings: [] };
  index.addDoc(doc);
  index.addDoc({ ...doc, title: "After" });
  assert.equal(index.search("After").length, 1);
  index.clear();
  assert.equal(index.search("After").length, 0);
});

test("static fallback routes retain context, canonicalize originals and AI artifacts are separated", () => {
  const dir = makeTempDir("dmd-i18n-static");
  fs.writeFileSync(path.join(dir, "guide.en.md"), "# Original\n\nOriginal content.");
  fs.writeFileSync(path.join(dir, "guide.fr.md"), "# Français\n\nContenu traduit.");
  const settings = { ...config, url: "https://example.test" };
  const manifest = generateManifest(dir, settings);
  emitStaticSite(
    dir,
    manifest,
    { "guide.en.md": "# Explicit original", guide: "# Incorrect alias", "guide.fr.md": "# Français" },
    settings,
  );
  const original = fs.readFileSync(path.join(dir, "guide/index.html"), "utf-8");
  assert.match(original, /Explicit original/);
  assert.doesNotMatch(original, /Incorrect alias/);
  const fallback = fs.readFileSync(path.join(dir, "guide.pt-br/index.html"), "utf-8");
  assert.match(fallback, /lang="en"/);
  assert.match(fallback, /rel="canonical" href="https:\/\/example.test\/guide\/"/);
  assert.match(fallback, /__DOCMEDOWN_STATIC_SLUG__="guide.pt-br"/);
  emitAiContextFiles(dir, manifest, settings);
  assert.ok(fs.existsSync(path.join(dir, "llms.fr.txt")));
  assert.doesNotMatch(fs.readFileSync(path.join(dir, "llms-full.txt"), "utf-8"), /Contenu traduit/);
});

test("validator warns on implicit/explicit originals and rejects duplicate locale variants", async () => {
  const dir = makeTempDir("dmd-i18n-validation");
  fs.writeFileSync(path.join(dir, "docs.json"), JSON.stringify(config));
  fs.writeFileSync(path.join(dir, "guide.md"), "# Original");
  fs.writeFileSync(path.join(dir, "guide.en.md"), "# Explicit");
  const report = await validateCommand(dir, { json: true });
  assert.ok(report.warnings.some((item) => item.message.includes("Duplicate original")));
  fs.writeFileSync(path.join(dir, "guide.fr.md"), "# Français");
  fs.writeFileSync(path.join(dir, "guide.FR.md"), "# Duplicate");
  // Case-insensitive filesystems collapse these paths; use two Markdown extensions instead.
  fs.writeFileSync(path.join(dir, "guide.fr.mdx"), "# Duplicate");
  const conflict = await validateCommand(dir, { json: true });
  assert.ok(conflict.errors.some((item) => item.message.includes("Conflicting")));
});
