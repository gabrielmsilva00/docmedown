/**
 * Card carousel math — framework-free and unit-tested.
 *
 * The sliding window shows `perView` consecutive cards and moves one card at a
 * time. Every card can lead a window; the final card connects to the first.
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

/**
 * Sliding-window math for the CardGrid carousel: which cards a position shows
 * and how many positions the controls reach. A five-card, two-per-view grid
 * walks [0,1] [1,2] [2,3] [3,4] [4,0]. Once all the cards fit side by side
 * there is a single position.
 */
export function carouselWindow(
  total: number,
  perView: number,
  start: number,
): { positions: number; index: number; indices: number[] } {
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const safePerView = Number.isFinite(perView) ? Math.max(1, Math.floor(perView)) : 1;
  const positions = safeTotal > safePerView ? safeTotal : 1;
  const requested = Number.isFinite(start) ? Math.floor(start) : 0;
  const index = ((requested % positions) + positions) % positions;
  const indices: number[] = [];
  for (let i = 0; i < Math.min(safePerView, safeTotal); i++) indices.push((index + i) % safeTotal);
  return { positions, index, indices };
}
