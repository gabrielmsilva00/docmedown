<svelte:options customElement={{ tag: "dmd-button" }} />
<script lang="ts">
  import { onMount } from "svelte";
  import { adoptSharedStyles } from "./shared-styles";

  let {
    variant = "primary",
    size = "md",
    href = "",
    external = false,
    block = false,
    iconposition = "left",
    loading = false,
    disabled = false,
    type = "button",
  }: {
    variant?: string;
    size?: string;
    href?: string;
    external?: boolean;
    block?: boolean;
    iconposition?: string;
    loading?: boolean;
    disabled?: boolean;
    type?: string;
  } = $props();

  let root = $state<HTMLElement>();

  onMount(() => {
    adoptSharedStyles(root);
  });

  const cls = $derived(
    `dmd-btn dmd-btn-${variant} dmd-btn-${size}` +
      `${block ? " dmd-btn-block" : ""}` +
      `${loading ? " dmd-btn-loading" : ""}`
  );
</script>

{#if href && !disabled}
  <a
    bind:this={root}
    {href}
    class={cls}
    target={external ? "_blank" : undefined}
    rel={external ? "noopener noreferrer" : undefined}
    aria-disabled={loading ? "true" : undefined}
  >
    {#if loading}
      <span class="dmd-btn-spinner" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 12a9 9 0 1 1-6.2-8.56" stroke-linecap="round" />
        </svg>
      </span>
    {/if}
    <span class="dmd-btn-label"><slot></slot></span>
  </a>
{:else}
  <button
    bind:this={root}
    type={type as "button" | "submit" | "reset"}
    class={cls}
    disabled={disabled || loading}
  >
    {#if loading}
      <span class="dmd-btn-spinner" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 12a9 9 0 1 1-6.2-8.56" stroke-linecap="round" />
        </svg>
      </span>
    {/if}
    <span class="dmd-btn-label"><slot></slot></span>
  </button>
{/if}
