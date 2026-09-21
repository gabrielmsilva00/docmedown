<svelte:options customElement={{ tag: "dmd-kbd" }} />
<script lang="ts">
  import { onMount } from "svelte";
  import { adoptSharedStyles } from "./shared-styles";

  let root = $state<HTMLElement>();

  onMount(() => {
    adoptSharedStyles(root);
  });
</script>

<kbd bind:this={root} class="dmd-kbd"><slot></slot></kbd>
