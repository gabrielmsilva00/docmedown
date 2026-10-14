<svelte:options customElement={{ tag: "dmd-card" }} />
<script lang="ts">
  import { onMount } from "svelte";
  import { parseMarkdown } from "../../runtime/markdown/parser";
  import { inferCardOutline } from "./card-outline";
  import { adoptSharedStyles } from "./shared-styles";

  const CARD_COLORS = new Set(["blue", "green", "violet", "amber", "red", "neutral"]);
  const contentCache = new Map<string, string>();

  function isUrlOrFilePath(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed.includes("\n") || trimmed.includes("\r")) return false;
    if (/^<[a-z0-9-]+[\s>]/i.test(trimmed)) return false;
    if (/^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|`{3,})/.test(trimmed)) return false;
    if (/^https?:\/\//i.test(trimmed)) return true;
    if (/\.(md|mdx|html)$/i.test(trimmed) && (trimmed.includes("/") || trimmed.includes(".") || !trimmed.includes(" "))) {
      return true;
    }
    return false;
  }

  function getEmbeddedDoc(key: string): string | undefined {
    if (typeof window === "undefined") return undefined;
    const trimmed = key.trim();
    const normalized = trimmed.replace(/^\.?\//, "").replace(/\.(md|mdx|html)$/i, "");
    const candidates = [trimmed, normalized, trimmed.replace(/^\.?\//, "")];

    const globalData = (window as any).__DOCMEDOWN_DATA__?.docs;
    if (globalData && typeof globalData === "object") {
      for (const c of candidates) {
        if (globalData[c] !== undefined) return globalData[c];
      }
    }

    const globalDocs = (window as any).__DOCMEDOWN_DOCS__;
    if (globalDocs && typeof globalDocs === "object") {
      for (const c of candidates) {
        if (globalDocs[c] !== undefined) return globalDocs[c];
      }
    }

    const docsEl = document.getElementById("dmd-docs");
    if (docsEl?.textContent) {
      try {
        const parsed = JSON.parse(docsEl.textContent);
        for (const c of candidates) {
          if (parsed[c] !== undefined) return parsed[c];
        }
      } catch {
        // ignore
      }
    }

    return undefined;
  }

  let {
    title = "",
    description = "",
    content = "",
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
    content?: string;
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
  let bodyEl = $state<HTMLElement>();

  function resolveContentSync(source: string): string {
    const trimmed = source?.trim() || "";
    if (!trimmed) return "";

    if (!isUrlOrFilePath(trimmed)) {
      const parsed = parseMarkdown(trimmed);
      if (!title && !autoTitle && parsed.frontmatter?.title) {
        autoTitle = String(parsed.frontmatter.title);
      }
      if (!description && !autoDescription && parsed.frontmatter?.description) {
        autoDescription = String(parsed.frontmatter.description);
      }
      return parsed.html;
    }

    const cached = contentCache.get(trimmed);
    if (cached !== undefined) {
      const parsed = parseMarkdown(cached);
      if (!title && !autoTitle && parsed.frontmatter?.title) {
        autoTitle = String(parsed.frontmatter.title);
      }
      if (!description && !autoDescription && parsed.frontmatter?.description) {
        autoDescription = String(parsed.frontmatter.description);
      }
      return parsed.html;
    }

    const embedded = getEmbeddedDoc(trimmed);
    if (embedded !== undefined) {
      contentCache.set(trimmed, embedded);
      const parsed = parseMarkdown(embedded);
      if (!title && !autoTitle && parsed.frontmatter?.title) {
        autoTitle = String(parsed.frontmatter.title);
      }
      if (!description && !autoDescription && parsed.frontmatter?.description) {
        autoDescription = String(parsed.frontmatter.description);
      }
      return parsed.html;
    }

    return "";
  }

  let resolvedHtml = $state("");

  $effect(() => {
    const current = content?.trim() || "";
    if (!current) {
      resolvedHtml = "";
      return;
    }

    const syncResult = resolveContentSync(current);
    if (syncResult) {
      resolvedHtml = syncResult;
      return;
    }

    if (typeof window === "undefined") return;
    let active = true;

    fetch(current)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!active) return;
        contentCache.set(current, text);
        const parsed = parseMarkdown(text);
        if (!title && !autoTitle && parsed.frontmatter?.title) {
          autoTitle = String(parsed.frontmatter.title);
        }
        if (!description && !autoDescription && parsed.frontmatter?.description) {
          autoDescription = String(parsed.frontmatter.description);
        }
        resolvedHtml = parsed.html;
      })
      .catch((err) => {
        if (!active) return;
        console.warn(`[DocMeDown] Failed to fetch card content from "${current}":`, err);
        resolvedHtml = `<p class="dmd-card-error">Failed to load content: <code>${current}</code></p>`;
      });

    return () => {
      active = false;
    };
  });

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
    <div class="dmd-card-body" bind:this={bodyEl}>
      {#if resolvedHtml}
        {@html resolvedHtml}
      {/if}
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
