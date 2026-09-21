import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { normalizeConfig } from "../src/runtime/config";
import { docConfigSchema, docThemeConfigSchema } from "../src/runtime/config-schema";

const packageRoot = path.resolve(__dirname, "..");

test("theme family normalization, presets mapping, and validation contracts", () => {
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
    assert.equal((config.theme as Record<string, unknown>).preset, undefined);
  }

  // Explicit family configuration wins over legacy presets and defaults
  const config = normalizeConfig({ theme: { preset: "cyberpunk", family: "editorial" } });
  assert.equal(config.theme?.family, "editorial");
  assert.equal(config.theme?.density, "comfortable");
  assert.equal(config.theme?.defaultMode, "auto");

  // Unknown families, densities, or modes are rejected with a precise path
  for (const invalidTheme of [{ family: "neon" }, { density: "roomy" }, { defaultMode: "dim" }]) {
    assert.throws(
      () => normalizeConfig({ theme: invalidTheme }),
      (error: Error) => error.message.includes("theme."),
      `expected ${JSON.stringify(invalidTheme)} to fail with a themed path`,
    );
  }

  // Template docs.json uses family contract
  const templatePath = path.join(packageRoot, "templates", "docs.json");
  const template = JSON.parse(fs.readFileSync(templatePath, "utf-8"));
  assert.equal(template.theme.preset, undefined);
  assert.equal(docConfigSchema.safeParse(template).success, true);
});

test("theme schema alignment across Zod, JSON schema, and docs", () => {
  const jsonSchemaPath = path.join(packageRoot, "schemas", "docs.schema.json");
  const jsonSchema = JSON.parse(fs.readFileSync(jsonSchemaPath, "utf-8"));
  const themeShape = docThemeConfigSchema.shape;
  const properties = jsonSchema.$defs.theme.properties;

  // Family enum and deprecated preset
  const zodValues = themeShape.family.unwrap().options;
  const jsonFamily = properties.family;
  assert.ok(jsonFamily, "docs.schema.json must declare theme.family");
  assert.deepEqual([...jsonFamily.enum], [...zodValues]);
  assert.equal(properties.preset.deprecated, true);

  // Density, defaultMode, codeTheme
  assert.deepEqual(properties.density.enum, themeShape.density.unwrap().options);
  assert.deepEqual(properties.defaultMode.enum, themeShape.defaultMode.unwrap().options);
  assert.deepEqual(properties.codeTheme.enum, themeShape.codeTheme.unwrap().options);

  // Configuration guide documentation consistency
  const configurationGuide = fs.readFileSync(path.join(packageRoot, "docs", "configuration.md"), "utf-8");
  for (const value of properties.codeTheme.enum) assert.match(configurationGuide, new RegExp(`\\b${value}\\b`));
  assert.doesNotMatch(configurationGuide, /\bnord\b/);
});

test("CSS token architecture, responsive shell layout, and navbar typography", () => {
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

  const mainCss = fs.readFileSync(path.join(packageRoot, "src/runtime/styles/main.css"), "utf-8");
  // Density tokens
  assert.match(mainCss, /\.dmd-navbar\s*\{[^}]*height:\s*var\(--dmd-nav-height\)/s);
  assert.match(mainCss, /\.dmd-sidebar\s*\{[^}]*width:\s*var\(--dmd-sidebar-width\)/s);
  assert.match(mainCss, /\.dmd-toc\s*\{[^}]*width:\s*var\(--dmd-toc-width\)/s);

  // Responsive breakpoints
  assert.match(mainCss, /@media \(max-width: 1280px\)[\s\S]*?\.dmd-main-wrapper\s*\{[\s\S]*?flex-direction:\s*column/);
  assert.match(mainCss, /@media \(max-width: 1280px\)[\s\S]*?\.dmd-toc\s*\{[\s\S]*?width:\s*100%/);
  assert.match(mainCss, /@media \(max-width: 1024px\)[\s\S]*?\.dmd-sidebar\s*\{[\s\S]*?position:\s*fixed/);
  assert.doesNotMatch(mainCss, /@media \(max-width: 960px\)/);

  // Touch and short-viewport adaptations
  assert.match(mainCss, /@media \(hover: none\), \(pointer: coarse\)/);
  assert.match(mainCss, /@media \(max-height: 600px\)/);
  assert.match(mainCss, /\.dmd-sidebar-link,[\s\S]*?\.dmd-toc-link[\s\S]*?min-height:\s*44px/);

  // Navbar single-line policy
  assert.match(mainCss, /\.dmd-navbar\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(mainCss, /\.dmd-brand-title\s*\{[^}]*text-overflow:\s*ellipsis/);
  assert.match(mainCss, /\.dmd-brand-version\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(mainCss, /\.dmd-search-trigger\s*\{[^}]*white-space:\s*nowrap/);

  const placeholder = mainCss.match(/\.dmd-search-placeholder\s*\{([^}]*)\}/)?.[1] || "";
  assert.match(placeholder, /min-width:\s*0/);
  assert.match(placeholder, /overflow:\s*hidden/);
  assert.match(placeholder, /text-overflow:\s*ellipsis/);
  assert.match(placeholder, /white-space:\s*nowrap/);

  assert.match(mainCss, /\.dmd-search-shortcut\s*\{[^}]*flex-shrink:\s*0/);
  assert.match(mainCss, /\.dmd-kbd\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(mainCss, /\.dmd-nav-link\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(mainCss, /\.dmd-offline-download-btn\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(mainCss, /\.dmd-appearance-trigger\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(mainCss, /\.dmd-appearance-panel\s*\{[^}]*white-space:\s*normal/);
  assert.match(mainCss, /\.dmd-offline-download-error\s*\{[^}]*white-space:\s*normal/);
});

test("runtime mounting and diagram interactivity contracts", () => {
  const mainCss = fs.readFileSync(path.resolve(__dirname, "../src/runtime/styles/main.css"), "utf-8");
  const stageRule = mainCss.match(/\.dmd-diagram-stage\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(stageRule, /aspect-ratio:\s*1/);
  assert.match(stageRule, /overflow:\s*hidden/);
  assert.match(stageRule, /overscroll-behavior:\s*none/);
  assert.match(stageRule, /touch-action:\s*none/);
  assert.doesNotMatch(stageRule, /overflow:\s*auto/);
  assert.doesNotMatch(stageRule, /overflow-y:\s*(?:auto|scroll)/);
  assert.doesNotMatch(stageRule, /scrollbar/);

  const component = fs.readFileSync(path.resolve(__dirname, "../src/ui/components/MermaidDiagram.svelte"), "utf-8");
  assert.match(component, /addEventListener\("wheel",\s*handleWheel,\s*\{\s*passive:\s*false\s*\}\)/);
  assert.match(component, /removeEventListener\("wheel",\s*handleWheel\)/);
  assert.doesNotMatch(component, /onWheel=\{handleWheel\}/);

  const entry = fs.readFileSync(path.resolve(__dirname, "../src/ui/index.ts"), "utf-8");
  const clearAt = entry.indexOf('container.innerHTML = ""');
  const mountAt = entry.indexOf("mount(App, { target: container })");
  assert.ok(clearAt >= 0, "initDocMeDown must clear the container before mounting");
  assert.ok(mountAt > clearAt, "the clear must happen before mount()");
});
