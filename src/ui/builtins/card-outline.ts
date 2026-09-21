/**
 * Card outline inference — framework-free and unit-tested.
 *
 * A container-style `<Card>` is authored with a Markdown body:
 *
 *   <Card color="blue" badge="New">
 *     ## Container-style card
 *     ### Runs anywhere
 *     The body is **plain Markdown**.
 *     > Shipped with the CLI.
 *   </Card>
 *
 * When the author left the matching prop empty, that Markdown names the card
 * instead of staying body copy:
 *
 * - `title`       — the first heading *above* H3 (h1/h2), the only headings
 *                   high enough in the hierarchy to name the whole card;
 * - `description` — the smaller heading immediately after that title;
 * - `footer`      — a trailing blockquote, or a heading below H5 (h6).
 *
 * Everything else (H3 and deeper headings, paragraphs, lists, code) stays in
 * the body. Callers apply the result only for the props an author omitted, so
 * an explicit `title`/`description`/`footer` always wins.
 */

/** Deepest heading level that still reads as a card title (`above H3`). */
const TITLE_MAX_LEVEL = 2;

/** Shallowest heading level that reads as a footer note (`below H5`). */
const FOOTER_MIN_LEVEL = 6;

const HEADING_LEVEL = /^H([1-6])$/;

/** Minimal shape inference needs from a child node (an `Element` satisfies it). */
export interface CardOutlineNode {
  tagName: string;
  /** Text of the node, `null` for an element with no text. */
  textContent?: string | null;
  /** Number of element children. */
  childElementCount?: number;
}

export interface CardOutline<T> {
  title?: T;
  description?: T;
  footer?: T;
}

/** Heading level of a node (`1`–`6`), or `0` when it is not a heading. */
export function headingLevel(node: CardOutlineNode): number {
  const match = HEADING_LEVEL.exec(node.tagName.toUpperCase());
  return match ? Number(match[1]) : 0;
}

/**
 * A node that carries no content: an empty element with neither text nor
 * element children. `unwrapBlockComponents` no longer leaves these behind
 * (a paragraph wrapping a component is unwrapped whole), but a body can still
 * arrive with one: content injected at runtime, markup from an older build, or
 * a component authored with a stray blank wrapper. Fillers are dropped before
 * pairing so they cannot sit between a title and its subtitle or hide a trailing
 * footer. Test doubles that omit both fields count as content.
 */
function isFiller(node: CardOutlineNode): boolean {
  if (headingLevel(node) > 0) return false;
  if (node.textContent === undefined && node.childElementCount === undefined) return false;
  return (node.textContent ?? "").trim() === "" && (node.childElementCount ?? 0) === 0;
}

/**
 * Classifies the direct children of a card into chrome candidates. Nodes are
 * returned, never moved, so the caller decides what to adopt; each node is
 * claimed by at most one slot — a two-child card (`## Title` plus `### Sub`)
 * has a description, not a footer.
 */
export function inferCardOutline<T extends CardOutlineNode>(children: T[]): CardOutline<T> {
  const outline: CardOutline<T> = {};
  const content = children.filter((child) => !isFiller(child));

  const title = content.find((child) => {
    const level = headingLevel(child);
    return level > 0 && level <= TITLE_MAX_LEVEL;
  });

  if (title) {
    outline.title = title;
    // "A smaller subheading right after it": only a deeper heading directly
    // under the title is its subtitle — a same-level heading reopens the body.
    const next = content[content.indexOf(title) + 1];
    if (next && headingLevel(next) > headingLevel(title)) outline.description = next;
  }

  const last = content[content.length - 1];
  if (last && last !== outline.title && last !== outline.description) {
    if (last.tagName.toUpperCase() === "BLOCKQUOTE" || headingLevel(last) >= FOOTER_MIN_LEVEL) {
      outline.footer = last;
    }
  }

  return outline;
}
