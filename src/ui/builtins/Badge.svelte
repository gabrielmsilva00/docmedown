<svelte:options customElement={{ tag: "dmd-badge" }} />
<script lang="ts">
  import { onMount } from "svelte";
  import { adoptSharedStyles } from "./shared-styles";

  let {
    type = "info",
    pill = false,
    dot = false,
  }: {
    type?: string;
    pill?: boolean;
    dot?: boolean;
  } = $props();

  let root = $state<HTMLElement>();

  onMount(() => {
    adoptSharedStyles(root);
  });
</script>

<span
  bind:this={root}
  class="dmd-badge dmd-badge-{type}{pill ? ' dmd-badge-pill' : ''}{dot ? ' dmd-badge-dot' : ''}"
>
  {#if dot}
    <span class="dmd-badge-pulse" aria-hidden="true">
      <span class="dmd-badge-pulse-ring"></span>
      <span class="dmd-badge-pulse-core"></span>
    </span>
  {/if}
  <span class="dmd-badge-label"><slot></slot></span>
</span>
