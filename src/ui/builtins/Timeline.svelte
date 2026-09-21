<svelte:options customElement={{ tag: "dmd-timeline" }} />
<script lang="ts">
  import { onMount } from "svelte";
  import { adoptSharedStyles } from "./shared-styles";

  let root = $state<HTMLElement>();

  onMount(() => {
    adoptSharedStyles(root);
  });
</script>

<div bind:this={root} class="dmd-timeline">
  <slot></slot>
</div>
