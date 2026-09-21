/**
 * Custom setup for DocMeDown documentation.
 * Registers custom syntax highlighters and runtime hooks.
 */

const mylangGrammar = {
  comment: /#.*/,
  string: /"(?:[^"\\]|\\.)*"/,
  keyword: /\b(?:pipeline|draw|plot|render|at|transform|scale|rotate)\b/,
  boolean: /\b(?:true|false)\b/,
  number: /-?\b\d+(?:\.\d+)?\b/,
  operator: /[+\-*/=<>!:]+/,
  punctuation: /[{}[\];(),.]/,
};

const docMeDown =
  (typeof window !== "undefined" ? window.DocMeDown : undefined) ||
  (typeof globalThis !== "undefined" ? globalThis.DocMeDown : undefined);

if (docMeDown?.registerLanguage) {
  docMeDown.registerLanguage("mylang", mylangGrammar, "#06b6d4");
}
