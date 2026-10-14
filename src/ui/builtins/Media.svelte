<svelte:options customElement={{ tag: "dmd-media" }} />
<script lang="ts">
  import { onMount } from "svelte";
  import {
    detectMediaCategory,
    isDataUri,
    parseDataUri,
    resolveMimeType,
    type MediaCategory,
  } from "../../runtime/media";
  import { adoptSharedStyles } from "./shared-styles";

  let {
    src = "",
    type = "",
    format = "",
    fallback = "",
    fallbacktext = "",
    fallbackText = "",
    poster = "",
    alt = "",
    title = "",
    width = "",
    height = "",
    maxwidth = "",
    maxWidth = "",
    maxheight = "",
    maxHeight = "",
    aspectratio = "",
    aspectRatio = "",
    fit = "",
    objectfit = "",
    objectFit = "",
    align = "center",
    rounded = "",
    radius = "",
    shadow = "",
    border = "",
    caption = "",
    captionalign = "center",
    captionAlign = "center",
    controls = true,
    autoplay = false,
    loop = false,
    muted = false,
    playsinline = true,
    preload = "metadata",
    embed = "",
    zoomable = false,
    class: className = "",
    style = "",
  }: {
    src?: string;
    type?: string;
    format?: string;
    fallback?: string;
    fallbacktext?: string;
    fallbackText?: string;
    poster?: string;
    alt?: string;
    title?: string;
    width?: string | number;
    height?: string | number;
    maxwidth?: string | number;
    maxWidth?: string | number;
    maxheight?: string | number;
    maxHeight?: string | number;
    aspectratio?: string;
    aspectRatio?: string;
    fit?: string;
    objectfit?: string;
    objectFit?: string;
    align?: string;
    rounded?: boolean | string;
    radius?: boolean | string;
    shadow?: boolean | string;
    border?: boolean | string;
    caption?: string;
    captionalign?: string;
    captionAlign?: string;
    controls?: boolean;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    playsinline?: boolean;
    preload?: string;
    embed?: string | boolean;
    zoomable?: boolean;
    class?: string;
    style?: string;
  } = $props();

  let root = $state<HTMLElement>();
  let hasError = $state(false);
  let isFallbackActive = $state(false);
  let inlineSvgContent = $state<string | null>(null);
  let isZoomed = $state(false);

  function getEmbeddedMedia(key: string): string | undefined {
    if (typeof window === "undefined" || !key) return undefined;
    const trimmed = key.trim();
    const normalized = trimmed.replace(/^\.?\//, "");
    const candidates = [trimmed, normalized, `./${normalized}`, `/${normalized}`];

    const globalData = (window as any).__DOCMEDOWN_DATA__?.media;
    if (globalData && typeof globalData === "object") {
      for (const c of candidates) {
        if (globalData[c]) return globalData[c];
      }
    }

    const storeEl = document.getElementById("dmd-media-store");
    if (storeEl?.textContent) {
      try {
        const parsed = JSON.parse(storeEl.textContent);
        for (const c of candidates) {
          if (parsed[c]) return parsed[c];
        }
      } catch {
        // ignore
      }
    }

    return undefined;
  }

  const resolvedFallbackText = $derived(fallbackText || fallbacktext);
  const resolvedMaxWidth = $derived(maxWidth || maxwidth);
  const resolvedMaxHeight = $derived(maxHeight || maxheight);
  const resolvedAspectRatio = $derived(aspectRatio || aspectratio);
  const resolvedFit = $derived(fit || objectFit || objectfit);
  const resolvedCaptionAlign = $derived(captionAlign !== "center" ? captionAlign : captionalign);
  const resolvedTypeHint = $derived(type || format);

  // Look up source in embedded media store if available
  const initialSource = $derived.by(() => {
    if (!src) return "";
    return getEmbeddedMedia(src) || src;
  });

  const resolvedPoster = $derived.by(() => {
    if (!poster) return undefined;
    return getEmbeddedMedia(poster) || poster;
  });

  const resolvedFallbackSource = $derived.by(() => {
    if (!fallback) return undefined;
    return getEmbeddedMedia(fallback) || fallback;
  });

  let currentSource = $state("");

  $effect(() => {
    currentSource = initialSource;
    hasError = false;
    isFallbackActive = false;
    inlineSvgContent = null;
  });

  const mediaCategory: MediaCategory = $derived.by(() => {
    if (!currentSource) return "unknown";
    return detectMediaCategory(currentSource, resolvedTypeHint);
  });

  const resolvedMime = $derived.by(() => {
    if (!currentSource) return "";
    return resolveMimeType(currentSource, resolvedTypeHint);
  });

  // Handle inline SVG decoding if embed="inline" or embed="svg"
  $effect(() => {
    const shouldInline =
      (embed === "inline" || embed === "svg" || embed === true) && mediaCategory === "vector";
    if (!shouldInline || !currentSource) {
      inlineSvgContent = null;
      return;
    }

    if (currentSource.trim().startsWith("<svg")) {
      inlineSvgContent = currentSource.trim();
    } else if (isDataUri(currentSource)) {
      const parsed = parseDataUri(currentSource);
      if (parsed) {
        try {
          if (parsed.isBase64) {
            inlineSvgContent = atob(parsed.data);
          } else {
            inlineSvgContent = decodeURIComponent(parsed.data);
          }
        } catch {
          inlineSvgContent = null;
        }
      }
    }
  });

  onMount(() => {
    adoptSharedStyles(root);
  });

  function formatDimension(val: string | number | undefined): string | undefined {
    if (val === undefined || val === null || val === "") return undefined;
    const str = String(val).trim();
    if (!str) return undefined;
    if (/^\d+(\.\d+)?$/.test(str)) {
      return `${str}px`;
    }
    return str;
  }

  function handleMediaError() {
    if (!isFallbackActive && resolvedFallbackSource && resolvedFallbackSource !== currentSource) {
      // Try fallback media source
      isFallbackActive = true;
      currentSource = resolvedFallbackSource;
    } else {
      hasError = true;
    }
  }

  function toggleZoom() {
    if (!zoomable || mediaCategory !== "image") return;
    isZoomed = !isZoomed;
  }

  // Derive inner element inline styles
  const mediaStyles = $derived.by(() => {
    const parts: string[] = [];
    const w = formatDimension(width);
    const h = formatDimension(height);
    const mw = formatDimension(resolvedMaxWidth);
    const mh = formatDimension(resolvedMaxHeight);

    if (w) parts.push(`width: ${w};`);
    if (h) parts.push(`height: ${h};`);
    if (mw) parts.push(`max-width: ${mw};`);
    if (mh) parts.push(`max-height: ${mh};`);
    if (resolvedAspectRatio) parts.push(`aspect-ratio: ${resolvedAspectRatio};`);
    if (resolvedFit) parts.push(`object-fit: ${resolvedFit};`);

    return parts.join(" ");
  });

  // Derive wrapper inline styles (borders, radius, shadows, custom style)
  const wrapperStyles = $derived.by(() => {
    const parts: string[] = [];
    const w = formatDimension(width);
    const mw = formatDimension(resolvedMaxWidth);
    if (w && w !== "auto") parts.push(`width: ${w};`);
    if (mw) parts.push(`max-width: ${mw};`);

    const r = rounded !== "" ? rounded : radius;
    if (r === true || r === "md") {
      parts.push("border-radius: var(--dmd-radius-md, 8px);");
    } else if (r === "sm") {
      parts.push("border-radius: var(--dmd-radius-sm, 4px);");
    } else if (r === "lg") {
      parts.push("border-radius: var(--dmd-radius-lg, 12px);");
    } else if (r === "full") {
      parts.push("border-radius: 9999px;");
    } else if (r === "none" || r === false) {
      parts.push("border-radius: 0;");
    } else if (typeof r === "string" && r.trim()) {
      parts.push(`border-radius: ${formatDimension(r)};`);
    }

    if (shadow === true || shadow === "md") {
      parts.push("box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);");
    } else if (shadow === "sm") {
      parts.push("box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);");
    } else if (shadow === "lg") {
      parts.push("box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.06);");
    } else if (typeof shadow === "string" && shadow !== "none" && shadow !== "false" && shadow.trim()) {
      parts.push(`box-shadow: ${shadow};`);
    }

    if (border === true || border === "true") {
      parts.push("border: 1px solid var(--dmd-border, #e2e8f0);");
    } else if (typeof border === "string" && border !== "none" && border !== "false" && border.trim()) {
      parts.push(`border: ${border.includes(" ") ? border : `1px solid ${border}`};`);
    }

    if (style) {
      parts.push(style);
    }

    return parts.join(" ");
  });

  // Figure container styles
  const figureStyles = $derived.by(() => {
    const parts: string[] = [];
    const mw = formatDimension(resolvedMaxWidth);
    if (mw) parts.push(`max-width: ${mw};`);

    if (align === "center") {
      parts.push("margin-left: auto; margin-right: auto; text-align: center;");
    } else if (align === "left" || align === "start") {
      parts.push("margin-left: 0; margin-right: auto; text-align: left;");
    } else if (align === "right" || align === "end") {
      parts.push("margin-left: auto; margin-right: 0; text-align: right;");
    }

    return parts.join(" ");
  });
</script>

<figure
  bind:this={root}
  class="dmd-media dmd-media-{mediaCategory} dmd-media-align-{align} {className}"
  style={figureStyles}
>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions -->
  <div
    class="dmd-media-wrapper{zoomable ? ' dmd-media-zoomable' : ''}{isZoomed ? ' dmd-media-zoomed' : ''}"
    style={wrapperStyles}
    onclick={toggleZoom}
    role={zoomable ? "button" : undefined}
    tabindex={zoomable ? 0 : undefined}
    onkeydown={(e) => {
      if (zoomable && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        toggleZoom();
      }
    }}
  >
    {#if hasError}
      <div class="dmd-media-fallback" role="alert">
        <span class="dmd-media-fallback-icon" aria-hidden="true">
          {#if mediaCategory === "video"}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          {:else if mediaCategory === "audio"}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          {:else}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          {/if}
        </span>
        <div class="dmd-media-fallback-content">
          <span class="dmd-media-fallback-text">
            {resolvedFallbackText || (typeof fallback === "string" && !resolvedFallbackSource ? fallback : "") || (alt ? `Media unavailable: ${alt}` : "Media unavailable")}
          </span>
          <slot></slot>
        </div>
      </div>
    {:else if mediaCategory === "video"}
      <!-- Video Player -->
      <video
        src={currentSource}
        poster={resolvedPoster}
        {controls}
        {autoplay}
        {loop}
        {muted}
        {playsinline}
        {preload}
        class="dmd-media-video"
        style={mediaStyles}
        onerror={handleMediaError}
      >
        {#if resolvedMime}
          <source src={currentSource} type={resolvedMime} />
        {/if}
        {#if resolvedFallbackSource && !isFallbackActive}
          <source src={resolvedFallbackSource} />
        {/if}
        <p>{resolvedFallbackText || alt || "Your browser does not support HTML5 video."}</p>
      </video>
    {:else if mediaCategory === "audio"}
      <!-- Audio Player -->
      <audio
        src={currentSource}
        {controls}
        {autoplay}
        {loop}
        {muted}
        {preload}
        class="dmd-media-audio"
        style={mediaStyles}
        onerror={handleMediaError}
      >
        {#if resolvedMime}
          <source src={currentSource} type={resolvedMime} />
        {/if}
        {#if resolvedFallbackSource && !isFallbackActive}
          <source src={resolvedFallbackSource} />
        {/if}
        <p>{resolvedFallbackText || alt || "Your browser does not support HTML5 audio."}</p>
      </audio>
    {:else if mediaCategory === "vector" && inlineSvgContent}
      <!-- Inline Vector SVG -->
      <div class="dmd-media-svg-host" style={mediaStyles}>
        {@html inlineSvgContent}
      </div>
    {:else}
      <!-- Raster Image or Image-mode Vector -->
      <img
        src={currentSource}
        {alt}
        {title}
        class="dmd-media-image"
        style={mediaStyles}
        loading="lazy"
        onerror={handleMediaError}
      />
    {/if}
  </div>

  {#if caption}
    <figcaption class="dmd-media-caption dmd-media-caption-{resolvedCaptionAlign}">
      {caption}
    </figcaption>
  {/if}
</figure>
