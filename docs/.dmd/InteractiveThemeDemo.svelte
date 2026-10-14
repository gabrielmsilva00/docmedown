<svelte:options customElement={{ tag: "dmd-interactive-theme-demo" }} />
<script lang="ts">
  import { onMount } from "svelte";

  let family = $state("atlas");
  let mode = $state("light");
  let density = $state("comfortable");

  const families = [
    { id: "atlas", label: "Atlas", hint: "Mineral / Cobalt" },
    { id: "blueprint", label: "Blueprint", hint: "Technical / Coral" },
    { id: "terminal", label: "Terminal", hint: "Operational / Mono" },
    { id: "editorial", label: "Editorial", hint: "Warm Paper / Serif" },
  ];

  const modes = [
    { id: "auto", label: "Auto" },
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
  ];

  const densities = [
    { id: "comfortable", label: "Comfortable" },
    { id: "compact", label: "Compact" },
  ];

  function switchFamily(f: string) {
    if ((window as any)?.DocMeDown?.theme) {
      (window as any).DocMeDown.theme.setFamily(f);
    }
  }

  function switchMode(m: string) {
    if ((window as any)?.DocMeDown?.theme) {
      (window as any).DocMeDown.theme.setMode(m);
    }
  }

  function switchDensity(d: string) {
    if ((window as any)?.DocMeDown?.theme) {
      (window as any).DocMeDown.theme.setDensity(d);
    }
  }

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

<div class="theme-controller">
  <div class="controller-header">
    <div class="header-title">
      <span class="pulse-dot"></span>
      <strong>Live appearance state & Theme Controller</strong>
    </div>
    <div class="current-badges">
      <span class="badge family-badge">{family}</span>
      <span class="badge mode-badge">{mode}</span>
      <span class="badge density-badge">{density}</span>
    </div>
  </div>

  <p class="controller-desc">
    Click any button below to instantly transform the entire documentation website's visual system:
  </p>

  <div class="control-sections">
    <div class="control-group">
      <span class="group-label">Theme Family:</span>
      <div class="button-pills">
        {#each families as f}
          <button
            class="pill-btn"
            class:active={family === f.id}
            onclick={() => switchFamily(f.id)}
            title={f.hint}
          >
            {f.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="control-group">
      <span class="group-label">Color Mode:</span>
      <div class="button-pills">
        {#each modes as m}
          <button
            class="pill-btn"
            class:active={mode === m.id}
            onclick={() => switchMode(m.id)}
          >
            {m.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="control-group">
      <span class="group-label">Reading Density:</span>
      <div class="button-pills">
        {#each densities as d}
          <button
            class="pill-btn"
            class:active={density === d.id}
            onclick={() => switchDensity(d.id)}
          >
            {d.label}
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  :host {
    display: block;
  }
  .theme-controller {
    margin: 1.5rem 0;
    padding: 1.25rem;
    border: 1px solid var(--dmd-border-color, #ddded8);
    border-radius: 12px;
    background: var(--dmd-bg-card, #ffffff);
    box-shadow: var(--dmd-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
  }
  .controller-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    color: var(--dmd-text-primary, #1a1d21);
  }
  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--dmd-accent, #315cf5);
    box-shadow: 0 0 8px var(--dmd-accent, #315cf5);
  }
  .current-badges {
    display: flex;
    gap: 6px;
  }
  .badge {
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    font-family: var(--dmd-font-mono, monospace);
    background: var(--dmd-accent-subtle, rgba(49, 92, 245, 0.1));
    border: 1px solid var(--dmd-border-color, #ddded8);
    color: var(--dmd-accent, #315cf5);
  }
  .controller-desc {
    color: var(--dmd-text-secondary, #575f66);
    font-size: 0.88rem;
    margin: 0.6rem 0 1rem;
  }
  .control-sections {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .control-group {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .group-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--dmd-text-muted, #788089);
    min-width: 110px;
    font-family: var(--dmd-font-mono, monospace);
    text-transform: uppercase;
  }
  .button-pills {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .pill-btn {
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid var(--dmd-border-color, #ddded8);
    background: var(--dmd-bg-secondary, #eff0ee);
    color: var(--dmd-text-primary, #1a1d21);
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .pill-btn:hover {
    border-color: var(--dmd-accent, #315cf5);
    background: var(--dmd-bg-tertiary, #e4e6e3);
  }
  .pill-btn.active {
    background: var(--dmd-accent, #315cf5);
    color: #ffffff;
    border-color: var(--dmd-accent, #315cf5);
    box-shadow: 0 2px 6px var(--dmd-accent-glow, rgba(49, 92, 245, 0.35));
  }
</style>
