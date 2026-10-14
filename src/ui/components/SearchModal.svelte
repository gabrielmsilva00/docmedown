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
  let modalElement = $state<HTMLElement | null>(null);
  let lastFocusedElement: HTMLElement | null = null;

  const checkIsMac = () => {
    if (typeof navigator === "undefined") return false;
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = nav.userAgentData?.platform || nav.platform || "";
    const userAgent = nav.userAgent || "";
    return /^mac/i.test(platform) || /macintosh|mac os x/i.test(userAgent);
  };

  let isMac = $state(checkIsMac());

  $effect(() => {
    isMac = checkIsMac();
  });

  const displayPlaceholder = $derived.by(() => {
    const raw = placeholder || "Search documentation...";
    if (isMac) {
      return raw.replace(/Ctrl\+?K/gi, "⌘K");
    }
    return raw.replace(/⌘K/g, "Ctrl K").replace(/⌘/g, "Ctrl");
  });

  const RECENT_KEY = "dmd:recent-searches";
  let recentQueries = $state<string[]>([]);

  function loadRecentQueries() {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      recentQueries = raw ? JSON.parse(raw) : [];
    } catch {
      recentQueries = [];
    }
  }

  function saveRecentQuery(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    try {
      const existing = recentQueries.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...existing].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      recentQueries = updated;
    } catch {}
  }

  function clearRecentQueries() {
    try {
      localStorage.removeItem(RECENT_KEY);
      recentQueries = [];
    } catch {}
  }

  function highlightMatch(text: string, term: string): string {
    if (!text || !term) return text;
    const trimmed = term.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 0) return text;
    const candidates = [trimmed, ...words].sort((a, b) => b.length - a.length);
    const escaped = candidates.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const regex = new RegExp(`(${escaped})`, "gi");
    return text.replace(regex, '<mark class="dmd-search-highlight">$1</mark>');
  }

  $effect(() => {
    if (isOpen) {
      lastFocusedElement = (document.activeElement as HTMLElement) || null;
      loadRecentQueries();
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const focusTimer = window.setTimeout(() => inputElement?.focus(), 50);
      selectedIndex = 0;

      return () => {
        window.clearTimeout(focusTimer);
        document.body.style.overflow = previousOverflow;
        if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
          lastFocusedElement.focus();
          lastFocusedElement = null;
        }
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
        saveRecentQuery(query);
        onSelect(results[selectedIndex].slug);
        onClose();
      }
    } else if (event.key === "Tab" && modalElement) {
      // Focus trap within modal
      const focusable = modalElement.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  }

  function select(res: SearchResultItem) {
    saveRecentQuery(query || res.title);
    onSelect(res.slug);
    onClose();
  }

  function applyRecent(q: string) {
    query = q;
    inputElement?.focus();
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
    <div bind:this={modalElement} class="dmd-search-modal">
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
          placeholder={displayPlaceholder}
          aria-label={displayPlaceholder}
        />
        <kbd class="dmd-search-escape dmd-kbd">ESC</kbd>
        <button type="button" class="dmd-search-close" aria-label="Close search" onclick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" x2="6" y1="6" y2="18" />
            <line x1="6" x2="18" y1="6" y2="18" />
          </svg>
        </button>
      </div>

      {#if !debouncedQuery && recentQueries.length > 0}
        <div class="dmd-search-recent">
          <div class="dmd-search-recent-header">
            <span class="dmd-search-recent-title">Recent Searches</span>
            <button type="button" class="dmd-search-recent-clear" onclick={clearRecentQueries}>Clear all</button>
          </div>
          <div class="dmd-search-recent-tags">
            {#each recentQueries as recent (recent)}
              <button type="button" class="dmd-search-recent-chip" onclick={() => applyRecent(recent)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{recent}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

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
              <span class="dmd-search-item-title">{@html highlightMatch(res.title, debouncedQuery)}</span>
              {#if res.category}<span class="dmd-search-item-cat">{res.category}</span>{/if}
            </div>
            {#if res.snippet}<p class="dmd-search-item-snippet">{@html highlightMatch(res.snippet, debouncedQuery)}</p>{/if}
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