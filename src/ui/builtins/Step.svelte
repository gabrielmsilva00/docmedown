<svelte:options customElement={{ tag: "dmd-step" }} />
<script lang="ts">
  import { onMount } from "svelte";
  import { adoptSharedStyles } from "./shared-styles";

  let {
    title = "",
    step = "",
  }: {
    title?: string;
    step?: string;
  } = $props();

  let root = $state<HTMLElement>();
  let resolvedStep = $state("");

  function getHost(): HTMLElement | null {
    if (!root) return null;
    const node = root.getRootNode();
    if (node instanceof ShadowRoot) return node.host as HTMLElement;
    return root.parentElement;
  }

  function resolveStepNumber() {
    const explicit = Number(step);
    if (step && Number.isFinite(explicit) && String(explicit) !== "") {
      resolvedStep = String(explicit);
      return;
    }
    const host = getHost();
    const parent = host?.parentElement;
    if (!parent) {
      resolvedStep = "";
      return;
    }
    const siblings = Array.from(parent.children).filter((el) => el.tagName.toLowerCase() === "dmd-step");
    resolvedStep = String(siblings.indexOf(host!) + 1);
  }

  onMount(() => {
    adoptSharedStyles(root);
    void Promise.resolve().then(() => {
      resolveStepNumber();
    });
  });
</script>

<div bind:this={root} class="dmd-step-item">
  <div class="dmd-step-marker">{resolvedStep}</div>
  <div class="dmd-step-content">
    <h4 class="dmd-step-title">{title}</h4>
    <div class="dmd-step-body"><slot></slot></div>
  </div>
</div>
