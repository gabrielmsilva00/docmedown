import katex from "katex";

export function renderMath(content: string): string {
  // Protect fenced code blocks and inline code so `$` inside them is never
  // interpreted as math. Restored verbatim after math rendering.
  const placeholders: string[] = [];
  const placeholderPrefix = "@@__DMD_KATEX_CODE_";
  const placeholderSuffix = "__@@";
  const store = (code: string): string => {
    const idx = placeholders.length;
    placeholders.push(code);
    return `${placeholderPrefix}${idx}${placeholderSuffix}`;
  };

  // 1. Extract fenced blocks (``` ... ```, ~~~ ... ~~~, any run length)
  // first — same-length backreference so ````markdown blocks containing
  // ``` inner fences stay one opaque unit — then inline `...` / ``...``
  // code spans so `$` inside them is never interpreted as math.
  let tmp = content.replace(/(`{3,})[\s\S]*?\1/g, (m) => store(m));
  tmp = tmp.replace(/(~{3,})[\s\S]*?\1/g, (m) => store(m));
  tmp = tmp.replace(/(`+)[\s\S]*?\1/g, (m) => store(m));

  // 2. Block math: $$ ... $$
  let result = tmp.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return `$$${math}$$`;
    }
  });

  // 3. Inline math: $ ... $ (avoid matching \$ or pure dollar amounts)
  result = result.replace(/(^|[^\\])\$([^$\n]+?)\$/g, (_, prefix: string, math: string) => {
    // Skip empty math and lone currency like $20
    if (!math.trim()) return `${prefix}$${math}$`;
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return `${prefix}${rendered}`;
    } catch {
      return `${prefix}$${math}$`;
    }
  });

  // 4. Restore code placeholders verbatim
  placeholders.forEach((html, idx) => {
    result = result.split(`${placeholderPrefix}${idx}${placeholderSuffix}`).join(html);
  });

  return result;
}
