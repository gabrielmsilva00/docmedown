<svelte:options customElement={{ tag: "dmd-column" }} />
<script lang="ts">
  import { onMount } from "svelte";
  import { adoptSharedStyles } from "./shared-styles";

  let {
    colType = "",
  }: {
    colType?: string;
  } = $props();

  let root = $state<HTMLElement>();

  onMount(() => {
    adoptSharedStyles(root);
  });
</script>

<div bind:this={root} class="dmd-column{colType ? ` dmd-column-${colType}` : ''}">
  <slot></slot>
</div>
