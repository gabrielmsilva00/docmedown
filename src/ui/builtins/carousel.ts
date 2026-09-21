/**
 * Card carousel math — framework-free and unit-tested.
 *
 * The sliding window shows `perView` consecutive cards and cycles with
 * wrap-around, so **every card leads a window**: there are `total` positions
 * and the last one wraps to the front ([4, 0] after [3, 4] for five cards, two
 * per view). A wrapped window needs cards from the start of the list, so
 * CardGrid duplicates the first `perView - 1` cards after the real slides —
 * see `buildWrapClones`.
 */
export const CAROUSEL_MIN_CARD_PX = 260;
export const CAROUSEL_GAP_PX = 16;

/** Clamp a column count into the supported 1–4 range. */
export function clampCarouselCols(value: unknown, fallback: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback;
  if (n < 1) return 1;
  if (n > 4) return 4;
  return n;
}

/**
 * Resolve how many cards fit side-by-side in the carousel viewport.
 * `maxPerView` is the `carouselCols` cap; narrow containers shrink below it
 * (mobile-first) so a `carouselCols={2}` grid still shows 1 card on phones.
 */
export function resolveCarouselPerView(maxPerView: number, containerWidth: number): number {
  const cap = clampCarouselCols(maxPerView, 2);
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return cap;
  const fit = Math.floor((containerWidth + CAROUSEL_GAP_PX) / (CAROUSEL_MIN_CARD_PX + CAROUSEL_GAP_PX));
  if (fit < 1) return 1;
  return Math.min(cap, fit);
}

/** Normalize any card index into the `0 … total-1` loop range. */
export function normalizeLoopIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  const i = Number.isFinite(index) ? Math.floor(index) : 0;
  return ((i % total) + total) % total;
}

/**
 * Card indices to duplicate after the real slides so every window stays full
 * while looping. The last position shows the final card followed by the first
 * `perView - 1` cards (five-one with two per view, five-one-two with three), so
 * exactly those leading cards are cloned. Returns `[]` when every card already
 * fits in one view: the carousel then has a single position and never wraps.
 */
export function buildWrapClones(total: number, perView: number): number[] {
  const safeTotal = Math.max(0, Math.floor(total));
  const safePerView = Math.max(1, Math.floor(perView));
  // A one-card window never wraps around, and nothing trails when the whole
  // grid is on screen at once.
  if (safePerView >= safeTotal) return [];
  const clones: number[] = [];
  for (let k = 0; k < safePerView - 1; k++) clones.push(normalizeLoopIndex(k, safeTotal));
  return clones;
}

/**
 * Sliding-window math for the CardGrid carousel: which cards a position shows
 * and how many positions the controls reach. Every card leads a window — one
 * position per card — and the window wraps circularly, so a five-card,
 * two-per-view grid walks [0,1] [1,2] [2,3] [3,4] [4,0]. Once all the cards fit
 * side by side there is a single, non-looping position.
 */
export function carouselWindow(
  total: number,
  perView: number,
  start: number,
): { positions: number; index: number; indices: number[] } {
  const safeTotal = Math.max(0, Math.floor(total));
  const safePerView = Math.max(1, Math.floor(perView));
  const positions = safeTotal > 1 && safePerView < safeTotal ? safeTotal : 1;
  const index = normalizeLoopIndex(start, positions);
  const indices: number[] = [];
  for (let i = 0; i < Math.min(safePerView, safeTotal); i++) {
    indices.push(normalizeLoopIndex(index + i, safeTotal));
  }
  return { positions, index, indices };
}
