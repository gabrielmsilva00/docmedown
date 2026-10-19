<script lang="ts">
  import { tick } from "svelte";
  import { localeLabel, projectLocales } from "../../runtime/i18n";
  import { doc } from "../doc-context.svelte";

  let isOpen = $state(false);
  let menuElement = $state<HTMLDivElement | null>(null);
  let triggerElement = $state<HTMLButtonElement | null>(null);
  let panelElement = $state<HTMLDivElement | null>(null);

  // By default, filter out unsupported languages for the current document
  const locales = $derived.by(() => {
    const all = projectLocales(doc.config);
    const showUntranslated = doc.config?.i18n?.showUntranslated ?? false;
    if (showUntranslated) return all;
    return all.filter((item) => doc.hasTranslation(item.code) || item.code === doc.locale);
  });

  const currentLabel = $derived(localeLabel(doc.locale, doc.config));

  function shortCode(code: string): string {
    return code.split("-")[0].toUpperCase();
  }

  function closeMenu() {
    isOpen = false;
    triggerElement?.focus();
  }

  async function toggleMenu() {
    if (isOpen) return closeMenu();
    isOpen = true;
    await tick();
    panelElement?.querySelector<HTMLButtonElement>(".dmd-lang-option.active")?.focus();
  }

  function selectLanguage(code: string) {
    doc.selectLocale(code);
    closeMenu();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!isOpen || !panelElement) return;
    const options = Array.from(panelElement.querySelectorAll<HTMLButtonElement>(".dmd-lang-option"));
    const currentIndex = options.findIndex((el) => el === document.activeElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
      options[nextIndex]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
      options[prevIndex]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      options[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      options[options.length - 1]?.focus();
    }
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

{#if locales.length > 1}
  <div class="dmd-language-menu" bind:this={menuElement}>
    <button
      type="button"
      class="dmd-lang-trigger"
      bind:this={triggerElement}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-label={doc.t("language")}
      title={doc.t("language")}
      onclick={toggleMenu}
    >
      <svg
        class="dmd-lang-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
      <span class="dmd-lang-trigger-label">{currentLabel}</span>
      <svg
        class="dmd-lang-chevron {isOpen ? 'open' : ''}"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    {#if isOpen}
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div
        class="dmd-lang-panel"
        bind:this={panelElement}
        role="listbox"
        aria-label={doc.t("language")}
        tabindex="-1"
        onkeydown={handleKeydown}
      >
        <div class="dmd-lang-heading">{doc.t("language")}</div>
        <div class="dmd-lang-options">
          {#each locales as locale (locale.code)}
            {@const isSelected = locale.code === doc.locale}
            {@const isUntranslated = !doc.hasTranslation(locale.code)}
            <button
              type="button"
              role="option"
              lang={locale.code}
              aria-selected={isSelected}
              class="dmd-lang-option {isSelected ? 'active' : ''}"
              onclick={() => selectLanguage(locale.code)}
            >
              <span class="dmd-lang-badge">{shortCode(locale.code)}</span>
              <span class="dmd-lang-name">
                {localeLabel(locale.code, doc.config)}
                {#if isUntranslated}
                  <span class="dmd-lang-fallback-tag">· {doc.t("original")}</span>
                {/if}
              </span>
              {#if isSelected}
                <svg
                  class="dmd-lang-check"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .dmd-language-menu {
    position: relative;
    display: inline-flex;
  }
  .dmd-lang-trigger {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--dmd-text-secondary);
    background: var(--dmd-bg-card);
    border: 1px solid var(--dmd-border-color);
    border-radius: var(--dmd-radius-md);
    cursor: pointer;
    transition: var(--dmd-transition-interactive, all 0.15s ease);
    min-height: 36px;
    white-space: nowrap;
  }
  .dmd-lang-trigger:hover,
  .dmd-lang-trigger[aria-expanded="true"] {
    color: var(--dmd-text-primary);
    border-color: var(--dmd-accent);
  }
  .dmd-lang-icon {
    flex-shrink: 0;
    opacity: 0.85;
  }
  .dmd-lang-chevron {
    flex-shrink: 0;
    opacity: 0.65;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .dmd-lang-chevron.open {
    transform: rotate(180deg);
  }
  .dmd-lang-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 200;
    min-width: 200px;
    max-width: calc(100vw - 2rem);
    padding: 0.4rem;
    background: var(--dmd-bg-card);
    border: 1px solid var(--dmd-border-color);
    border-radius: var(--dmd-radius-lg);
    box-shadow: var(--dmd-shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.2));
    backdrop-filter: blur(12px);
    white-space: normal;
    transform-origin: top right;
    animation: dmd-dropdown-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .dmd-lang-heading {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--dmd-text-muted, var(--dmd-text-secondary));
    padding: 0.35rem 0.6rem 0.45rem;
    border-bottom: 1px solid var(--dmd-border-subtle, var(--dmd-border-color));
    margin-bottom: 0.3rem;
  }
  .dmd-lang-options {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .dmd-lang-option {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    width: 100%;
    padding: 0.45rem 0.6rem;
    font-size: 0.82rem;
    font-weight: 500;
    text-align: left;
    color: var(--dmd-text-secondary);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--dmd-radius-md);
    cursor: pointer;
    transition: var(--dmd-transition-interactive, all 0.15s ease);
  }
  .dmd-lang-option:hover,
  .dmd-lang-option:focus-visible {
    color: var(--dmd-text-primary);
    background: var(--dmd-bg-secondary, rgba(125, 125, 125, 0.1));
    outline: none;
  }
  .dmd-lang-option.active {
    color: var(--dmd-accent);
    font-weight: 600;
    background: color-mix(in srgb, var(--dmd-accent) 10%, var(--dmd-bg-card));
    border-color: color-mix(in srgb, var(--dmd-accent) 25%, transparent);
  }
  .dmd-lang-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 0.12rem 0.35rem;
    border-radius: var(--dmd-radius-sm, 4px);
    background: var(--dmd-bg-secondary, rgba(125, 125, 125, 0.15));
    color: var(--dmd-text-muted, var(--dmd-text-secondary));
    flex-shrink: 0;
    transition: var(--dmd-transition-interactive, all 0.15s ease);
  }
  .dmd-lang-option.active .dmd-lang-badge {
    background: var(--dmd-accent);
    color: #ffffff;
  }
  .dmd-lang-name {
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dmd-lang-fallback-tag {
    font-size: 0.72rem;
    font-weight: 400;
    color: var(--dmd-text-muted, var(--dmd-text-secondary));
    margin-left: 0.25rem;
  }
  .dmd-lang-check {
    margin-left: auto;
    color: var(--dmd-accent);
    flex-shrink: 0;
  }
  @media (max-width: 640px) {
    .dmd-lang-trigger {
      width: 40px;
      min-width: 40px;
      height: 40px;
      min-height: 40px;
      padding: 0;
      justify-content: center;
      flex-shrink: 0;
    }
    .dmd-lang-trigger-label,
    .dmd-lang-chevron {
      display: none;
    }
    .dmd-lang-panel {
      width: min(260px, calc(100vw - 2rem));
    }
  }
</style>