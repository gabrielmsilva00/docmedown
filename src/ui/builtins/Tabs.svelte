<svelte:options customElement={{ tag: "dmd-tabs" }} />
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { adoptSharedStyles } from "./shared-styles";

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
  let activeIndex = $state(0);
  let tabs = $state<Array<{ label: string; icon: string; value: string }>>([]);
  let initialized = false;
  let baseId = `dmd${Math.random().toString(36).slice(2, 10)}`;
  let resizeObserver: ResizeObserver | null = null;
  let measureRaf = 0;

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
      label: tab.getAttribute("label") || `Tab ${i + 1}`,
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
    const tabEls = readTabs();
    tabEls.forEach((tab, index) => {
      if (index === activeIndex) {
        tab.style.display = "";
        tab.removeAttribute("hidden");
      } else {
        tab.style.display = "none";
        tab.removeAttribute("hidden");
      }
    });
    scheduleMeasure();
  }

  function scheduleMeasure() {
    if (measureRaf) cancelAnimationFrame(measureRaf);
    measureRaf = requestAnimationFrame(() => {
      measureRaf = 0;
      if (!headerRef) return;
      const activeBtn = headerRef.children[activeIndex] as HTMLElement;
      if (!activeBtn) return;
      const btnRect = activeBtn.getBoundingClientRect();
      const headerRect = headerRef.getBoundingClientRect();
      const left = btnRect.left - headerRect.left;
      const width = btnRect.width;
      headerRef.style.setProperty("--dmd-tab-ind-x", `${left}px`);
      headerRef.style.setProperty("--dmd-tab-ind-w", `${width}px`);
    });
  }

  function selectTab(index: number) {
    if (index === activeIndex || index < 0 || index >= tabs.length) return;
    activeIndex = index;
    applyVisibility();

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
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      selectTab((activeIndex + 1) % tabs.length);
      const nextBtn = headerRef?.children[(activeIndex + 1) % tabs.length] as HTMLElement;
      nextBtn?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      selectTab((activeIndex - 1 + tabs.length) % tabs.length);
      const prevBtn = headerRef?.children[(activeIndex - 1 + tabs.length) % tabs.length] as HTMLElement;
      prevBtn?.focus();
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
    `dmd-tabs dmd-tabs-${effectiveVariant}${groupid ? " dmd-tabs-grouped" : ""}`
  );

  onMount(() => {
    adoptSharedStyles(root);
    window.addEventListener("dmd-tabs-change", onSync);
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => scheduleMeasure());
      if (headerRef) resizeObserver.observe(headerRef);
    }
    void Promise.resolve().then(() => {
      initTabs();
    });
  });

  onDestroy(() => {
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
    {#each tabs as tab, index}
      <button
        type="button"
        role="tab"
        id="{baseId}-tab-{index}"
        class="dmd-tab-btn{index === activeIndex ? ' active' : ''}"
        aria-selected={index === activeIndex}
        aria-controls="{baseId}-panel-{index}"
        tabindex={index === activeIndex ? 0 : -1}
        onclick={() => selectTab(index)}
      >
        {#if tab.icon}
          <span class="dmd-tab-icon" aria-hidden="true">{@html tab.icon}</span>
        {/if}
        <span>{tab.label}</span>
      </button>
    {/each}
  </div>
  <div class="dmd-tabs-body" role="tabpanel" id="{baseId}-panel-{activeIndex}" aria-labelledby="{baseId}-tab-{activeIndex}">
    <slot onslotchange={onSlotChange}></slot>
  </div>
</div>
