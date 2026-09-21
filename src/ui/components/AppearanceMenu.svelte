<script lang="ts">
  import type { ThemeDensity, ThemeFamily } from "../../runtime/types";
  import { theme } from "../theme.svelte";

  const families: Array<{ family: ThemeFamily; label: string; description: string }> = [
    { family: "atlas", label: "Atlas", description: "Editorial technical reference" },
    { family: "blueprint", label: "Blueprint", description: "Structured and schematic" },
    { family: "terminal", label: "Terminal", description: "Compact operational console" },
    { family: "editorial", label: "Editorial", description: "Spacious publication reading" },
  ];

  let isOpen = $state(false);
  let menuElement: HTMLDivElement | null = null;

  $effect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: MouseEvent) => {
      if (!menuElement?.contains(event.target as Node)) isOpen = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") isOpen = false;
    };

    document.addEventListener("mousedown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  });
</script>

<div class="dmd-appearance" bind:this={menuElement}>
  <button
    type="button"
    class="dmd-appearance-trigger"
    aria-expanded={isOpen}
    aria-haspopup="dialog"
    onclick={() => (isOpen = !isOpen)}
  >
    <span class="dmd-theme-mark dmd-theme-mark-{theme.family}" aria-hidden="true"></span>
    <span class="dmd-appearance-trigger-label">Appearance</span>
  </button>

  {#if isOpen}
    <div class="dmd-appearance-panel" role="dialog" aria-label="Documentation appearance">
      <div class="dmd-appearance-heading">
        <span>Appearance</span>
        <button type="button" class="dmd-appearance-close" aria-label="Close appearance menu" onclick={() => (isOpen = false)}>
          ×
        </button>
      </div>

      <div class="dmd-appearance-section">
        <div class="dmd-appearance-label">Theme family</div>
        <div class="dmd-theme-family-grid">
          {#each families as item (item.family)}
            <button
              type="button"
              class="dmd-theme-family-card {theme.family === item.family ? "active" : ""}"
              aria-pressed={theme.family === item.family}
              onclick={() => theme.setFamily(item.family)}
            >
              <span class="dmd-theme-preview dmd-theme-preview-{item.family}" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </span>
              <span class="dmd-theme-family-name">{item.label}</span>
              <span class="dmd-theme-family-description">{item.description}</span>
            </button>
          {/each}
        </div>
      </div>

      <fieldset class="dmd-appearance-section">
        <legend class="dmd-appearance-label">Mode</legend>
        <div class="dmd-segmented-control">
          {#each ["auto", "light", "dark"] as item (item)}
            <button type="button" class={theme.mode === item ? "active" : ""} onclick={() => theme.setMode(item as any)}>
              {item}
            </button>
          {/each}
        </div>
        <button type="button" class="dmd-appearance-quick-mode" onclick={() => theme.toggleMode()}>
          Use {theme.resolvedMode === "dark" ? "light" : "dark"} now
        </button>
      </fieldset>

      <fieldset class="dmd-appearance-section">
        <legend class="dmd-appearance-label">Reading density</legend>
        <div class="dmd-segmented-control">
          {#each ["comfortable", "compact"] as item (item)}
            <button
              type="button"
              class={theme.density === (item as ThemeDensity) ? "active" : ""}
              onclick={() => theme.setDensity(item as ThemeDensity)}
            >
              {item}
            </button>
          {/each}
        </div>
      </fieldset>
    </div>
  {/if}
</div>