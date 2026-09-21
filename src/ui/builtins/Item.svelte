<svelte:options customElement={{ tag: "dmd-item" }} />
<script lang="ts">
  import { onMount } from "svelte";
  import { adoptSharedStyles } from "./shared-styles";

  let {
    title = "",
    subtitle = "",
    description = "",
    icon = "",
    label = "",
    value = "",
    step = "",
    defaultopen = false,
    colType = "",
  }: {
    title?: string;
    subtitle?: string;
    description?: string;
    icon?: string;
    label?: string;
    value?: string;
    step?: string;
    defaultopen?: boolean;
    colType?: string;
  } = $props();

  let root = $state<HTMLElement>();
  let open = $state(false);
  let parentKind = $state("none");
  let autoStep = $state("");

  function getHost(): HTMLElement | null {
    if (!root) return null;
    const node = root.getRootNode();
    if (node instanceof ShadowRoot) return node.host as HTMLElement;
    return root.parentElement;
  }

  function resolveParent() {
    const host = getHost();
    const parent = host?.parentElement?.tagName?.toLowerCase();
    switch (parent) {
      case "dmd-timeline":
        parentKind = "timeline";
        break;
      case "dmd-accordion":
        parentKind = "accordion";
        break;
      case "dmd-columns":
        parentKind = "columns";
        break;
      case "dmd-card-grid":
        parentKind = "cardgrid";
        break;
      case "dmd-tabs":
        parentKind = "tabs";
        break;
      case "dmd-steps": {
        parentKind = "steps";
        const siblings = Array.from(host!.parentElement!.children).filter(
          (el) => el.tagName.toLowerCase() === "dmd-item" || el.tagName.toLowerCase() === "dmd-step"
        );
        autoStep = String(siblings.indexOf(host!) + 1);
        break;
      }
      default:
        parentKind = "none";
        break;
    }
  }

  function toggleAccordion() {
    open = !open;
  }

  onMount(() => {
    adoptSharedStyles(root);
    open = Boolean(defaultopen);
    resolveParent();
  });
</script>

<div bind:this={root} style="display: contents;">
  {#if parentKind === "timeline"}
    <div class="dmd-timeline-item">
      <div class="dmd-timeline-dot" aria-hidden="true"></div>
      <div class="dmd-timeline-content">
        <div class="dmd-timeline-title">{title}</div>
        {#if subtitle}
          <div class="dmd-timeline-subtitle">{subtitle}</div>
        {/if}
        <div class="dmd-timeline-body"><slot></slot></div>
      </div>
    </div>
  {:else if parentKind === "accordion"}
    <div class="dmd-accordion-item{open ? ' open' : ''}">
      <button
        type="button"
        class="dmd-accordion-trigger"
        aria-expanded={open}
        onclick={toggleAccordion}
      >
        <span class="dmd-accordion-label">{title}</span>
        <span class="dmd-accordion-chevron" aria-hidden="true">▾</span>
      </button>
      <div class="dmd-accordion-panel{open ? ' open' : ''}"><slot></slot></div>
    </div>
  {:else if parentKind === "steps"}
    <div class="dmd-step-item">
      <div class="dmd-step-marker">{step || autoStep}</div>
      <div class="dmd-step-content">
        <h4 class="dmd-step-title">{title}</h4>
        <div class="dmd-step-body"><slot></slot></div>
      </div>
    </div>
  {:else if parentKind === "columns"}
    <div class="dmd-column{colType && colType !== 'normal' ? ` dmd-column-${colType}` : ''}">
      <slot></slot>
    </div>
  {:else if parentKind === "cardgrid"}
    <div class="dmd-card dmd-card-shadow">
      {#if title || icon || description}
        <div class="dmd-card-header">
          {#if icon}
            <div class="dmd-card-icon"><span>{@html icon}</span></div>
          {/if}
          <div class="dmd-card-header-text">
            {#if title}
              <h3 class="dmd-card-title">{title}</h3>
            {/if}
            {#if description}
              <p class="dmd-card-subtitle">{description}</p>
            {/if}
          </div>
        </div>
      {/if}
      <div class="dmd-card-body"><slot></slot></div>
    </div>
  {:else if parentKind === "tabs"}
    <div class="dmd-tab-content"><slot></slot></div>
  {:else}
    <li><slot></slot></li>
  {/if}
</div>
