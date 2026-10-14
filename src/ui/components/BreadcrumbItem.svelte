<script lang="ts">
  import { doc } from "../doc-context.svelte";

  let {
    label,
    index,
    isHome = false,
    isLast = false,
    isScrolled = false,
  }: {
    label: string;
    index: number;
    isHome?: boolean;
    isLast?: boolean;
    isScrolled?: boolean;
  } = $props();

  let isOpen = $state(false);
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let openTimer: ReturnType<typeof setTimeout> | undefined;
  let containerEl = $state<HTMLElement | null>(null);

  const possiblePaths = $derived(doc.getPossiblePaths(index, label));

  function handleMouseEnter() {
    clearTimeout(closeTimer);
    if (possiblePaths.length > 0) {
      openTimer = setTimeout(() => {
        isOpen = true;
      }, 140);
    }
  }

  function handleMouseLeave() {
    clearTimeout(openTimer);
    closeTimer = setTimeout(() => {
      isOpen = false;
    }, 200);
  }

  function handleClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    // If the dropdown arrow is clicked specifically, toggle the menu
    if (target.classList.contains("dmd-crumb-arrow") || target.closest(".dmd-crumb-arrow")) {
      e.stopPropagation();
      e.preventDefault();
      if (possiblePaths.length > 0) {
        isOpen = !isOpen;
      }
      return;
    }

    if (isHome) {
      if (doc.home?.kind === "href" && doc.home.href) {
        window.location.href = doc.home.href;
      } else if (doc.home?.kind === "route" && doc.home.slug) {
        doc.navigate(doc.home.slug);
      } else {
        doc.navigate("README");
      }
      isOpen = false;
    } else if (!isLast) {
      const slugParts = doc.currentSlug.split("/").filter(Boolean);
      const targetSlug = slugParts.slice(0, index).join("/");
      if (targetSlug) {
        doc.navigate(targetSlug);
      }
      isOpen = false;
    } else {
      if (possiblePaths.length > 0) {
        isOpen = !isOpen;
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      isOpen = false;
    } else if (e.key === "ArrowDown" && !isOpen && possiblePaths.length > 0) {
      e.preventDefault();
      isOpen = true;
    }
  }

  $effect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerEl && !containerEl.contains(e.target as Node)) {
        isOpen = false;
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  });
</script>

<div
  class="dmd-crumb-wrapper"
  bind:this={containerEl}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onkeydown={handleKeyDown}
  role="none"
>
  <button
    type="button"
    class="dmd-nav-crumb dmd-crumb"
    class:current={isLast}
    class:has-paths={possiblePaths.length > 0}
    class:open={isOpen}
    aria-expanded={isOpen}
    aria-haspopup={possiblePaths.length > 0 ? "menu" : undefined}
    tabindex={isScrolled ? 0 : -1}
    title={isHome ? "Documentation home" : label}
    onclick={handleClick}
  >
    {#if isHome}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      <span>Docs</span>
    {:else}
      <span>{label.replace(/[-_]/g, " ")}</span>
    {/if}

    {#if possiblePaths.length > 1}
      <span class="dmd-crumb-arrow" aria-hidden="true">▾</span>
    {/if}
  </button>

  {#if isOpen && possiblePaths.length > 0}
    <div
      class="dmd-crumb-popover"
      role="menu"
      aria-label="Sections under {label}"
    >
      <div class="dmd-crumb-popover-header">
        <span class="dmd-crumb-popover-scope">
          {#if isHome}
            Docs Overview
          {:else if isLast}
            Related in {label.replace(/[-_]/g, " ")}
          {:else}
            Section: {label.replace(/[-_]/g, " ")}
          {/if}
        </span>
        <span class="dmd-crumb-popover-count">{possiblePaths.length} {possiblePaths.length === 1 ? 'page' : 'pages'}</span>
      </div>

      <div class="dmd-crumb-popover-list">
        {#each possiblePaths as item (item.slug)}
          <button
            type="button"
            class="dmd-crumb-popover-item"
            class:selected={item.slug === doc.currentSlug}
            role="menuitem"
            onclick={() => {
              isOpen = false;
              doc.navigate(item.slug);
            }}
          >
            <span class="dmd-crumb-item-dot" aria-hidden="true">
              {#if item.slug === doc.currentSlug}●{:else}○{/if}
            </span>
            <div class="dmd-crumb-item-info">
              <span class="dmd-crumb-item-title">{item.title}</span>
              <span class="dmd-crumb-item-slug">{item.slug}</span>
            </div>
            {#if item.slug === doc.currentSlug}
              <span class="dmd-crumb-item-badge">Active</span>
            {:else if item.readingTimeMinutes}
              <span class="dmd-crumb-item-meta">{item.readingTimeMinutes}m</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
