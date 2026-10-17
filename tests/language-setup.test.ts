import assert from "node:assert/strict";
import { test } from "node:test";
import prompts from "prompts";
import { setupLanguages } from "../src/cli/utils/language-setup";
import { BUILTIN_LOCALES } from "../src/runtime/i18n";

test("unattended creation defaults to all six presets with English originals", async () => {
  const result = await setupLanguages({}, false);
  assert.deepEqual(result?.languageEntries, BUILTIN_LOCALES);
  assert.equal(result?.defaultLocale, "en");
});

test("explicit CLI languages remain deterministic and canonical", async () => {
  const result = await setupLanguages({ defaultLocale: "pt-br", locales: "en,ja,pt-BR" }, false);
  assert.deepEqual(result?.locales, ["pt-BR", "en", "ja"]);
});

test("interactive setup preserves manual names and suffixes", async () => {
  prompts.inject([["en", "es"], true, "日本語", "ja", false, "es"]);
  const result = await setupLanguages({}, true);
  assert.equal(result?.defaultLocale, "es");
  assert.deepEqual(
    result?.languageEntries.find((item) => item.code === "ja"),
    { code: "ja", label: "日本語" },
  );
});

test("cancellation does not yield a partial configuration", async () => {
  prompts.inject([undefined]);
  assert.equal(await setupLanguages({}, true), undefined);
});
