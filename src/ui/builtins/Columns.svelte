<svelte:options customElement={{ tag: "dmd-columns" }} />
<script lang="ts">
  import { onMount } from "svelte";
  import { adoptSharedStyles } from "./shared-styles";

  let {
    cols = 2,
    type = "normal",
  }: {
    cols?: number | string;
    type?: string;
  } = $props();

  let root = $state<HTMLElement>();

  const parsedCols = $derived.by(() => {
    if (typeof cols === "number") return Math.min(4, Math.max(1, cols));
    const n = Number.parseInt(String(cols).replace(/[{}'"\s]/g, ""), 10);
    if (!Number.isFinite(n)) return 2;
    return Math.min(4, Math.max(1, n));
  });

  function getHost(): HTMLElement | null {
    if (!root) return null;
    const node = root.getRootNode();
    if (node instanceof ShadowRoot) return node.host as HTMLElement;
    return root.parentElement;
  }

  function propagateType() {
    const host = getHost();
    if (!host) return;
    for (const child of Array.from(host.children)) {
      const tag = child.tagName.toLowerCase();
      if (tag === "dmd-column" || tag === "dmd-item") {
        child.setAttribute("data-col-type", type || "normal");
      }
    }
  }

  $effect(() => {
    // Re-propagate whenever `type` changes
    if (type) propagateType();
  });

  onMount(() => {
    adoptSharedStyles(root);
    queueMicrotask(() => propagateType());
  });
</script>

<div bind:this={root} class="dmd-columns dmd-columns-{parsedCols} dmd-columns-{type}">
  <slot onslotchange={propagateType}></slot>
</div>
