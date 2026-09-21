<svelte:options customElement={{ tag: "dmd-details" }} />
<script lang="ts">
  import { onMount } from "svelte";
  import { adoptSharedStyles } from "./shared-styles";

  let {
    summary = "",
    open = false,
  }: {
    summary?: string;
    open?: boolean;
  } = $props();

  let root = $state<HTMLElement>();

  onMount(() => {
    adoptSharedStyles(root);
  });
</script>

<div bind:this={root} style="display: contents;">
  <details class="dmd-details" {open}>
    <summary class="dmd-details-summary">{summary}</summary>
    <div class="dmd-details-body"><slot></slot></div>
  </details>
</div>
