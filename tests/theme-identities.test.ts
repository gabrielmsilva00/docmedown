import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import { normalizeConfig } from "../src/runtime/config";
import { themeFamilySchema } from "../src/runtime/config-schema";
import { buildDiagramTheme, isDiagramFamily, resolveDiagramContext } from "../src/runtime/markdown/mermaid";
import { renderSplashHead } from "../src/runtime/splash";

const root = path.resolve(__dirname, "..");
const families = ["atlas", "blueprint", "terminal", "editorial", "botanical", "studio"] as const;
const css = fs.readFileSync(path.join(root, "src/runtime/styles/themes.css"), "utf8");

function palette(family: string, mode: string): Record<string, string> {
  const selector = `:root[data-dmd-theme='${family}']${mode === "dark" ? "[data-theme='dark']" : ""}`;
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `missing ${family}/${mode}`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--dmd-([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

function luminance(hex: string): number {
  assert.match(hex, /^#[\da-f]{6}$/i);
  const [r, g, b] = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high + 0.05) / (low + 0.05);
}

test("exactly six theme families normalize across every mode and density", () => {
  assert.deepEqual(themeFamilySchema.options, families);
  for (const family of families) {
    assert.equal(isDiagramFamily(family), true);
    for (const defaultMode of ["light", "dark", "auto"] as const) {
      for (const density of ["comfortable", "compact"] as const) {
        const config = normalizeConfig({ theme: { family, defaultMode, density } });
        assert.equal(config.theme?.family, family);
        assert.equal(config.theme?.defaultMode, defaultMode);
        assert.equal(config.theme?.density, density);
      }
    }
  }
  assert.equal(isDiagramFamily("unknown"), false);
});

test("all twelve palettes provide readable text, links, and code", () => {
  for (const family of families) {
    for (const mode of ["light", "dark"]) {
      const p = palette(family, mode);
      for (const surface of ["bg-primary", "bg-secondary", "bg-card"]) {
        for (const ink of ["text-primary", "text-secondary", "text-muted", "accent"]) {
          const ratio = contrast(p[ink], p[surface]);
          assert.ok(ratio >= 4.5, `${family}/${mode} ${ink} on ${surface}: ${ratio.toFixed(2)}:1`);
        }
      }
      assert.ok(contrast(p["code-text"], p["code-bg"]) >= 7, `${family}/${mode} code contrast`);
      assert.ok(contrast(p["inline-code-text"], p["inline-code-bg"]) >= 4.5, `${family}/${mode} inline code`);
    }
  }
});

test("diagram defaults match each theme's actual palette without a DOM", () => {
  for (const family of families) {
    for (const mode of ["light", "dark"] as const) {
      const p = palette(family, mode);
      const { variables, options } = buildDiagramTheme(family, mode);
      assert.equal(variables["--pele-bg"], p["bg-primary"], `${family}/${mode} canvas`);
      assert.equal(variables["--pele-surface"], p["bg-card"], `${family}/${mode} surface`);
      assert.equal(variables["--pele-fg"], p["text-primary"], `${family}/${mode} ink`);
      assert.equal(variables["--pele-accent"], p.accent, `${family}/${mode} accent`);
      assert.equal(options.fontFamily, variables["--pele-font"]);
    }
  }
});

test("diagram context reads live surfaces, ink, typography and brand overrides", () => {
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const oldComputed = Object.getOwnPropertyDescriptor(globalThis, "getComputedStyle");
  try {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { documentElement: { getAttribute: (name: string) => (name === "data-dmd-theme" ? "studio" : "dark") } },
    });
    Object.defineProperty(globalThis, "getComputedStyle", {
      configurable: true,
      value: () => ({
        getPropertyValue: (name: string) =>
          ({ "--dmd-accent": "#123456", "--dmd-bg-primary": "#111111", "--dmd-font-display": "Georgia, serif" })[
            name
          ] ?? "",
      }),
    });
    const context = resolveDiagramContext();
    assert.equal(context.family, "studio");
    assert.equal(context.mode, "dark");
    assert.equal(context.tokens.accent, "#123456");
    assert.equal(context.tokens.canvas, "#111111");
    assert.equal(context.tokens.fontFamily, "Georgia, serif");
    assert.equal(context.tokens.surface, palette("studio", "dark")["bg-card"]);
  } finally {
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument);
    else Reflect.deleteProperty(globalThis, "document");
    if (oldComputed) Object.defineProperty(globalThis, "getComputedStyle", oldComputed);
    else Reflect.deleteProperty(globalThis, "getComputedStyle");
  }
});

test("loading bootstrap preserves all six saved families before first paint", () => {
  const head = renderSplashHead();
  const script = head.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  for (const family of [...families, "invalid"]) {
    const attributes: Record<string, string> = {};
    const context = {
      document: {
        documentElement: { setAttribute: (k: string, v: string) => (attributes[k] = v), style: {}, className: "" },
      },
      window: {
        localStorage: { getItem: (key: string) => (key === "dmd-theme-family" ? family : "dark") },
        setTimeout: () => 0,
      },
      navigator: { platform: "Win32" },
    };
    vm.runInNewContext(script, context);
    assert.equal(attributes["data-dmd-theme"], family === "invalid" ? "atlas" : family);
    assert.equal(attributes["data-theme"], "dark");
  }
  for (const family of families) {
    if (family === "atlas") continue;
    assert.ok(head.includes(`:root[data-dmd-theme=${family}]`));
    assert.ok(head.includes(`:root[data-dmd-theme=${family}][data-theme=dark]`));
  }
});

test("every family has distinct component styling and a selectable preview", () => {
  const identities = fs.readFileSync(path.join(root, "src/runtime/styles/identities.css"), "utf8");
  const main = fs.readFileSync(path.join(root, "src/runtime/styles/main.css"), "utf8");
  const menu = fs.readFileSync(path.join(root, "src/ui/components/AppearanceMenu.svelte"), "utf8");
  const app = fs.readFileSync(path.join(root, "src/ui/App.svelte"), "utf8");
  assert.ok(app.includes('import "../runtime/styles/identities.css"'));
  for (const family of families) {
    assert.ok(menu.includes(`family: "${family}"`));
    assert.ok(identities.includes(`[data-dmd-theme='${family}'] .dmd-markdown-body h1`));
    assert.ok(identities.includes(`[data-dmd-theme='${family}'] .dmd-code-block-wrapper`));
    assert.ok((identities + main).includes(`.dmd-theme-preview-${family}`));
  }
  assert.match(identities, /max-height: calc\(100dvh/);
  assert.match(identities, /overflow-y: auto/);
  assert.match(identities, /prefers-reduced-motion/);
  assert.match(menu, /aria-pressed=\{theme.family === item.family\}/);
  assert.match(menu, /triggerElement\?\.focus\(\)/);
});
