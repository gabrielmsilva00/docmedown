<script lang="ts">
  import { getEmbeddedNestedSites, isSelfContainedOffline, OFFLINE_LINK_EVENT } from "../../runtime/offline-export";

  const DEFAULT_TOAST_MESSAGE = "This offline copy has limited features.";

  let toastVisible = $state(false);
  let toastMessage = $state(DEFAULT_TOAST_MESSAGE);
  let modalOpen = $state(false);
  let hideTimer: number | null = null;
  const nestedCount = $derived(Object.keys(getEmbeddedNestedSites() ?? {}).length);
  const isOfflineCopy = $derived(isSelfContainedOffline());

  function showToast(message: string) {
    toastMessage = message;
    toastVisible = true;
    if (hideTimer !== null) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => (toastVisible = false), 12000);
  }

  // Startup notice for self-contained offline copies: a dismissible toast that
  // expands into a modal describing exactly what the copy can and cannot do.
  $effect(() => {
    if (!isOfflineCopy) return;

    showToast(DEFAULT_TOAST_MESSAGE);
    const onUnavailableLink = (event: Event) => {
      const message = (event as CustomEvent<string | undefined>).detail;
      showToast(message || "That link is unavailable in offline documentation.");
    };
    window.addEventListener(OFFLINE_LINK_EVENT, onUnavailableLink);

    return () => {
      window.removeEventListener(OFFLINE_LINK_EVENT, onUnavailableLink);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
    };
  });

  $effect(() => {
    if (!modalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") modalOpen = false;
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
</script>

{#if isOfflineCopy}
  {#if toastVisible}
    <div class="dmd-offline-toast" role="status">
      <span>{toastMessage}</span>
      <button
        type="button"
        class="dmd-offline-toast-action"
        onclick={() => {
          toastVisible = false;
          modalOpen = true;
        }}
      >
        Learn more
      </button>
      <button
        type="button"
        class="dmd-offline-toast-dismiss"
        aria-label="Dismiss offline notice"
        onclick={() => (toastVisible = false)}
      >
        ×
      </button>
    </div>
  {/if}

  {#if modalOpen}
    <div
      class="dmd-modal-backdrop"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      aria-label="Offline documentation limitations"
      onclick={(event: MouseEvent) => {
        if (event.target === event.currentTarget) modalOpen = false;
      }}
      onkeydown={(event: KeyboardEvent) => {
        if (event.key === "Escape") modalOpen = false;
      }}
    >
      <section class="dmd-offline-modal">
        <div class="dmd-offline-modal-header">
          <span>About this offline copy</span>
          <button type="button" class="dmd-appearance-close" aria-label="Close offline notice" onclick={() => (modalOpen = false)}>
            ×
          </button>
        </div>
        <ul class="dmd-offline-modal-list">
          <li>Every page, the search index, diagrams, themes, and the runtime are embedded in this single file.</li>
          {#if nestedCount > 0}
            <li>
              {nestedCount === 1
                ? "The nested documentation site opens directly from this file — no other files are needed."
                : `${nestedCount} nested documentation sites open directly from this file — no other files are needed.`}
            </li>
          {:else}
            <li>
              Links to other documentation files are disabled because nested sites were not embedded in this copy.
            </li>
          {/if}
          <li>
            Links to the internet, such as repository or social links, still require a connection and may not always
            work as intended.
          </li>
          <li>
            This copy never checks for updates. It is required to rebuild the documentation to refresh its content.
          </li>
        </ul>
        <div class="dmd-offline-modal-footer">
          <button type="button" class="dmd-btn-primary" onclick={() => (modalOpen = false)}>Got it</button>
        </div>
      </section>
    </div>
  {/if}
{/if}