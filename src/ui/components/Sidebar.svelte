<script lang="ts">
  import { doc } from "../doc-context.svelte";
  import type { SidebarTreeNode } from "../../runtime/types";
  import SidebarNode from "./SidebarNode.svelte";

  let sidebarEl = $state<HTMLElement | null>(null);
  let lastActiveElement: HTMLElement | null = null;

  // Freeze body scroll, trap focus, and restore focus when mobile sidebar opens/closes
  $effect(() => {
    if (!doc.isMobileSidebarOpen) {
      if (lastActiveElement && typeof lastActiveElement.focus === "function") {
        lastActiveElement.focus();
        lastActiveElement = null;
      }
      return;
    }

    lastActiveElement = (document.activeElement as HTMLElement) || null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus close button initially
    const closeBtn = sidebarEl?.querySelector<HTMLButtonElement>(".dmd-sidebar-close");
    closeBtn?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        doc.isMobileSidebarOpen = false;
        return;
      }

      // Focus trap within sidebar when mobile open
      if (event.key === "Tab" && sidebarEl) {
        const focusable = sidebarEl.querySelectorAll<HTMLElement>(
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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  // Mobile swipe gestures: swipe left to close, edge-swipe right to open
  $effect(() => {
    let startX = 0;
    let startY = 0;
    let isTracking = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      // Start tracking if sidebar is open, or if touching near the left edge (< 30px)
      if (doc.isMobileSidebarOpen || startX < 30) {
        isTracking = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTracking || e.changedTouches.length !== 1) return;
      isTracking = false;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;

      // Ensure horizontal swipe
      if (Math.abs(deltaY) > 80) return;

      if (doc.isMobileSidebarOpen && deltaX < -50) {
        // Swiped left while open -> close
        doc.isMobileSidebarOpen = false;
      } else if (!doc.isMobileSidebarOpen && startX < 30 && deltaX > 60) {
        // Swiped right from left edge -> open
        doc.isMobileSidebarOpen = true;
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  });
</script>

{#if doc.isMobileSidebarOpen}
  <button
    type="button"
    class="dmd-sidebar-backdrop"
    aria-label="Close documentation navigation"
    onclick={() => (doc.isMobileSidebarOpen = false)}
  ></button>
{/if}

<aside bind:this={sidebarEl} id="dmd-sidebar" class="dmd-sidebar {doc.isMobileSidebarOpen ? "mobile-open" : ""}" aria-label="Documentation navigation">
  <div class="dmd-sidebar-heading">
    <div class="dmd-sidebar-label">Documentation</div>
    <button
      type="button"
      class="dmd-sidebar-close"
      aria-label="Close documentation navigation"
      onclick={() => (doc.isMobileSidebarOpen = false)}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="18" x2="6" y1="6" y2="18" />
        <line x1="6" x2="18" y1="6" y2="18" />
      </svg>
    </button>
  </div>
  <nav class="dmd-sidebar-nav">
    <ul class="dmd-sidebar-list">
      {#if doc.tree.length === 0 && doc.isLoading}
        <li class="dmd-sidebar-status">Loading pages…</li>
      {/if}
      {#each doc.tree as node (node.id)}
        <SidebarNode {node} currentSlug={doc.currentSlug} onNavigate={(slug: string) => doc.navigate(slug)} />
      {/each}
    </ul>
  </nav>
</aside>