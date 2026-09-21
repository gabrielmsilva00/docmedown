import { html, LitElement } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import { buildWrapClones, carouselWindow, clampCarouselCols, resolveCarouselPerView } from "./carousel";
import { sharedStyles } from "./shared-styles";

/** Marks the duplicated wrap-around cards so they are never counted as slides. */
const CAROUSEL_CLONE_ATTR = "data-dmd-carousel-clone";

/**
 * Duplicates a card for a wrap-around slide. `DmdCard` implements `cloneCard`
 * so a container-style card's inferred chrome rides along — `cloneNode(true)`
 * alone copies only the surviving light DOM, which would drop the adopted title
 * and footer. Any other host (a plain `<Item>` slide) deep-clones as-is. Ids are
 * stripped: a duplicated id in the same tree would break in-page anchors.
 */
function cloneSlideCard(source: HTMLElement): HTMLElement {
  const cloneable = source as HTMLElement & { cloneCard?: () => HTMLElement };
  const clone =
    typeof cloneable.cloneCard === "function" ? cloneable.cloneCard() : (source.cloneNode(true) as HTMLElement);
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  return clone;
}

export class DmdCardGrid extends LitElement {
  static properties = {
    cols: { type: Number },
    carouselcols: { type: Number },
  };
  static styles = [sharedStyles];

  declare cols: number;
  declare carouselcols: number;

  private _cardCount = 0;
  private _perView = 2;
  private _active = 0;
  private _viewportRef = createRef<HTMLElement>();
  private _resizeObserver: ResizeObserver | null = null;
  private _observing = false;
  // The slid cards (light-DOM children) and the wrap-around duplicates the
  // carousel keeps after them; see _syncClones.
  private _cards: HTMLElement[] = [];
  private _clones: HTMLElement[] = [];
  private _cloneKey = "";
  // Cached horizontal offsets of the slotted cards (one batched layout pass
  // per change) so the scroll handler never reads offsetLeft per event.
  private _childOffsets: number[] = [];
  private _offsetsKey = "";
  private _scrollRaf = 0;

  private get _viewport(): HTMLElement | null {
    return this._viewportRef.value ?? null;
  }

  constructor() {
    super();
    this.cols = 2;
    this.carouselcols = 0;
  }

  private get gridCols(): number {
    return clampCarouselCols(this.cols, 2);
  }

  private get maxPerView(): number {
    return clampCarouselCols(this.carouselcols || this.cols, 2);
  }

  private get isCarousel(): boolean {
    return this._cardCount > this.gridCols;
  }

  /** How many wrap-around duplicates the current window needs (0 when none do). */
  private get cloneCount(): number {
    return buildWrapClones(this._cardCount, this._perView).length;
  }

  /**
   * The cards the current window shows, as "card 4" / "cards 4 and 5" / "cards
   * 5, 1 and 2" — the wrapped window reads as the loop it is, and the live
   * region announces exactly what landed on screen.
   */
  private get windowLabel(): string {
    const shown = carouselWindow(this._cardCount, this._perView, this._active).indices.map((index) => index + 1);
    if (shown.length === 0) return "no cards";
    if (shown.length === 1) return `card ${shown[0]}`;
    return `cards ${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", this._onKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._observing = false;
    this.removeEventListener("keydown", this._onKeyDown);
  }

  private _onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this._goPrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      this._goNext();
    }
  };

  private _onSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    // Per-card named slide slots re-fire after every render; only the main
    // track slot drives state.
    if (slot.name) return;
    // Read the light DOM rather than `slot.assignedElements()`: the main slot
    // empties as soon as the cards are assigned to their named slides below, so
    // a card that arrives later would otherwise be the only element it reports.
    const cards = this._lightCards();
    if (cards.length === 0) return;
    const sameCards = cards.length === this._cards.length && cards.every((card, i) => card === this._cards[i]);
    this._cards = cards;
    this._cardCount = cards.length;
    if (!sameCards) {
      this._offsetsKey = ""; // force offset refresh for the new card set
      this._childOffsets = [];
      this._cloneKey = ""; // the duplicates point at the old cards
    }

    if (!this.isCarousel) {
      // Back in grid mode: drop the wrap-around duplicates and any carousel
      // slide assignment so the cards render as plain grid items again.
      this._clearClones();
      cards.forEach((el) => el.removeAttribute("slot"));
      this._perView = this.gridCols;
      this.requestUpdate();
      return;
    }

    // Assign every card to a named slide slot. The card hosts render with
    // `display: contents`, so without real `.dmd-carousel-slide` wrappers the
    // flex track's items would be the unstyled `.dmd-card` boxes — no
    // per-view sizing, no scroll-snap, no horizontal overflow (the broken
    // carousel). Named slots give each card a real slide.
    cards.forEach((el, i) => el.setAttribute("slot", `dmd-carousel-${i}`));

    this._updatePerView();

    if (!this._resizeObserver && typeof ResizeObserver !== "undefined") {
      this._resizeObserver = new ResizeObserver(() => this._updatePerView());
    }
    this.requestUpdate();
  }

  /** Every light-DOM slide child, ignoring the carousel's own duplicated cards. */
  private _lightCards(): HTMLElement[] {
    return Array.from(this.children).filter((child): child is HTMLElement => !child.hasAttribute(CAROUSEL_CLONE_ATTR));
  }

  /**
   * Builds the wrap-around duplicates after the real slides. The window that
   * leads with the last card has to keep showing the front of the list (last →
   * first), and a card can only live in one slide slot — so the first
   * `perView - 1` cards are cloned onto clone slides (`buildWrapClones`) and
   * the track's final position reads five-one, five-one-two, … however many
   * cards the author wrote. The copies are decoration: they are `inert` and
   * `aria-hidden` so they never double up in the tab order, the accessibility
   * tree, or a click target — the real slides stay the interactive ones.
   */
  private _syncClones() {
    const key = `${this._cardCount}:${this._perView}`;
    if (key === this._cloneKey) return;
    this._clearClones();
    this._cloneKey = key;
    buildWrapClones(this._cardCount, this._perView).forEach((cardIndex, slotIndex) => {
      const source = this._cards[cardIndex];
      if (!source) return;
      const clone = cloneSlideCard(source);
      clone.setAttribute(CAROUSEL_CLONE_ATTR, "");
      clone.setAttribute("slot", `dmd-carousel-clone-${slotIndex}`);
      clone.setAttribute("aria-hidden", "true");
      clone.setAttribute("inert", "");
      this.appendChild(clone);
      this._clones.push(clone);
    });
    this._offsetsKey = ""; // the track gained slides — remeasure
  }

  private _clearClones() {
    for (const clone of this._clones) clone.remove();
    this._clones = [];
    this._cloneKey = "";
  }

  private _updatePerView() {
    if (!this._viewport) return;
    const next = resolveCarouselPerView(this.maxPerView, this._viewport.clientWidth);
    if (this._perView !== next) {
      this._perView = next;
      this.requestUpdate();
    }
    // The wrap-around duplicates depend on how many cards fit on screen, so
    // they are rebuilt before the offsets are measured from the track.
    if (this.isCarousel) this._syncClones();
    this._cacheOffsets();
    if (this._resizeObserver && this._viewport && !this._observing) {
      this._resizeObserver.observe(this._viewport);
      this._observing = true;
    }
  }

  /**
   * Recomputes the cached card offsets in one batched layout read pass.
   * Offsets only change when cards are added/removed or the track reflows
   * (perView change, container resize), so the key is
   * `slides:perView:viewportWidth` — on every other render this is a no-op.
   */
  private _cacheOffsets() {
    const slides = this.shadowRoot?.querySelectorAll<HTMLElement>(".dmd-carousel-slide");
    if (!slides || slides.length === 0) return;
    // Slides are sized in percentages, so a container that resizes without
    // changing perView still moves every offset — the width is part of the key.
    const key = `${slides.length}:${this._perView}:${this._viewport?.clientWidth ?? 0}`;
    if (key === this._offsetsKey) return;
    this._offsetsKey = key;
    // Only the real slides are scroll targets: the wrap-around duplicates trail
    // them and are never scrolled to on their own.
    this._childOffsets = [...slides].slice(0, this._cardCount).map((slide) => slide.offsetLeft);
  }

  private _scrollTo(index: number, behavior: ScrollBehavior = "smooth") {
    if (!this._viewport) return;
    const offset = this._childOffsets[index];
    if (offset == null) return;
    this._active = index;
    // Scroll the viewport to the cached slide offset instead of
    // scrollIntoView: the card hosts are `display: contents` and have no box
    // to align, while the slides are the real scroll-snap targets.
    this._viewport.scrollTo({ left: offset, behavior });
    this.requestUpdate();
  }

  private _goPrev() {
    this._scrollTo(this._active <= 0 ? this._cardCount - 1 : this._active - 1);
  }

  private _goNext() {
    this._scrollTo(this._active >= this._cardCount - 1 ? 0 : this._active + 1);
  }

  /**
   * Scroll events fire faster than frames; coalesce them into one update per
   * animation frame and resolve the active card from the cached offset table
   * (no DOM reads in the hot path — see _cacheOffsets).
   */
  private _onScroll() {
    if (this._scrollRaf) return;
    this._scrollRaf = requestAnimationFrame(() => {
      this._scrollRaf = 0;
      if (!this._viewport) return;
      const viewportLeft = this._viewport.scrollLeft;
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < this._childOffsets.length; i++) {
        const dist = Math.abs(this._childOffsets[i] - viewportLeft);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
      if (closest !== this._active) {
        this._active = closest;
        this.requestUpdate();
      }
    });
  }

  updated() {
    if (this.isCarousel && this._resizeObserver && this._viewport && !this._observing) {
      this._updatePerView();
    }
  }

  render() {
    if (this.isCarousel) {
      return html`
        <section
          class="dmd-card-carousel dmd-card-grid-${this.gridCols}"
          data-per-view=${this._perView}
          aria-roledescription="carousel"
          aria-label="Card carousel, ${this._cardCount} cards"
          tabindex="0"
        >
          <div
              class="dmd-carousel-viewport"
              ${ref(this._viewportRef)}
              @scroll=${this._onScroll}
            >
            <div class="dmd-carousel-track" style="--dmd-carousel-per-view: ${this._perView};">
              <slot @slotchange=${this._onSlotChange}></slot>
              ${Array.from({ length: this._cardCount }, (_, i) => {
                return html`<div class="dmd-carousel-slide">
                  <slot name="dmd-carousel-${i}"></slot>
                </div>`;
              })}
              ${Array.from({ length: this.cloneCount }, (_, k) => {
                // Wrap-around slides: the duplicates of the first cards that
                // close the loop after the last card (see _syncClones).
                return html`<div class="dmd-carousel-slide" aria-hidden="true">
                  <slot name="dmd-carousel-clone-${k}"></slot>
                </div>`;
              })}
            </div>
          </div>
          <div class="dmd-sr-only" aria-live="polite">Showing ${this.windowLabel} of ${this._cardCount}</div>
          <div class="dmd-carousel-controls">
            <button type="button" class="dmd-carousel-btn" @click=${this._goPrev} aria-label="Previous cards">
              <span aria-hidden="true">‹</span>
            </button>
            <div class="dmd-carousel-dots" role="tablist" aria-label="Choose card">
              ${Array.from({ length: this._cardCount }, (_, i) => {
                return html`<button
                  type="button"
                  class="dmd-carousel-dot${i === this._active ? " active" : ""}"
                  role="tab"
                  aria-selected=${i === this._active}
                  aria-label="Go to card ${i + 1}"
                  @click=${() => this._scrollTo(i)}
                ></button>`;
              })}
            </div>
            <button type="button" class="dmd-carousel-btn" @click=${this._goNext} aria-label="Next cards">
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </section>
      `;
    }

    return html`
      <div class="dmd-card-grid dmd-card-grid-${this.gridCols}">
        <slot @slotchange=${this._onSlotChange}></slot>
      </div>
    `;
  }
}

customElements.define("dmd-card-grid", DmdCardGrid);
