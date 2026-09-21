<svelte:options customElement={{ tag: "dmd-timeline-item" }} />
<script lang="ts">
  import { onMount } from "svelte";
  import { adoptSharedStyles } from "./shared-styles";

  let {
    title = "",
    subtitle = "",
  }: {
    title?: string;
    subtitle?: string;
  } = $props();

  let root = $state<HTMLElement>();

  onMount(() => {
    adoptSharedStyles(root);
  });
</script>

<div bind:this={root} class="dmd-timeline-item">
  <div class="dmd-timeline-dot" aria-hidden="true"></div>
  <div class="dmd-timeline-content">
    <div class="dmd-timeline-title">{title}</div>
    {#if subtitle}
      <div class="dmd-timeline-subtitle">{subtitle}</div>
    {/if}
    <div class="dmd-timeline-body"><slot></slot></div>
  </div>
</div>
