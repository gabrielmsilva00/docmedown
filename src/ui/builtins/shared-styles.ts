/**
 * Shared CSS stylesheet adopted by every Lit builtin's Shadow DOM.
 *
 * main.css (with themes.css inlined) is loaded once as a CSSStyleSheet object
 * and adopted into every component's shadow root via adoptedStyleSheets. This
 * is near-zero overhead: the browser holds one stylesheet in memory, and each
 * shadow root references it by pointer.
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
  // Shadow DOM needs :host — the global dmd-* element rule in main.css
  // doesn't penetrate shadow roots.
  "\n\n:host { display: contents; }";

const sheet = new CSSStyleSheet();
sheet.replaceSync(resolvedCss);

export { sheet as sharedStyles };
