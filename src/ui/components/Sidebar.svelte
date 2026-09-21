<script lang="ts">
  import { doc } from "../doc-context.svelte";
  import type { SidebarTreeNode } from "../../runtime/types";
  import SidebarNode from "./SidebarNode.svelte";

  // Freeze body scroll + close on Escape while the mobile sidebar is open.
  $effect(() => {
    if (!doc.isMobileSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") doc.isMobileSidebarOpen = false;
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
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

<aside id="dmd-sidebar" class="dmd-sidebar {doc.isMobileSidebarOpen ? "mobile-open" : ""}" aria-label="Documentation navigation">
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