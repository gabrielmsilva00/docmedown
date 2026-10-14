<svelte:options customElement={{ tag: "dmd-tabs" }} />
<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { adoptSharedStyles } from "./shared-styles";
  import { animate, prefersReducedMotion } from "../../runtime/motion";

  let {
    defaultindex = 0,
    groupid = "",
    type = "",
    variant = "",
  }: {
    defaultindex?: number | string;
    groupid?: string;
    type?: string;
    variant?: string;
  } = $props();

  let root = $state<HTMLElement>();
  let headerRef = $state<HTMLElement>();
  let indicatorRef = $state<HTMLElement>();
  let bodyRef = $state<HTMLElement>();
  let activeIndex = $state(0);
  let tabs = $state<Array<{ label: string; icon: string; value: string }>>([]);
  let initialized = false;
  let baseId = `dmd${Math.random().toString(36).slice(2, 10)}`;
  let resizeObserver: ResizeObserver | null = null;
  let measureRaf = 0;
  let panelAnimation: { stop: () => void } | null = null;
  let indicatorAnimation: { stop: () => void } | null = null;
  let indicatorPosition: { x: number; width: number } | null = null;

  function getHost(): HTMLElement | null {
    if (!root) return null;
    const node = root.getRootNode();
    if (node instanceof ShadowRoot) return node.host as HTMLElement;
    return root.parentElement;
  }

  function readTabs(): HTMLElement[] {
    const host = getHost();
    if (!host) return [];
    return Array.from(host.children).filter((el) => {
      const tag = el.tagName.toLowerCase();
      return tag === "dmd-tab" || tag === "dmd-item";
    }) as HTMLElement[];
  }

  function initTabs() {
    const tabEls = readTabs();
    if (tabEls.length === 0) return;
    tabs = tabEls.map((tab, i) => ({
      label: tab.getAttribute("label") || "",
      value: tab.getAttribute("value") || tab.getAttribute("label") || String(i),
      icon: tab.getAttribute("icon") || "",
    }));

    if (groupid && typeof localStorage !== "undefined") {
      try {
        const stored = localStorage.getItem(`dmd-tabs-${groupid}`);
        if (stored) {
          const match = tabs.findIndex((t) => t.value === stored || t.label === stored);
          if (match !== -1) {
            activeIndex = match;
            applyVisibility();
            initialized = true;
            return;
          }
        }
      } catch {}
    }

    const initial = Number(defaultindex) || 0;
    activeIndex = Math.max(0, Math.min(initial, Math.max(0, tabs.length - 1)));
    applyVisibility();
    initialized = true;
  }

  function applyVisibility() {
    panelAnimation?.stop();
    panelAnimation = null;
    const tabEls = readTabs();
    tabEls.forEach((tab, index) => {
      if (index === activeIndex) {
        tab.style.display = "";
        tab.removeAttribute("hidden");
        if (initialized && bodyRef && !prefersReducedMotion()) {
          // Animate the actual panel surface, not the display:contents custom-element host.
          const target = bodyRef;
          const anim = animate(
            target,
            {
              opacity: [0, 1],
              transform: ["translate3d(0, 8px, 0)", "translate3d(0, 0, 0)"],
            },
            { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
          );
          panelAnimation = anim;
          anim.then(() => {
            if (panelAnimation === anim) {
              panelAnimation = null;
              target.style.removeProperty("transform");
              target.style.removeProperty("opacity");
            }
          });
        }
      } else {
        tab.style.display = "none";
        tab.removeAttribute("hidden");
      }
    });
    scheduleMeasure();
  }

  function getTabButtons(): HTMLButtonElement[] {
    if (!headerRef) return [];
    return Array.from(headerRef.querySelectorAll<HTMLButtonElement>(".dmd-tab-btn"));
  }

  function measureNow() {
    if (!headerRef) return;
    const buttons = getTabButtons();
    const activeBtn = buttons[activeIndex];
    if (!activeBtn) return;
    if (activeBtn.offsetWidth === 0) return;
    const x = activeBtn.offsetLeft;
    const width = activeBtn.offsetWidth;
    const previous = indicatorPosition;
    if (previous?.x === x && previous.width === width) return;
    indicatorAnimation?.stop();
    indicatorPosition = { x, width };
    headerRef.style.setProperty("--dmd-tab-ind-x", `${x}px`);
    headerRef.style.setProperty("--dmd-tab-ind-w", `${width}px`);
    // FLIP: one layout measurement, then compositor-only movement/resize.
    if (previous && indicatorRef && effectiveVariant !== "postit" && !prefersReducedMotion()) {
      const anim = animate(indicatorRef, {
        transform: [
          `translateX(${previous.x - x}px) scaleX(${previous.width / width})`,
          "translateX(0) scaleX(1)",
        ],
      }, { duration: 0.26, ease: [0.16, 1, 0.3, 1] });
      indicatorAnimation = anim;
      anim.then(() => {
        if (indicatorAnimation === anim) {
          indicatorAnimation = null;
          indicatorRef.style.removeProperty("transform");
        }
      });
    }
  }

  function scheduleMeasure() {
    if (measureRaf) return;
    measureRaf = requestAnimationFrame(() => {
      measureRaf = 0;
      measureNow();
    });
  }

  function selectTab(index: number, focus = false) {
    if (index === activeIndex || index < 0 || index >= tabs.length) return;
    activeIndex = index;
    applyVisibility();
    measureNow();

    if (focus) {
      const buttons = getTabButtons();
      buttons[index]?.focus();
    }

    const buttons = getTabButtons();
    const activeBtn = buttons[index];
    if (activeBtn && typeof activeBtn.scrollIntoView === "function") {
      activeBtn.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }

    if (groupid) {
      const activeTab = tabs[index];
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem(`dmd-tabs-${groupid}`, activeTab.value || activeTab.label);
        } catch {}
      }
      window.dispatchEvent(
        new CustomEvent("dmd-tabs-change", {
          detail: { groupId: groupid, value: activeTab.value, label: activeTab.label },
        })
      );
    }
  }

  function onSync(e: Event) {
    const ce = e as CustomEvent<{ groupId: string; value: string; label: string }>;
    if (!ce.detail || ce.detail.groupId !== groupid) return;
    const match = tabs.findIndex((t) => t.value === ce.detail.value || t.label === ce.detail.label);
    if (match !== -1 && match !== activeIndex) {
      activeIndex = match;
      applyVisibility();
      measureNow();
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    const buttons = getTabButtons();
    if (buttons.length === 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (activeIndex + 1) % buttons.length;
      selectTab(next, true);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (activeIndex - 1 + buttons.length) % buttons.length;
      selectTab(prev, true);
    } else if (e.key === "Home") {
      e.preventDefault();
      selectTab(0, true);
    } else if (e.key === "End") {
      e.preventDefault();
      selectTab(buttons.length - 1, true);
    }
  }

  function onSlotChange() {
    initTabs();
  }

  const effectiveVariant = $derived(
    variant ||
      (type === "underline" || type === "pills" || type === "postit" ? type : "recessed")
  );

  const wrapperClass = $derived(
    `dmd-tabs dmd-tabs-wrapper dmd-tabs-${effectiveVariant}${groupid ? " dmd-tabs-grouped" : ""}`
  );

  onMount(() => {
    adoptSharedStyles(root);
    window.addEventListener("dmd-tabs-change", onSync);
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => scheduleMeasure());
      if (headerRef) resizeObserver.observe(headerRef);
    }
    void Promise.resolve().then(async () => {
      initTabs();
      await tick();
      measureNow();
      requestAnimationFrame(() => measureNow());
    });
  });

  onDestroy(() => {
    panelAnimation?.stop();
    indicatorAnimation?.stop();
    if (typeof window !== "undefined") {
      window.removeEventListener("dmd-tabs-change", onSync);
    }
    if (resizeObserver) resizeObserver.disconnect();
    if (measureRaf) cancelAnimationFrame(measureRaf);
  });
</script>

<div bind:this={root} class={wrapperClass}>
  <div
    bind:this={headerRef}
    class="dmd-tabs-header"
    role="tablist"
    tabindex="0"
    aria-label="Content tabs"
    onkeydown={onKeyDown}
  >
    <span bind:this={indicatorRef} class="dmd-tab-indicator" aria-hidden="true"></span>
    {#each tabs as tab, index}
      {@const active = index === activeIndex}
      {@const name = tab.value || tab.label || `Tab ${index + 1}`}
      {@const hasLabel = !!tab.label}
      <button
        type="button"
        role="tab"
        id="{baseId}-tab-{index}"
        class="dmd-tab-btn{active ? ' active' : ''}{hasLabel ? '' : ' dmd-tab-btn-icon'}"
        aria-selected={active}
        aria-controls="{baseId}-panel-{index}"
        aria-label={hasLabel ? undefined : name}
        tabindex={active ? 0 : -1}
        onclick={() => selectTab(index)}
      >
        {#if tab.icon}
          <span class="dmd-tab-icon" aria-hidden="true">{@html tab.icon}</span>
        {/if}
        {#if hasLabel}
          <span class="dmd-tab-label">{tab.label}</span>
        {/if}
      </button>
    {/each}
  </div>
  <div bind:this={bodyRef} class="dmd-tabs-body dmd-tab-panel" role="tabpanel" id="{baseId}-panel-{activeIndex}" aria-labelledby="{baseId}-tab-{activeIndex}">
    <slot onslotchange={onSlotChange}></slot>
  </div>
</div>
