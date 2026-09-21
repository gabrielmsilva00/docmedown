<svelte:options customElement={{ tag: "dmd-counter-widget" }} />
<script lang="ts">
  let { title = "Live state demo" }: { title?: string } = $props();
  let count = $state(0);
</script>

<div class="dmd-custom-panel">
  <strong>{title}</strong>
  <p class="dmd-custom-desc">A component-local reactive state value using Svelte 5 runes.</p>
  <button type="button" class="dmd-custom-btn" onclick={() => count++}>
    Count: {count}
  </button>
</div>

<style>
  .dmd-custom-panel {
    margin: 1.25rem 0;
    padding: 1rem;
    border: 1px solid var(--dmd-border-color);
    border-radius: 10px;
    background: var(--dmd-bg-card);
  }
  .dmd-custom-desc {
    color: var(--dmd-text-secondary);
    margin: 0.5rem 0 0.75rem;
  }
  .dmd-custom-btn {
    border: 1px solid var(--dmd-accent);
    border-radius: 6px;
    padding: 0.45rem 0.75rem;
    background: var(--dmd-accent-subtle);
    color: var(--dmd-text-primary);
    cursor: pointer;
    font-weight: 600;
  }
</style>
