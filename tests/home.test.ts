import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { normalizeConfig } from "../src/runtime/config";
import { findOriginalDocumentationHome, type MinimalFetch, resolveDocumentationHome } from "../src/runtime/home";

const packageRoot = path.resolve(__dirname, "..");

test("home prefers explicit configuration before automatic candidates", () => {
  const docs = [
    { slug: "README", path: "README.md" },
    { slug: "PROJECT", path: "PROJECT.md" },
    { slug: "intro", path: "guides/intro.md" },
  ];

  assert.deepEqual(resolveDocumentationHome(docs, { home: "PROJECT.md" }), { kind: "route", slug: "PROJECT" });
  assert.deepEqual(resolveDocumentationHome(docs, { home: "guides/intro" }), { kind: "route", slug: "intro" });
});

test("home resolves root candidates case-sensitively first, then case-insensitively", () => {
  // A case-sensitive hit for a later candidate still beats a case-insensitive
  // hit for an earlier candidate.
  assert.equal(resolveDocumentationHome([{ path: "readme.md" }, { path: "PROJECT.md" }], null)?.slug, "PROJECT");
  assert.equal(resolveDocumentationHome([{ path: "readme.md" }, { path: "ABOUT.md" }], null)?.slug, "ABOUT");
  assert.equal(resolveDocumentationHome([{ slug: "README", path: "Index.md" }], null)?.slug, "README");
  assert.equal(resolveDocumentationHome([{ path: "project.MD" }, { path: "about.md" }], null)?.slug, "project");
});

test("home falls back to the alphabetically first document when no candidates match", () => {
  const docs = [
    { slug: "zulu", path: "zulu.md" },
    { slug: "guides/README", path: "guides/README.md" },
    { slug: "alpha", path: "alpha.md" },
  ];

  assert.equal(resolveDocumentationHome(docs, null)?.slug, "alpha");
  // Root candidates never match nested files; the fallback sorts by path and
  // routes by each document's canonical slug.
  const withoutRoot = [
    { slug: "guides/README", path: "guides/README.md" },
    { slug: "intro", path: "docs/intro.md" },
  ];
  assert.equal(resolveDocumentationHome(withoutRoot, null)?.slug, "intro");
});

test("home treats unmatched settings as links only when they look like links", () => {
  const docs = [{ slug: "README", path: "README.md" }];

  // Typo'd document names fall back to the automatic defaults.
  assert.equal(resolveDocumentationHome(docs, { home: "Projct.md" })?.slug, "README");
  // Nested roots may escape to their original documentation site explicitly.
  assert.deepEqual(resolveDocumentationHome(docs, { home: "../../index.html#/" }), {
    kind: "href",
    href: "../../index.html#/",
  });
});

test("home returns null for an empty corpus", () => {
  assert.equal(resolveDocumentationHome([], null), null);
  assert.equal(resolveDocumentationHome(undefined, null), null);
});

test("configuration accepts and validates a home setting", () => {
  assert.equal(normalizeConfig({ name: "Docs", home: "PROJECT.md" }).home, "PROJECT.md");
  assert.throws(() => normalizeConfig({ home: "" }), /home/);
});

test("home schema, portable JSON Schema, and documentation stay aligned", () => {
  const schema = JSON.parse(fs.readFileSync(path.join(packageRoot, "schemas", "docs.schema.json"), "utf-8"));
  assert.equal(schema.properties.home.type, "string");

  const guide = fs.readFileSync(path.join(packageRoot, "docs", "configuration.md"), "utf-8");
  assert.match(guide, /"home"/);
  assert.match(guide, /INDEX\.md/);
});

test("original home probe finds the nearest enclosing documentation manifest", async () => {
  const calls: string[] = [];
  const fetchLike: MinimalFetch = async (input) => {
    calls.push(input);
    if (input === "../../_manifest.json") {
      return {
        ok: true,
        json: async () => ({
          docs: [
            { slug: "README", path: "README.md" },
            { slug: "intro", path: "intro.md" },
          ],
          config: {},
        }),
      };
    }
    return { ok: false, json: async () => ({}) };
  };

  assert.deepEqual(await findOriginalDocumentationHome(fetchLike), {
    kind: "href",
    href: "../../index.html#/README",
    via: "ancestor",
  });
  assert.deepEqual(calls, ["../_manifest.json", "../../_manifest.json"]);
});

test("original home probe ignores HTML fallbacks and empty manifests", async () => {
  const htmlFallback: MinimalFetch = async () => ({
    ok: true,
    json: async () => {
      throw new Error("Unexpected token '<'");
    },
  });
  assert.equal(await findOriginalDocumentationHome(htmlFallback, { levels: 2 }), null);

  const emptyManifest: MinimalFetch = async () => ({ ok: true, json: async () => ({ docs: [] }) });
  assert.equal(await findOriginalDocumentationHome(emptyManifest, { levels: 2 }), null);
});
