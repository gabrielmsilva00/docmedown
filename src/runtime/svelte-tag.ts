export function toKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/** Canonical custom element tag for a component name: "CounterWidget" → "dmd-counter-widget". */
export function dmdTag(name: string): string {
  if (name.startsWith("dmd-")) return name;
  return `dmd-${toKebab(name)}`;
}

/**
 * Ensures a Svelte 5 component template carries a customElement definition tag.
 */
export function ensureCustomElementTag(source: string, tagName: string): string {
  if (/<svelte:options\b[^>]*customElement/i.test(source)) {
    return source;
  }
  return `<svelte:options customElement={{ tag: "${tagName}" }} />\n${source}`;
}
