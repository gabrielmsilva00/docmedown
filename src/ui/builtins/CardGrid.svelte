<svelte:options customElement={{ tag: "dmd-card-grid" }} />
<script lang="ts">
  import { onMount, onDestroy, tick, untrack } from "svelte";
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
  let mutationObserver: MutationObserver | null = null;
  let slidesKey = "";
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  let offsetAttempts = 0;

  function stopNavigation() {
    navigation?.stop();
    navigation = null;
    navigationIndex = null;
  }

  function jumpTo(index: number) {
    if (!viewport || childOffsets[index] == null) return;
    const snap = viewport.style.scrollSnapType;
    viewport.style.scrollSnapType = "none";
    viewport.scrollLeft = childOffsets[index];
    // Commit the jump before restoring snap, without painting the duplicate window.
    void viewport.offsetWidth;
    viewport.style.scrollSnapType = snap;
  }

  function syncSlideSlots() {
    if (!trackRef) return;
    const key = `${cardCount}:${perView}`;
    const existing = trackRef.querySelectorAll(".dmd-carousel-slide");
    if (slidesKey === key && existing.length > 0) return;
    stopNavigation();
    slidesKey = key;
    offsetsKey = "";
    childOffsets = [];
    offsetAttempts = 0;
    existing.forEach((s) => s.remove());
    for (let physical = 0; physical < cardCount + 2 * perView; physical++) {
      const i = ((physical - perView) % cardCount + cardCount) % cardCount;
      const slide = document.createElement("div");
      slide.className = "dmd-carousel-slide";
      if (physical >= perView && physical < perView + cardCount) {
        const slot = document.createElement("slot");
        slot.name = `dmd-carousel-${i}`;
        slide.appendChild(slot);
      } else {
        const card = cards[i] as HTMLElement & { cloneCard?: () => HTMLElement };
        const copy = card.cloneCard?.() ?? card.cloneNode(true) as HTMLElement;
        copy.removeAttribute("slot");
        copy.removeAttribute("id");
        copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
        slide.setAttribute("aria-hidden", "true");
        slide.inert = true;
        slide.appendChild(copy);
      }
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
    // Match native start snapping, including the viewport's horizontal padding.
    const offsets = [...slides].map((slide) => slide.offsetLeft);
    if (offsets.length > 1 && offsets[1] === 0) {
      // The slotted slides may not have laid out yet; never schedule an unbounded RAF loop.
      if (!offsetRetry && offsetAttempts++ < 10) offsetRetry = requestAnimationFrame(() => { offsetRetry = 0; cacheOffsets(); });
      return;
    }
    offsetsKey = key;
    childOffsets = offsets;
    active = carouselWindow(cardCount, perView, active).index;
    jumpTo(perView + active);
  }

  async function updatePerView() {
    if (!viewport) return;
    stopNavigation();
    const next = resolveCarouselPerView(maxPerView, viewport.clientWidth);
    if (perView !== next) {
      perView = next;
    }
    // Wait until the new flex-basis variable reaches the DOM before measuring.
    await tick();
    if (!viewport) return;
    offsetsKey = "";
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
    // Finish an interrupted boundary crossing at its equivalent real window
    // before starting the next step (including rapid repeated clicks).
    if (navigationIndex !== null) {
      stopNavigation();
      jumpTo(perView + active);
    }
    const target = carouselWindow(cardCount, perView, index).index;
    const physical = index < 0 ? perView - 1 : index >= positions ? perView + cardCount : perView + target;
    const rawOffset = childOffsets[physical];
    if (rawOffset == null) return;
    navigation?.stop();
    navigation = null;
    navigationIndex = null;
    active = target;
    const offset = rawOffset;
    if (prefersReducedMotion() || behavior === "instant" || behavior === "auto") {
      jumpTo(perView + target);
      return;
    }
    navigationIndex = physical;
    const handle = smoothScroll(viewport, offset, { duration: 320 });
    navigation = handle;
    void handle.finished.then(() => {
      if (navigation === handle) {
        navigation = null;
        navigationIndex = null;
        settleScroll();
      }
    });
  }

  function goPrev() {
    scrollToSlide(active - 1);
  }

  function goNext() {
    scrollToSlide(active + 1);
  }

  function onScroll() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settleScroll, 160);
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      if (!viewport) return;
      if (navigationIndex !== null) return;
      if (childOffsets.length === 0) cacheOffsets();
      if (childOffsets.length === 0) return;
      const viewportLeft = viewport.scrollLeft;
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < childOffsets.length; i++) {
        const slidePos = childOffsets[i];
        const dist = Math.abs(slidePos - viewportLeft);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
      active = carouselWindow(cardCount, perView, closest - perView).index;
    });
  }

  function settleScroll() {
    if (!viewport || navigationIndex !== null || childOffsets.length === 0) return;
    let closest = 0;
    for (let i = 1; i < childOffsets.length; i++) {
      if (Math.abs(childOffsets[i] - viewport.scrollLeft) < Math.abs(childOffsets[closest] - viewport.scrollLeft)) closest = i;
    }
    active = carouselWindow(cardCount, perView, closest - perView).index;
    if (closest < perView || closest >= perView + cardCount) jumpTo(perView + active);
  }

  function onKeyDown(event: KeyboardEvent) {
    const target = event.composedPath()[0];
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
  }

  function onSlotChange(event: Event) {
    const slot = event.target instanceof HTMLSlotElement ? event.target : null;
    if (slot?.name) return;
    const currentCards = lightCards();
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
      slidesKey = "";
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
        untrack(cacheOffsets);
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
    if (host) {
      host.addEventListener("keydown", onKeyDown);
      mutationObserver = new MutationObserver(() => onSlotChange(new Event("change")));
      mutationObserver.observe(host, { childList: true });
    }

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
    mutationObserver?.disconnect();
    clearTimeout(settleTimer);
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
        onscrollend={settleScroll}
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
          disabled={positions <= 1}
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
          disabled={positions <= 1}
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
