<svelte:options customElement={{ tag: "dmd-orbit-counter" }} />

<script>
  let { label = "Orbit count" } = $props();
  let count = $state(0);
</script>

<button
  type="button"
  onclick={() => count++}
  style="padding:0.6rem 0.9rem;border:1px solid var(--dmd-accent);border-radius:6px;background:var(--dmd-accent-subtle);color:var(--dmd-text-primary);cursor:pointer;font-weight:700;"
>
  {label}: {count}
</button>
