/**
 * Shared CSS stylesheet adopted by Svelte custom element shadow roots.
 *
 * main.css (with themes.css inlined) is loaded once as a CSSStyleSheet object
 * and adopted into each Svelte component's shadow root via adoptedStyleSheets.
 *
 * KaTeX is intentionally excluded — math formulas live in slotted content
 * (light DOM), where the global katex stylesheet applies.
 */
import mainCss from "../../runtime/styles/main.css?raw";
import themesCss from "../../runtime/styles/themes.css?raw";

const resolvedCss =
  mainCss
    .replace(/@import\s+['"]\.\/themes\.css['"]\s*;?/, themesCss)
    .replace(/@import\s+['"][^'"]*katex[^'"]*['"]\s*;?/, "/* katex: loaded globally for slotted content */") +
  "\n\n:host { display: contents; }";

let sheet: CSSStyleSheet | null = null;

export function getSharedStyles(): CSSStyleSheet | null {
  if (!sheet && typeof CSSStyleSheet !== "undefined") {
    try {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(resolvedCss);
    } catch {
      sheet = null;
    }
  }
  return sheet;
}

export function adoptSharedStyles(element: HTMLElement | undefined | null): void {
  if (!element || typeof ShadowRoot === "undefined") return;
  const rootNode = element.getRootNode();
  if (rootNode instanceof ShadowRoot) {
    const s = getSharedStyles();
    if (s && !rootNode.adoptedStyleSheets.includes(s)) {
      rootNode.adoptedStyleSheets = [...rootNode.adoptedStyleSheets, s];
    }
  }
}
