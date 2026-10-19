<script lang="ts">
  import { tick } from "svelte";
  import type { ColorMode, ThemeDensity, ThemeFamily } from "../../runtime/types";
  import { theme } from "../theme.svelte";

  const families: Array<{ family: ThemeFamily; label: string; description: string }> = [
    { family: "atlas", label: "Atlas", description: "Precision reference manual" },
    { family: "blueprint", label: "Blueprint", description: "Architectural drafting grid" },
    { family: "terminal", label: "Terminal", description: "Compact operational console" },
    { family: "editorial", label: "Editorial", description: "Serif, ink and reading room" },
    { family: "botanical", label: "Botanical", description: "Sage and fern field guide" },
    { family: "studio", label: "Studio", description: "Bold graphic workbook" },
  ];

  let isOpen = $state(false);
  let menuElement: HTMLDivElement | null = null;
  let triggerElement: HTMLButtonElement | null = null;
  let panelElement = $state<HTMLDivElement | null>(null);

  function closeMenu() {
    isOpen = false;
    triggerElement?.focus();
  }

  async function toggleMenu() {
    if (isOpen) return closeMenu();
    isOpen = true;
    await tick();
    panelElement?.querySelector<HTMLButtonElement>(".dmd-theme-family-card.active")?.focus();
  }

  $effect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuElement?.contains(event.target as Node)) isOpen = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    };

    const closeOnFocusLeave = (event: FocusEvent) => {
      if (!menuElement?.contains(event.target as Node)) isOpen = false;
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("focusin", closeOnFocusLeave);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("focusin", closeOnFocusLeave);
      document.removeEventListener("keydown", closeOnEscape);
    };
  });
</script>

<div class="dmd-appearance" bind:this={menuElement}>
  <button
    type="button"
    class="dmd-appearance-trigger"
    bind:this={triggerElement}
    aria-expanded={isOpen}
    aria-haspopup="dialog"
    onclick={toggleMenu}
  >
    <span class="dmd-theme-mark dmd-theme-mark-{theme.family}" aria-hidden="true"></span>
    <span class="dmd-appearance-trigger-label">Appearance</span>
  </button>

  {#if isOpen}
    <div class="dmd-appearance-panel" bind:this={panelElement} role="dialog" aria-label="Documentation appearance">
      <div class="dmd-appearance-heading">
        <span>Appearance</span>
        <button type="button" class="dmd-appearance-close" aria-label="Close appearance menu" onclick={closeMenu}>
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
            <button
              type="button"
              aria-pressed={theme.mode === item}
              class={theme.mode === item ? "active" : ""}
              onclick={() => theme.setMode(item as ColorMode)}
            >
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
              aria-pressed={theme.density === item}
              class={theme.density === (item as ThemeDensity) ? "active" : ""}
              onclick={() => theme.setDensity(item as ThemeDensity)}
            >
              {item}
            </button>
          {/each}
        </div>
      </fieldset>

      <fieldset class="dmd-appearance-section">
        <legend class="dmd-appearance-label">Animations</legend>
        <div class="dmd-segmented-control">
          <button
            type="button"
            aria-pressed={theme.motion === "full"}
            class={theme.motion === "full" ? "active" : ""}
            onclick={() => theme.setMotion("full")}
          >
            Smooth
          </button>
          <button
            type="button"
            aria-pressed={theme.motion === "reduced"}
            class={theme.motion === "reduced" ? "active" : ""}
            onclick={() => theme.setMotion("reduced")}
          >
            Reduced
          </button>
        </div>
      </fieldset>
    </div>
  {/if}
</div>