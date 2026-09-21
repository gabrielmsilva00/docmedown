<script lang="ts">
  import type { DocSearchIndex } from "../../runtime/search/search-index";
  import type { SearchResultItem } from "../../runtime/types";

  let {
    isOpen,
    onClose,
    searchIndex,
    onSelect,
    placeholder = "Search docs...",
  }: {
    isOpen: boolean;
    onClose: () => void;
    searchIndex: DocSearchIndex;
    onSelect: (slug: string) => void;
    placeholder?: string;
  } = $props();

  let query = $state("");
  let results = $state<SearchResultItem[]>([]);
  let selectedIndex = $state(0);
  let inputElement = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (isOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const focusTimer = window.setTimeout(() => inputElement?.focus(), 50);
      selectedIndex = 0;

      return () => {
        window.clearTimeout(focusTimer);
        document.body.style.overflow = previousOverflow;
      };
    }

    query = "";
    results = [];
  });

  // Debounce keystrokes so the (potentially large) index search runs once per
  // pause, not once per keydown — the guide's frame-scheduling principle
  // applied to streaming input.
  let debouncedQuery = $state("");
  $effect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      debouncedQuery = "";
      return;
    }
    const timer = window.setTimeout(() => {
      debouncedQuery = trimmed;
    }, 120);
    return () => window.clearTimeout(timer);
  });

  // Live search over the debounced query.
  $effect(() => {
    if (!debouncedQuery) {
      results = [];
      return;
    }
    results = searchIndex.search(debouncedQuery);
    selectedIndex = 0;
  });

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedIndex = results.length > 0 ? (selectedIndex + 1) % results.length : 0;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex = results.length > 0 ? (selectedIndex - 1 + results.length) % results.length : 0;
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (results[selectedIndex]) {
        onSelect(results[selectedIndex].slug);
        onClose();
      }
    }
  }

  function select(res: SearchResultItem) {
    onSelect(res.slug);
    onClose();
  }
</script>

{#if isOpen}
  <div
    class="dmd-modal-backdrop"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    aria-label="Documentation search"
    onclick={(event: MouseEvent) => {
      if (event.target === event.currentTarget) onClose();
    }}
    onkeydown={handleKeyDown}
  >
    <div class="dmd-search-modal">
      <div class="dmd-search-input-wrapper">
        <svg
          class="dmd-search-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          bind:this={inputElement}
          type="text"
          class="dmd-search-input"
          bind:value={query}
          {placeholder}
          aria-label={placeholder}
        />
        <kbd class="dmd-search-escape dmd-kbd">ESC</kbd>
        <button type="button" class="dmd-search-close" aria-label="Close search" onclick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" x2="6" y1="6" y2="18" />
            <line x1="6" x2="18" y1="6" y2="18" />
          </svg>
        </button>
      </div>

      <div class="dmd-search-results">
        {#if debouncedQuery && results.length === 0}
          <div class="dmd-search-empty">No results found for “{debouncedQuery}”</div>
        {/if}

        {#each results as res, idx (res.id)}
          <button
            type="button"
            class="dmd-search-item {idx === selectedIndex ? "selected" : ""}"
            onclick={() => select(res)}
            onmouseenter={() => (selectedIndex = idx)}
          >
            <div class="dmd-search-item-header">
              <span class="dmd-search-item-title">{res.title}</span>
              {#if res.category}<span class="dmd-search-item-cat">{res.category}</span>{/if}
            </div>
            {#if res.snippet}<p class="dmd-search-item-snippet">{res.snippet}</p>{/if}
          </button>
        {/each}
      </div>

      <div class="dmd-search-footer">
        <span><kbd class="dmd-kbd">↑</kbd> <kbd class="dmd-kbd">↓</kbd> Navigate</span>
        <span><kbd class="dmd-kbd">↵</kbd> Select</span>
        <span><kbd class="dmd-kbd">ESC</kbd> Close</span>
      </div>
    </div>
  </div>
{/if}