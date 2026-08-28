import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { normalizeConfig } from "../src/runtime/config";
import { docConfigSchema, docThemeConfigSchema } from "../src/runtime/config-schema";

const packageRoot = path.resolve(__dirname, "..");

test("legacy accent presets resolve to their designated theme families", () => {
  const mappings: Array<[string, string]> = [
    ["indigo", "atlas"],
    ["emerald", "atlas"],
    ["violet", "atlas"],
    ["slate", "blueprint"],
    ["cyberpunk", "terminal"],
    ["sunset", "editorial"],
    ["rose", "editorial"],
  ];

  for (const [preset, expectedFamily] of mappings) {
    const config = normalizeConfig({ theme: { preset } });
    assert.equal(config.theme?.family, expectedFamily, `preset "${preset}" should map to "${expectedFamily}"`);
    // The deprecated field must never leak into effective runtime config.
    assert.equal((config.theme as Record<string, unknown>).preset, undefined);
  }
});

test("explicit family configuration wins over legacy presets and defaults to atlas density", () => {
  const config = normalizeConfig({ theme: { preset: "cyberpunk", family: "editorial" } });
  assert.equal(config.theme?.family, "editorial");
  assert.equal(config.theme?.density, "comfortable");
  assert.equal(config.theme?.defaultMode, "auto");
});

test("unknown families, densities, or modes are rejected with a precise path", () => {
  for (const invalidTheme of [{ family: "neon" }, { density: "roomy" }, { defaultMode: "dim" }]) {
    assert.throws(
      () => normalizeConfig({ theme: invalidTheme }),
      (error: Error) => error.message.includes("theme."),
      `expected ${JSON.stringify(invalidTheme)} to fail with a themed path`,
    );
  }
});

test("family schema and JSON Schema stay aligned", () => {
  const jsonSchemaPath = path.join(packageRoot, "schemas", "docs.schema.json");
  const jsonSchema = JSON.parse(fs.readFileSync(jsonSchemaPath, "utf-8"));
  const zodValues = docThemeConfigSchema.shape.family.unwrap().options;
  const jsonFamily = jsonSchema.$defs.theme.properties.family;

  assert.ok(jsonFamily, "docs.schema.json must declare theme.family");
  assert.deepEqual([...jsonFamily.enum], [...zodValues]);
  assert.equal(jsonSchema.$defs.theme.properties.preset.deprecated, true);
});

test("all documented theme enums match the executable and portable schemas", () => {
  const jsonSchema = JSON.parse(fs.readFileSync(path.join(packageRoot, "schemas", "docs.schema.json"), "utf-8"));
  const themeShape = docThemeConfigSchema.shape;
  const properties = jsonSchema.$defs.theme.properties;

  assert.deepEqual(properties.density.enum, themeShape.density.unwrap().options);
  assert.deepEqual(properties.defaultMode.enum, themeShape.defaultMode.unwrap().options);
  assert.deepEqual(properties.codeTheme.enum, themeShape.codeTheme.unwrap().options);

  const configurationGuide = fs.readFileSync(path.join(packageRoot, "docs", "configuration.md"), "utf-8");
  for (const value of properties.codeTheme.enum) assert.match(configurationGuide, new RegExp(`\\b${value}\\b`));
  assert.doesNotMatch(configurationGuide, /\bnord\b/);
});

test("template docs.json uses the family contract without legacy presets", () => {
  const templatePath = path.join(packageRoot, "templates", "docs.json");
  const template = JSON.parse(fs.readFileSync(templatePath, "utf-8"));

  assert.equal(template.theme.preset, undefined);
  assert.equal(docConfigSchema.safeParse(template).success, true);
});

test("every theme family defines light and dark token layers", () => {
  const themesCss = fs.readFileSync(path.join(packageRoot, "src/runtime/styles/themes.css"), "utf-8");

  for (const family of ["atlas", "blueprint", "terminal", "editorial"]) {
    assert.match(themesCss, new RegExp(`data-dmd-theme='${family}'`), `light layer missing for ${family}`);
    assert.match(
      themesCss,
      new RegExp(`data-dmd-theme='${family}'\\]\\[data-theme='dark'\\]`),
      `dark layer missing for ${family}`,
    );
  }

  assert.match(themesCss, /data-dmd-density='compact'/);
  assert.doesNotMatch(themesCss, /data-preset=/);
});

test("shell layout consumes density tokens instead of hardcoded chrome sizes", () => {
  const mainCss = fs.readFileSync(path.join(packageRoot, "src/runtime/styles/main.css"), "utf-8");

  assert.match(mainCss, /\.dmd-navbar\s*\{[^}]*height:\s*var\(--dmd-nav-height\)/s);
  assert.match(mainCss, /\.dmd-sidebar\s*\{[^}]*width:\s*var\(--dmd-sidebar-width\)/s);
  assert.match(mainCss, /\.dmd-toc\s*\{[^}]*width:\s*var\(--dmd-toc-width\)/s);
});

test("Mermaid viewer uses a square clipped viewport with pan-only navigation", () => {
  const mainCss = fs.readFileSync(path.resolve(__dirname, "../src/runtime/styles/main.css"), "utf-8");
  const stageRule = mainCss.match(/\.dmd-diagram-stage\s*\{([\s\S]*?)\n\}/)?.[1] || "";

  assert.match(stageRule, /aspect-ratio:\s*1/);
  assert.match(stageRule, /overflow:\s*hidden/);
  assert.match(stageRule, /overscroll-behavior:\s*none/);
  assert.match(stageRule, /touch-action:\s*none/);
  assert.doesNotMatch(stageRule, /overflow:\s*auto/);
  assert.doesNotMatch(stageRule, /overflow-y:\s*(?:auto|scroll)/);
  assert.doesNotMatch(stageRule, /scrollbar/);
});
