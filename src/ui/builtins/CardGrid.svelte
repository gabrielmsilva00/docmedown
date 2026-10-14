<svelte:options customElement={{ tag: "dmd-card-grid" }} />
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { carouselWindow, clampCarouselCols, resolveCarouselPerView } from "./carousel";
  import { adoptSharedStyles } from "./shared-styles";
  import { prefersReducedMotion, smoothScroll } from "../../runtime/motion";

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
  let childOffsets: number[] = [];
  let offsetsKey = "";
  let scrollRaf = 0;
  let navigation: { stop: () => void; finished: Promise<void> } | null = null;
  let navigationIndex: number | null = null;
  let offsetRetry = 0;
  let trackRef = $state<HTMLElement>();
  let resizeObserver: ResizeObserver | null = null;

  function syncSlideSlots() {
    if (!trackRef) return;
    const existing = trackRef.querySelectorAll(".dmd-carousel-slide");
    if (existing.length === cardCount && cardCount > 0) return;
    existing.forEach((s) => s.remove());
    for (let i = 0; i < cardCount; i++) {
      const slide = document.createElement("div");
      slide.className = "dmd-carousel-slide";
      const slot = document.createElement("slot");
      slot.name = `dmd-carousel-${i}`;
      slide.appendChild(slot);
      trackRef.appendChild(slide);
    }
  }
  let observing = false;

  const gridCols = $derived(clampCarouselCols(Number(cols) || 2, 2));
  const maxPerView = $derived(clampCarouselCols(Number(carouselcols) || Number(cols) || 2, 2));
  const isCarousel = $derived(cardCount > gridCols);
  const positions = $derived(carouselWindow(cardCount, perView, active).positions);

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
    return Array.from(host.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
  }

  function cacheOffsets() {
    const shadow = (trackRef || (root?.getRootNode() as ShadowRoot | undefined));
    const slides = shadow?.querySelectorAll<HTMLElement>(".dmd-carousel-slide");
    if (!slides || slides.length === 0 || !viewport) return;
    const key = `${slides.length}:${perView}:${viewport.clientWidth}`;
    if (key === offsetsKey && childOffsets.length > 0 && (slides.length <= 1 || childOffsets[1] > 0)) return;
    const offsets = [...slides].slice(0, cardCount).map((slide) => slide.offsetLeft);
    if (offsets.length > 1 && offsets[1] === 0) {
      // The slotted slides may not have laid out yet; never schedule an unbounded RAF loop.
      if (!offsetRetry) offsetRetry = requestAnimationFrame(() => { offsetRetry = 0; cacheOffsets(); });
      return;
    }
    offsetsKey = key;
    childOffsets = offsets;
  }

  function updatePerView() {
    if (!viewport) return;
    navigation?.stop();
    navigation = null;
    navigationIndex = null;
    const next = resolveCarouselPerView(maxPerView, viewport.clientWidth);
    if (perView !== next) {
      perView = next;
    }
    if (isCarousel) {
      syncSlideSlots();
    }
    cacheOffsets();
    if (resizeObserver && viewport && !observing) {
      resizeObserver.observe(viewport);
      observing = true;
    }
  }

  function scrollToSlide(index: number, behavior: ScrollBehavior = "smooth") {
    if (!viewport) return;
    if (childOffsets.length === 0) cacheOffsets();
    const rawOffset = childOffsets[index];
    if (rawOffset == null) return;
    navigation?.stop();
    navigation = null;
    navigationIndex = null;
    active = index;
    const baseOffset = childOffsets[0] || 0;
    const offset = Math.max(0, rawOffset - baseOffset);
    if (prefersReducedMotion() || behavior === "instant" || behavior === "auto") {
      viewport.scrollLeft = offset;
      return;
    }
    navigationIndex = index;
    const handle = smoothScroll(viewport, offset, { duration: 320 });
    navigation = handle;
    void handle.finished.then(() => {
      if (navigation === handle) {
        navigation = null;
        navigationIndex = null;
        onScroll();
      }
    });
  }

  function goPrev() {
    scrollToSlide(Math.max(0, active - 1));
  }

  function goNext() {
    scrollToSlide(Math.min(positions - 1, active + 1));
  }

  function onScroll() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      if (!viewport) return;
      if (navigationIndex !== null) return;
      if (childOffsets.length === 0) cacheOffsets();
      if (childOffsets.length === 0) return;
      const baseOffset = childOffsets[0] || 0;
      const viewportLeft = viewport.scrollLeft;
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < Math.min(positions, childOffsets.length); i++) {
        const slidePos = Math.max(0, childOffsets[i] - baseOffset);
        const dist = Math.abs(slidePos - viewportLeft);
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
      navigation?.stop();
      navigation = null;
      navigationIndex = null;
      offsetsKey = "";
      childOffsets = [];
    }

    if (!isCarousel) {
      cards.forEach((el) => el.removeAttribute("slot"));
      perView = gridCols;
      return;
    }

    cards.forEach((el, i) => el.setAttribute("slot", `dmd-carousel-${i}`));
    updatePerView();
  }

  $effect(() => {
    if (cards.length === 0) {
      const current = lightCards();
      if (current.length > 0) {
        cards = current;
        cardCount = current.length;
      }
    }
    if (isCarousel) {
      if (trackRef && viewport && cardCount > 0) {
        cards.forEach((el, i) => el.setAttribute("slot", `dmd-carousel-${i}`));
        const next = resolveCarouselPerView(maxPerView, viewport.clientWidth);
        if (perView !== next) {
          perView = next;
        }
        syncSlideSlots();
        cacheOffsets();
        if (resizeObserver && !observing) {
          resizeObserver.observe(viewport);
          observing = true;
        }
      }
    } else {
      cards.forEach((el) => el.removeAttribute("slot"));
      if (resizeObserver && observing) {
        resizeObserver.disconnect();
        observing = false;
      }
    }
  });

  onMount(() => {
    adoptSharedStyles(root);
    const host = getHost();
    if (host) host.addEventListener("keydown", onKeyDown);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => updatePerView());
      if (viewport && isCarousel && !observing) {
        resizeObserver.observe(viewport);
        observing = true;
      }
    }
  });

  onDestroy(() => {
    navigation?.stop();
    if (offsetRetry) cancelAnimationFrame(offsetRetry);
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
          <slot onslotchange={onSlotChange} style="display: contents;"></slot>
        </div>
      </div>
      <div class="dmd-sr-only" aria-live="polite">Showing {windowLabel} of {cardCount}</div>
      <div class="dmd-carousel-controls">
        <button
          type="button"
          class="dmd-carousel-btn"
          onclick={goPrev}
          disabled={active <= 0}
          aria-label="Previous cards"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <div class="dmd-carousel-dots" role="tablist" aria-label="Choose card">
          {#each Array.from({ length: positions }) as _, i}
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
        <button
          type="button"
          class="dmd-carousel-btn"
          onclick={goNext}
          disabled={active >= positions - 1}
          aria-label="Next cards"
        >
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
