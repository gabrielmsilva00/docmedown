<svelte:options customElement={{ tag: "dmd-interactive-theme-demo" }} />
<script lang="ts">
  import { onMount } from "svelte";

  let family = $state("atlas");
  let mode = $state("light");
  let density = $state("comfortable");

  onMount(() => {
    const update = () => {
      family = document.documentElement.getAttribute("data-dmd-theme") || "atlas";
      mode = document.documentElement.getAttribute("data-dmd-mode") || "light";
      density = document.documentElement.getAttribute("data-dmd-density") || "comfortable";
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-dmd-theme", "data-dmd-mode", "data-dmd-density"],
    });
    return () => observer.disconnect();
  });
</script>

<div class="dmd-custom-panel">
  <strong>Live appearance state</strong>
  <p class="dmd-custom-desc">Use the Appearance menu above. This custom Svelte 5 component observes the runtime theme contract directly.</p>
  <div class="dmd-theme-grid">
    <div class="dmd-theme-card">
      <div class="dmd-theme-label">Family</div>
      <div class="dmd-theme-val">{family}</div>
    </div>
    <div class="dmd-theme-card">
      <div class="dmd-theme-label">Mode</div>
      <div class="dmd-theme-val">{mode}</div>
    </div>
    <div class="dmd-theme-card">
      <div class="dmd-theme-label">Density</div>
      <div class="dmd-theme-val">{density}</div>
    </div>
  </div>
</div>

<style>
  :host {
    display: block;
  }
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
  .dmd-theme-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.6rem;
  }
  .dmd-theme-card {
    border: 1px solid var(--dmd-border-color);
    border-radius: var(--dmd-radius-md, 8px);
    padding: 0.65rem;
    background: var(--dmd-bg-secondary);
  }
  .dmd-theme-label {
    color: var(--dmd-text-muted);
    font-family: var(--dmd-font-mono, monospace);
    font-size: 0.68rem;
    text-transform: uppercase;
  }
  .dmd-theme-val {
    margin-top: 0.25rem;
    font-weight: 700;
    text-transform: capitalize;
  }
</style>
