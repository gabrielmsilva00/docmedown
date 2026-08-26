import katex from "katex";

export function renderMath(content: string): string {
  // 1. Block math: $$ ... $$
  let result = content.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return `$$${math}$$`;
    }
  });

  // 2. Inline math: $ ... $ (avoid matching \$ or pure dollar amounts)
  result = result.replace(/(^|[^\\])\$([^$\n]+?)\$/g, (_, prefix, math) => {
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

  return result;
}
