import { svelte } from "@sveltejs/vite-plugin-svelte";
import type { Plugin, PluginOption } from "vite";

/**
 * KaTeX ships every math font as woff2 **and** legacy woff **and** TrueType.
 * Vite inlines all three variants as base64 into the injected stylesheet,
 * which lands ~1 MB of redundant font data in the eagerly loaded bundle
 * even for pages without math.
 *
 * Every browser DocMeDown targets decodes woff2, so dropping the woff/ttf
 * sources costs nothing at runtime while removing ~800 KB of raw font bytes
 * and ~500 KB of gzipped payload from the shared bundle. `@font-face` keeps
 * its woff2 source, so math renders identically.
 */
export function pruneLegacyKatexFonts(): Plugin {
  return {
    name: "dmd-prune-legacy-katex-fonts",
    enforce: "pre",
    transform(code, id) {
      const cleanId = id.split("?")[0];
      if (!cleanId.endsWith(".css") || !/katex[\\/]dist/i.test(cleanId)) return null;
      // 1. Drop legacy woff and TrueType sources from @font-face rules
      let pruned = code.replace(/,\s*url\([^)]*\.(?:woff|ttf)\)\s*format\(\s*["']?(?:woff|truetype)["']?\s*\)/gi, "");
      // 2. Drop non-essential decorative font faces (Fraktur, Caligraphic, Script, SansSerif, Typewriter)
      // while retaining all core math glyphs (Main, Math, AMS, Size1-4).
      pruned = pruned.replace(
        /@font-face\s*\{[^}]*font-family:\s*["']?KaTeX_(?:Fraktur|Caligraphic|Script|SansSerif|Typewriter)["']?[^}]*\}/gi,
        "",
      );
      return pruned === code ? null : { code: pruned, map: null };
    },
  };
}

/**
 * Shared Svelte plugin configuration: suppresses the intentional
 * `options_missing_custom_element` warning for components that opt into
 * `<svelte:options customElement>` (MermaidDiagram).
 */
export function dmdSvelte(): PluginOption[] {
  return svelte({
    onwarn: (warning, handler) => {
      if (warning.code === "options_missing_custom_element") return;
      handler(warning);
    },
  }) as PluginOption[];
}
