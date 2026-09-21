<svelte:options customElement={{ tag: "dmd-accordion-item" }} />
<script lang="ts">
  import { onMount } from "svelte";
  import { adoptSharedStyles } from "./shared-styles";

  let {
    title = "",
    defaultopen = false,
  }: {
    title?: string;
    defaultopen?: boolean;
  } = $props();

  let root = $state<HTMLElement>();
  let open = $state(false);

  function toggle() {
    open = !open;
  }

  onMount(() => {
    adoptSharedStyles(root);
    open = Boolean(defaultopen);
  });
</script>

<div bind:this={root} class="dmd-accordion-item{open ? ' open' : ''}">
  <button
    type="button"
    class="dmd-accordion-trigger"
    aria-expanded={open}
    onclick={toggle}
  >
    <span class="dmd-accordion-label">{title}</span>
    <span class="dmd-accordion-chevron" aria-hidden="true">▾</span>
  </button>
  <div class="dmd-accordion-panel{open ? ' open' : ''}">
    <div class="dmd-accordion-content"><slot></slot></div>
  </div>
</div>
