<svelte:options customElement={{ tag: "dmd-card-grid" }} />
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { buildWrapClones, carouselWindow, clampCarouselCols, resolveCarouselPerView } from "./carousel";
  import { adoptSharedStyles } from "./shared-styles";

  const CAROUSEL_CLONE_ATTR = "data-dmd-carousel-clone";

  function cloneSlideCard(source: HTMLElement): HTMLElement {
    const cloneable = source as HTMLElement & { cloneCard?: () => HTMLElement };
    const clone =
      typeof cloneable.cloneCard === "function" ? cloneable.cloneCard() : (source.cloneNode(true) as HTMLElement);
    clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    return clone;
  }

  let {
    cols = 2,
    carouselcols = 0,
  }: {
    cols?: number;
    carouselcols?: number;
  } = $props();

  let root = $state<HTMLElement>();
  let viewport = $state<HTMLElement>();
  let cardCount = $state(0);
  let perView = $state(2);
  let active = $state(0);
  let cards: HTMLElement[] = [];
  let clones: HTMLElement[] = [];
  let cloneKey = "";
  let childOffsets: number[] = [];
  let offsetsKey = "";
  let scrollRaf = 0;
  let trackRef = $state<HTMLElement>();
  let resizeObserver: ResizeObserver | null = null;

  function syncSlideSlots() {
    if (!trackRef) return;
    trackRef.querySelectorAll(".dmd-carousel-slide").forEach((s) => s.remove());
    for (let i = 0; i < cardCount; i++) {
      const slide = document.createElement("div");
      slide.className = "dmd-carousel-slide";
      const slot = document.createElement("slot");
      slot.name = `dmd-carousel-${i}`;
      slide.appendChild(slot);
      trackRef.appendChild(slide);
    }
    for (let k = 0; k < cloneCount; k++) {
      const slide = document.createElement("div");
      slide.className = "dmd-carousel-slide";
      slide.setAttribute("aria-hidden", "true");
      const slot = document.createElement("slot");
      slot.name = `dmd-carousel-clone-${k}`;
      slide.appendChild(slot);
      trackRef.appendChild(slide);
    }
  }
  let observing = false;

  const gridCols = $derived(clampCarouselCols(Number(cols) || 2, 2));
  const maxPerView = $derived(clampCarouselCols(Number(carouselcols) || Number(cols) || 2, 2));
  const isCarousel = $derived(cardCount > gridCols);
  const cloneCount = $derived(buildWrapClones(cardCount, perView).length);

  const windowLabel = $derived.by(() => {
    const shown = carouselWindow(cardCount, perView, active).indices.map((index) => index + 1);
    if (shown.length === 0) return "no cards";
    if (shown.length === 1) return `card ${shown[0]}`;
    return `cards ${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  });

  function getHost(): HTMLElement | null {
    if (!root) return null;
    const node = root.getRootNode();
    if (node instanceof ShadowRoot) return node.host as HTMLElement;
    return root.parentElement;
  }

  function lightCards(): HTMLElement[] {
    const host = getHost();
    if (!host) return [];
    return Array.from(host.children).filter(
      (child): child is HTMLElement => !child.hasAttribute(CAROUSEL_CLONE_ATTR)
    );
  }

  function clearClones() {
    for (const clone of clones) clone.remove();
    clones = [];
    cloneKey = "";
  }

  function syncClones() {
    const host = getHost();
    if (!host) return;
    const key = `${cardCount}:${perView}`;
    if (key === cloneKey) return;
    clearClones();
    cloneKey = key;
    buildWrapClones(cardCount, perView).forEach((cardIndex, slotIndex) => {
      const source = cards[cardIndex];
      if (!source) return;
      const clone = cloneSlideCard(source);
      clone.setAttribute(CAROUSEL_CLONE_ATTR, "");
      clone.setAttribute("slot", `dmd-carousel-clone-${slotIndex}`);
      clone.setAttribute("aria-hidden", "true");
      clone.setAttribute("inert", "");
      host.appendChild(clone);
      clones.push(clone);
    });
    offsetsKey = "";
  }

  function cacheOffsets() {
    const shadow = root?.getRootNode() as ShadowRoot | undefined;
    const slides = shadow?.querySelectorAll<HTMLElement>(".dmd-carousel-slide");
    if (!slides || slides.length === 0 || !viewport) return;
    const key = `${slides.length}:${perView}:${viewport.clientWidth}`;
    if (key === offsetsKey) return;
    offsetsKey = key;
    childOffsets = [...slides].slice(0, cardCount).map((slide) => slide.offsetLeft);
  }

  function updatePerView() {
    if (!viewport) return;
    const next = resolveCarouselPerView(maxPerView, viewport.clientWidth);
    if (perView !== next) {
      perView = next;
    }
    if (isCarousel) {
      syncSlideSlots();
      syncClones();
    }
    cacheOffsets();
    if (resizeObserver && viewport && !observing) {
      resizeObserver.observe(viewport);
      observing = true;
    }
  }

  function scrollToSlide(index: number, behavior: ScrollBehavior = "smooth") {
    if (!viewport) return;
    const offset = childOffsets[index];
    if (offset == null) return;
    active = index;
    viewport.scrollTo({ left: offset, behavior });
  }

  function goPrev() {
    scrollToSlide(active <= 0 ? cardCount - 1 : active - 1);
  }

  function goNext() {
    scrollToSlide(active >= cardCount - 1 ? 0 : active + 1);
  }

  function onScroll() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      if (!viewport) return;
      const viewportLeft = viewport.scrollLeft;
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < childOffsets.length; i++) {
        const dist = Math.abs(childOffsets[i] - viewportLeft);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
      if (closest !== active) {
        active = closest;
      }
    });
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
  }

  function onSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    if (slot.name) return;
    const currentCards = lightCards();
    if (currentCards.length === 0) return;
    const sameCards =
      currentCards.length === cards.length && currentCards.every((card, i) => card === cards[i]);
    cards = currentCards;
    cardCount = currentCards.length;
    if (!sameCards) {
      offsetsKey = "";
      childOffsets = [];
      cloneKey = "";
    }

    if (!isCarousel) {
      clearClones();
      cards.forEach((el) => el.removeAttribute("slot"));
      perView = gridCols;
      return;
    }

    cards.forEach((el, i) => el.setAttribute("slot", `dmd-carousel-${i}`));
    updatePerView();
  }

  onMount(() => {
    adoptSharedStyles(root);
    const host = getHost();
    if (host) host.addEventListener("keydown", onKeyDown);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => updatePerView());
    }

    void Promise.resolve().then(() => {
      const initialCards = lightCards();
      if (initialCards.length > 0) {
        cardCount = initialCards.length;
        cards = initialCards;
        if (isCarousel) {
          cards.forEach((el, i) => el.setAttribute("slot", `dmd-carousel-${i}`));
          updatePerView();
        }
      }
    });
  });

  onDestroy(() => {
    const host = getHost();
    if (host) host.removeEventListener("keydown", onKeyDown);
    if (resizeObserver) resizeObserver.disconnect();
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
  });
</script>

<div bind:this={root} style="display: contents;">
  {#if isCarousel}
    <section
      class="dmd-card-carousel dmd-card-grid-{gridCols}"
      data-per-view={perView}
      aria-roledescription="carousel"
      aria-label="Card carousel, {cardCount} cards"
      tabindex="-1"
    >
      <div
        bind:this={viewport}
        class="dmd-carousel-viewport"
        onscroll={onScroll}
      >
        <div bind:this={trackRef} class="dmd-carousel-track" style="--dmd-carousel-per-view: {perView};">
          <slot onslotchange={onSlotChange}></slot>
        </div>
      </div>
      <div class="dmd-sr-only" aria-live="polite">Showing {windowLabel} of {cardCount}</div>
      <div class="dmd-carousel-controls">
        <button type="button" class="dmd-carousel-btn" onclick={goPrev} aria-label="Previous cards">
          <span aria-hidden="true">‹</span>
        </button>
        <div class="dmd-carousel-dots" role="tablist" aria-label="Choose card">
          {#each Array.from({ length: cardCount }) as _, i}
            <button
              type="button"
              class="dmd-carousel-dot{i === active ? ' active' : ''}"
              role="tab"
              aria-selected={i === active}
              aria-label="Go to card {i + 1}"
              onclick={() => scrollToSlide(i)}
            ></button>
          {/each}
        </div>
        <button type="button" class="dmd-carousel-btn" onclick={goNext} aria-label="Next cards">
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </section>
  {:else}
    <div class="dmd-card-grid dmd-card-grid-{gridCols}">
      <slot onslotchange={onSlotChange}></slot>
    </div>
  {/if}
</div>
