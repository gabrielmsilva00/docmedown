export interface CalloutInfo {
  type: "note" | "tip" | "important" | "warning" | "caution";
  title: string;
  content: string;
}

export const CALLOUT_ICONS = {
  note: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  tip: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  important: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  caution: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

/**
 * Transforms GitHub alert blockquotes into DocMeDown callouts
 * e.g. > [!NOTE] or > [!WARNING] Title
 */
export function processAlerts(markdown: string): string {
  const _alertRegex = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s+(.*))?$/gim;

  return markdown.replace(/^((?:>[^\n]*\n?)+)/gm, (block) => {
    const lines = block.split("\n");
    const firstLine = lines[0];
    const match = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s+(.*))?$/i.exec(firstLine.trim());

    if (!match) return block;

    const type = match[1].toLowerCase() as keyof typeof CALLOUT_ICONS;
    const customTitle = match[2]?.trim();
    const title = customTitle || type.toUpperCase();

    // Strip leading > from rest of the lines
    const contentLines = lines.slice(1).map((l) => l.replace(/^>\s?/, ""));
    const content = contentLines.join("\n").trim();

    return `\n<div class="dmd-callout dmd-callout-${type}">
  <div class="dmd-callout-header">
    <span class="dmd-callout-icon">${CALLOUT_ICONS[type]}</span>
    <span class="dmd-callout-title">${title}</span>
  </div>
  <div class="dmd-callout-body">

${content}

  </div>
</div>\n`;
  });
}
