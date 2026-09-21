<svelte:options customElement={{ tag: "dmd-card" }} />
<script lang="ts">
  import { onMount } from "svelte";
  import { inferCardOutline } from "./card-outline";
  import { adoptSharedStyles } from "./shared-styles";

  const CARD_COLORS = new Set(["blue", "green", "violet", "amber", "red", "neutral"]);

  let {
    title = "",
    description = "",
    href = "",
    icon = "",
    image = "",
    imagealt = "",
    badge = "",
    badgetype = "info",
    footer = "",
    color = "",
    shadow = true,
  }: {
    title?: string;
    description?: string;
    href?: string;
    icon?: string;
    image?: string;
    imagealt?: string;
    badge?: string;
    badgetype?: string;
    footer?: string;
    color?: string;
    shadow?: boolean;
  } = $props();

  let autoTitle = $state("");
  let autoDescription = $state("");
  let autoFooter = $state("");
  let root = $state<HTMLElement>();

  function getHost(): HTMLElement | null {
    if (!root) return null;
    const node = root.getRootNode();
    if (node instanceof ShadowRoot) return node.host as HTMLElement;
    return root.parentElement;
  }

  function adoptOutline() {
    const host = getHost();
    if (!host) return;
    const outline = inferCardOutline(Array.from(host.children));
    const canAdoptTitle = !title && !autoTitle;
    const canAdoptDescription = !description && !autoDescription;

    if (canAdoptTitle && outline.title) {
      autoTitle = outline.title.innerHTML;
      outline.title.remove();
      if (canAdoptDescription && outline.description) {
        autoDescription = outline.description.innerHTML;
        outline.description.remove();
      }
    }

    if (!footer && !autoFooter && outline.footer) {
      autoFooter = outline.footer.innerHTML;
      outline.footer.remove();
    }
  }

  onMount(() => {
    adoptSharedStyles(root);
    adoptOutline();

    const host = getHost() as any;
    if (host) {
      host.cloneCard = () => {
        const copy = host.cloneNode(true) as HTMLElement & {
          _autoTitle?: string;
          _autoDescription?: string;
          _autoFooter?: string;
        };
        copy._autoTitle = autoTitle;
        copy._autoDescription = autoDescription;
        copy._autoFooter = autoFooter;
        return copy;
      };
      if (host._autoTitle) autoTitle = host._autoTitle;
      if (host._autoDescription) autoDescription = host._autoDescription;
      if (host._autoFooter) autoFooter = host._autoFooter;
    }
  });

  const colorClass = $derived(
    color ? (CARD_COLORS.has(color) ? ` dmd-card-${color}` : " dmd-card-accent") : ""
  );

  const colorStyle = $derived(
    color && !CARD_COLORS.has(color) ? `--dmd-card-accent: ${color};` : ""
  );

  const hasHeader = $derived(
    !!(title || autoTitle || badge || icon || description || autoDescription)
  );
</script>

{#snippet cardInner()}
  <div
    class="dmd-card{colorClass}{shadow ? ' dmd-card-shadow' : ' dmd-card-flat'}"
    style={colorStyle || undefined}
  >
    {#if image}
      <div class="dmd-card-media" aria-hidden={imagealt ? undefined : "true"}>
        <img src={image} alt={imagealt || ""} loading="lazy" />
      </div>
    {/if}
    {#if hasHeader}
      <div class="dmd-card-header">
        {#if icon}
          <div class="dmd-card-icon"><span>{@html icon}</span></div>
        {/if}
        <div class="dmd-card-header-text">
          {#if title || autoTitle || badge}
            <div class="dmd-card-title-row">
              {#if title}
                <h3 class="dmd-card-title">{title}</h3>
              {:else if autoTitle}
                <h3 class="dmd-card-title">{@html autoTitle}</h3>
              {/if}
              {#if badge}
                <span class="dmd-badge dmd-badge-{badgetype}">{badge}</span>
              {/if}
            </div>
          {/if}
          {#if description}
            <p class="dmd-card-subtitle">{description}</p>
          {:else if autoDescription}
            <p class="dmd-card-subtitle">{@html autoDescription}</p>
          {/if}
        </div>
      </div>
    {/if}
    <div class="dmd-card-body">
      <slot onslotchange={adoptOutline}></slot>
    </div>
    {#if footer}
      <div class="dmd-card-footer">{footer}</div>
    {:else if autoFooter}
      <div class="dmd-card-footer">{@html autoFooter}</div>
    {/if}
  </div>
{/snippet}

<div bind:this={root} style="display: contents;">
  {#if href}
    <a {href} class="dmd-card-link">
      {@render cardInner()}
    </a>
  {:else}
    {@render cardInner()}
  {/if}
</div>
