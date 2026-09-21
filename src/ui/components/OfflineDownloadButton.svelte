<script lang="ts">
  import { downloadOfflineCopy, isOfflineDocumentation } from "../../runtime/offline-export";

  const offline = isOfflineDocumentation();
  let status = $state<"idle" | "compressing" | "error">("idle");
  let message = $state("");

  async function download() {
    if (offline || status === "compressing") return;
    status = "compressing";
    message = "";
    try {
      await downloadOfflineCopy();
      status = "idle";
    } catch (error) {
      status = "error";
      message = error instanceof Error ? error.message : String(error);
    }
  }

  const label = $derived(offline ? "Offline copy" : status === "compressing" ? "Compressing…" : "Download");
  const title = $derived(
    offline
      ? "This page is already a self-contained offline documentation copy."
      : "Compress and download this documentation as a self-contained offline HTML file.",
  );
</script>

<div class="dmd-offline-download-wrap">
  <button
    type="button"
    class="dmd-offline-download-btn"
    disabled={offline || status === "compressing"}
    aria-disabled={offline || status === "compressing"}
    {title}
    onclick={download}
  >
    <svg
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
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
    <span>{label}</span>
  </button>
  {#if message}
    <div class="dmd-offline-download-error" role="alert">{message}</div>
  {/if}
</div>