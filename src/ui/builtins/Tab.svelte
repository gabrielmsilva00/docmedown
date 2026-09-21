<svelte:options customElement={{ tag: "dmd-tab" }} />
<script lang="ts">
  import { onMount } from "svelte";
  import { adoptSharedStyles } from "./shared-styles";

  let {
    label = "",
    value = "",
    icon = "",
  }: {
    label?: string;
    value?: string;
    icon?: string;
  } = $props();

  let root = $state<HTMLElement>();

  onMount(() => {
    adoptSharedStyles(root);
  });
</script>

<div bind:this={root} class="dmd-tab-content">
  <slot></slot>
</div>
