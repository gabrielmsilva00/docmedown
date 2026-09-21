<svelte:options customElement={{ tag: "dmd-counter-widget" }} />
<script lang="ts">
  let { title = "Interactive Counter" }: { title?: string } = $props();
  let count = $state(0);
</script>

<div class="dmd-counter-panel">
  <button type="button" class="dmd-counter-btn" onclick={() => count++}>
    {title}: {count}
  </button>
</div>

<style>
  :host {
    display: block;
  }
  .dmd-counter-panel {
    margin: 1rem 0;
  }
  .dmd-counter-btn {
    padding: 0.55rem 0.85rem;
    border: 1px solid var(--dmd-accent);
    border-radius: 6px;
    background: var(--dmd-accent-subtle);
    color: var(--dmd-text-primary);
    cursor: pointer;
    font-weight: 700;
  }
</style>
