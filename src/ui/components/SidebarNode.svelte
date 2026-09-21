<script lang="ts">
  import type { SidebarTreeNode } from "../../runtime/types";
  // Recursive component: categories nest arbitrary depths.
  import SidebarNode from "./SidebarNode.svelte";

  let {
    node,
    currentSlug,
    onNavigate,
  }: {
    node: SidebarTreeNode;
    currentSlug: string;
    onNavigate: (slug: string) => void;
  } = $props();

  // Toggle state: null = follow prop, boolean = user override.
  // Using a state ref that's NOT initialized from the prop avoids the
  // "state_referenced_locally" warning. The derived collapses it together.
  let userToggle: boolean | null = $state(null);
  const collapsed = $derived(userToggle !== null ? userToggle : node.collapsed ?? false);
  const isCategory = $derived(node.isCategory);

  // Reset user override when the sidebar tree rebuilds (node identity changes).
  $effect(() => {
    void node.id;
    userToggle = null;
  });

  function toggle() {
    userToggle = !collapsed;
  }
</script>

{#if isCategory}
  <li class="dmd-sidebar-category">
    <button type="button" class="dmd-category-header" onclick={toggle} aria-expanded={!collapsed}>
      <span class="dmd-category-title">{node.title}</span>
      <svg
        class="dmd-category-arrow {collapsed ? "collapsed" : ""}"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
    {#if !collapsed && node.children}
      <ul class="dmd-sidebar-sublist">
        {#each node.children as child (child.id)}
          <SidebarNode node={child} {currentSlug} {onNavigate} />
        {/each}
      </ul>
    {/if}
  </li>
{:else}
  {@const isActive = currentSlug === node.slug || (currentSlug === "README" && node.slug === "README")}
  <li class="dmd-sidebar-item">
    <a
      href={`#/${node.slug}`}
      class="dmd-sidebar-link {isActive ? "active" : ""}"
      onclick={(event: MouseEvent) => {
        event.preventDefault();
        if (node.slug) onNavigate(node.slug);
      }}
    >
      {#if node.icon}<span class="dmd-item-icon">{node.icon}</span>{/if}
      <span class="dmd-item-title">{node.title}</span>
      {#if node.badge}
        <span class="dmd-badge dmd-badge-{node.badgeType || "info"}">{node.badge}</span>
      {/if}
    </a>
  </li>
{/if}