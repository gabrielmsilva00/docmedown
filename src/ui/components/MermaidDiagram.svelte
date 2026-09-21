<script lang="ts">
  import {
    calculateDiagramCameraBounds,
    type DiagramCamera,
    type DiagramCameraBounds,
    type DiagramSize,
    decodeDiagramSource,
    extractDiagramSubgraphs,
    formatDiagramMarkdown,
    formatDiagramSubgraphMarkdown,
    panDiagramCamera,
    readDiagramSize,
    renderDiagramSvg,
    resolveDiagramContext,
  } from "../../runtime/markdown/mermaid";

  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.1;
  const clampZoom = (value: number): number =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));

  interface DiagramSubgraphAction {
    id: string;
    label: string;
    markdown: string;
    left: number;
    top: number;
  }

  interface PanGesture {
    pointerId: number;
    lastX: number;
    lastY: number;
  }

  async function writeClipboardText(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // file:/// and non-secure contexts may reject Clipboard API writes.
      }
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Clipboard access is unavailable.");
  }

  function readClusterLabel(cluster: SVGGraphicsElement): string {
    const rows = [...cluster.querySelectorAll<SVGTextContentElement>(".text-outer-tspan.row, text, tspan")]
      .map((row) => row.textContent?.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    return rows[0] || cluster.textContent?.replace(/\s+/g, " ").trim() || "Untitled subgraph";
  }

  let { source }: { source: string } = $props();
  const diagramSource = $derived(decodeDiagramSource(source));

  let svg = $state<string | null>(null);
  let diagramSize = $state<DiagramSize | null>(null);
  let error = $state<string | null>(null);
  let zoom = $state(1);
  let fitZoom = $state(1);
  let isFitted = $state(true);
  let expanded = $state(false);
  let subgraphActions = $state<DiagramSubgraphAction[]>([]);
  let camera = $state<DiagramCamera>({ x: 0, y: 0 });
  let copiedTarget = $state<string | null>(null);
  let isPanning = $state(false);

  let stageElement = $state<HTMLDivElement | null>(null);
  let canvasElement = $state<HTMLDivElement | null>(null);
  let panGesture: PanGesture | null = null;
  let cameraRef: DiagramCamera = { x: 0, y: 0 };
  let copyResetTimer: number | null = null;

  const renderedSize = $derived(
    diagramSize
      ? {
          width: Math.max(1, Math.round(diagramSize.width * zoom)),
          height: Math.max(1, Math.round(diagramSize.height * zoom)),
        }
      : null,
  );

  // Re-run whenever the resolved document theme changes. Attribute/style
  // mutations on <html> cover family switches, mode switches, and inline
  // accent overrides alike.
  //
  // Theme switches mutate several <html> attributes in one frame, and density
  // (and the transition itself) mutate more. Two guards keep the viewer cheap:
  // a render is skipped when the diagram-affecting context is unchanged, and
  // survivors are debounced so the color transition paints first and Mermaid
  // (which parses and lays out synchronously) runs after the interaction
  // settles instead of blocking the frame.
  $effect(() => {
    void diagramSource;
    let cancelled = false;
    let lastContextKey: string | null = null;
    let pending: ReturnType<typeof setTimeout> | undefined;

    const render = () => {
      const context = resolveDiagramContext();
      const contextKey = `${context.family}|${context.mode}|${context.tokens.accent}|${context.tokens.codeSurface}|${context.tokens.codeInk}`;
      if (contextKey === lastContextKey) return;
      lastContextKey = contextKey;

      renderDiagramSvg(diagramSource, context.family, context.mode, context.tokens)
        .then((nextSvg) => {
          if (!cancelled) {
            svg = nextSvg;
            diagramSize = readDiagramSize(nextSvg);
            error = null;
            isFitted = true;
          }
        })
        .catch((renderError: unknown) => {
          if (!cancelled) {
            svg = null;
            diagramSize = null;
            error = renderError instanceof Error ? renderError.message : String(renderError);
          }
        });
    };

    render();

    if (typeof MutationObserver === "undefined") {
      return () => {
        cancelled = true;
      };
    }

    const observer = new MutationObserver(() => {
      if (cancelled) return;
      clearTimeout(pending);
      pending = setTimeout(render, 150);
    });
    // Density never changes a diagram's palette, so it is deliberately not
    // observed; responsive size changes are handled by the ResizeObserver below.
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-dmd-theme", "data-theme", "style"],
    });

    return () => {
      cancelled = true;
      clearTimeout(pending);
      observer.disconnect();
    };
  });

  // Mermaid occasionally emits a viewBox that excludes the tail of clustered
  // flowcharts. Once the SVG is in the document, measure its actual graphics
  // tree and replace the nominal bounds before fitting the viewer.
  $effect(() => {
    if (!svg) return;
    const svgElement = canvasElement?.querySelector("svg");
    const graphics = svgElement?.querySelector<SVGGElement>(":scope > g");
    if (!svgElement || !graphics || typeof graphics.getBBox !== "function") return;

    try {
      const bounds = graphics.getBBox();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const padding = 20;
      const measured = { width: bounds.width + padding * 2, height: bounds.height + padding * 2 };
      svgElement.setAttribute("viewBox", `${bounds.x - padding} ${bounds.y - padding} ${measured.width} ${measured.height}`);
      svgElement.removeAttribute("width");
      svgElement.removeAttribute("height");
      diagramSize = measured;
    } catch {
      // Some non-browser DOM shims do not implement SVG geometry. The emitted
      // Mermaid viewBox remains a safe fallback in those environments.
    }
  });

  // The default viewer is a square inspection window. Fit is intentionally
  // width-first: tall diagrams continue below the fold and are explored by
  // panning instead of making the document card grow or exposing scrollbars.
  $effect(() => {
    if (!stageElement || !diagramSize) return;

    const measure = () => {
      const styles = getComputedStyle(stageElement!);
      const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
      const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
      const availableWidth = Math.max(1, stageElement!.clientWidth - horizontalPadding);
      const availableHeight = Math.max(1, stageElement!.clientHeight - verticalPadding);
      const nextFit = clampZoom(availableWidth / diagramSize!.width);
      fitZoom = nextFit;
      if (isFitted) {
        zoom = nextFit;
        camera = { x: 0, y: Math.max(0, (diagramSize!.height * nextFit - availableHeight) / 2) };
      }
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(stageElement);
    return () => observer.disconnect();
  });

  // HTML copy controls are attached to Mermaid clusters (subgraphs), not
  // individual nodes. Final browser bounds keep the controls crisp after Fit,
  // manual zoom, bounds repair, panning, and responsive layout changes.
  $effect(() => {
    const currentCanvas = canvasElement;
    const svgElement = currentCanvas?.querySelector("svg");
    if (!currentCanvas || !svgElement || !diagramSize || zoom <= 0) {
      subgraphActions = [];
      return;
    }

    const frame = requestAnimationFrame(() => {
      const canvasRect = currentCanvas!.getBoundingClientRect();
      const definitions = extractDiagramSubgraphs(diagramSource);
      const unused = new Set(definitions.map((_, index) => index));
      const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
      const actions = [...svgElement!.querySelectorAll<SVGGraphicsElement>(".cluster")]
        .map((cluster, index) => {
          const rect = cluster.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return null;
          const renderedLabel = readClusterLabel(cluster);
          const normalizedLabel = normalize(renderedLabel);
          let definitionIndex = definitions.findIndex(
            (definition, candidateIndex) =>
              unused.has(candidateIndex) &&
              (normalize(definition.label) === normalizedLabel || normalize(definition.id) === normalizedLabel),
          );
          if (definitionIndex < 0) {
            definitionIndex = definitions.findIndex(
              (definition, candidateIndex) =>
                unused.has(candidateIndex) && normalize(cluster.id).includes(normalize(definition.id)),
            );
          }
          if (definitionIndex < 0) definitionIndex = [...unused][0] ?? -1;
          const definition = definitions[definitionIndex];
          if (!definition) return null;
          unused.delete(definitionIndex);
          return {
            id: `subgraph-${definition.id}-${index}`,
            label: definition.label || renderedLabel,
            markdown: formatDiagramSubgraphMarkdown(diagramSource, definition.source),
            left: rect.right - canvasRect.left - 8,
            top: rect.top - canvasRect.top + 8,
          };
        })
        .filter((action): action is DiagramSubgraphAction => action !== null);
      subgraphActions = actions;
    });

    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") expanded = false;
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  $effect(() => {
    return () => {
      if (copyResetTimer !== null) window.clearTimeout(copyResetTimer);
    };
  });

  function downloadSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "diagram.svg";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function setManualZoom(nextZoom: number) {
    isFitted = false;
    zoom = clampZoom(nextZoom);
  }

  function fitDiagram() {
    isFitted = true;
    zoom = fitZoom;
  }

  function readCameraBounds(): DiagramCameraBounds {
    const stage = stageElement;
    if (!stage || !renderedSize) return { x: 0, y: 0 };
    const styles = getComputedStyle(stage);
    const viewport = {
      width: Math.max(0, stage.clientWidth - Number.parseFloat(styles.paddingLeft) - Number.parseFloat(styles.paddingRight)),
      height: Math.max(0, stage.clientHeight - Number.parseFloat(styles.paddingTop) - Number.parseFloat(styles.paddingBottom)),
    };
    return calculateDiagramCameraBounds(renderedSize, viewport);
  }

  function clampCamera(next: DiagramCamera): DiagramCamera {
    return panDiagramCamera({ x: 0, y: 0 }, next, readCameraBounds()).camera;
  }

  // Re-clamp the camera whenever bounds change (zoom, fit, resize).
  $effect(() => {
    void renderedSize;
    void zoom;
    const next = clampCamera(cameraRef);
    if (next.x !== cameraRef.x || next.y !== cameraRef.y) {
      cameraRef = next;
      camera = next;
    }
  });

  async function copyMarkdown(markdown: string, target: string) {
    try {
      await writeClipboardText(markdown);
      copiedTarget = target;
      if (copyResetTimer !== null) window.clearTimeout(copyResetTimer);
      copyResetTimer = window.setTimeout(() => (copiedTarget = null), 1800);
    } catch {
      copiedTarget = "error";
    }
  }

  function canStartPan(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return true;
    return !target.closest(".node, text, .dmd-diagram-subgraph-copy, button, a");
  }

  function handlePanStart(event: PointerEvent) {
    const stage = stageElement;
    if (!stage || (event.pointerType === "mouse" && event.button !== 0) || !canStartPan(event.target)) return;
    panGesture = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY };
    stage.setPointerCapture(event.pointerId);
    isPanning = true;
    event.preventDefault();
  }

  function handlePanMove(event: PointerEvent) {
    const gesture = panGesture;
    if (gesture?.pointerId === event.pointerId) {
      const delta = { x: event.clientX - gesture.lastX, y: event.clientY - gesture.lastY };
      const result = panDiagramCamera(cameraRef, delta, readCameraBounds());
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
      cameraRef = result.camera;
      camera = result.camera;
      if (!expanded && result.remainder.y !== 0) window.scrollBy({ top: -result.remainder.y, behavior: "instant" as any });
      event.preventDefault();
    }
  }

  function handlePanEnd(event: PointerEvent) {
    const stage = stageElement;
    if (panGesture?.pointerId !== event.pointerId) return;
    panGesture = null;
    isPanning = false;
    if (stage?.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  }

  // Wheel panning needs a non-passive native listener.
  $effect(() => {
    const stage = stageElement;
    if (!stage) return;
    const handleWheel = (event: WheelEvent) => {
      if (!renderedSize) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1;
      const delta = { x: -event.deltaX * unit, y: -event.deltaY * unit };
      const result = panDiagramCamera(cameraRef, delta, readCameraBounds());
      const cameraMoved = result.camera.x !== cameraRef.x || result.camera.y !== cameraRef.y;
      if (!cameraMoved && (expanded || result.remainder.y === 0)) return;
      event.preventDefault();
      cameraRef = result.camera;
      if (cameraMoved) camera = result.camera;
      if (!expanded && result.remainder.y !== 0) window.scrollBy({ top: -result.remainder.y, behavior: "instant" as any });
    };
    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  });
</script>

<svelte:options
  customElement={{
    tag: "dmd-mermaid",
    shadow: "none",
  }}
/>

<figure class="dmd-diagram-viewer{expanded ? " is-expanded" : ""}">
  <div class="dmd-diagram-frame">
    <div class="dmd-diagram-toolbar">
      <button
        type="button"
        class="dmd-diagram-btn dmd-diagram-icon-btn dmd-diagram-copy-all{copiedTarget === "graph" ? " copied" : ""}"
        disabled={!svg}
        aria-label={copiedTarget === "graph" ? "Graph Markdown copied" : "Copy graph Markdown"}
        title={copiedTarget === "graph" ? "Copied" : "Copy graph Markdown"}
        onclick={() => copyMarkdown(formatDiagramMarkdown(diagramSource), "graph")}
      >
        {#if copiedTarget === "graph"}
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
        {:else}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="8" y="8" width="11" height="11" rx="2" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
          </svg>
        {/if}
      </button>
      <span class="dmd-diagram-toolbar-divider" aria-hidden="true"></span>
      <button
        type="button"
        class="dmd-diagram-btn"
        aria-label="Zoom out"
        disabled={!svg || zoom <= MIN_ZOOM}
        onclick={() => setManualZoom(zoom - ZOOM_STEP)}
      >
        −
      </button>
      <span class="dmd-diagram-zoom-label" aria-live="polite">{Math.round(zoom * 100)}%</span>
      <button
        type="button"
        class="dmd-diagram-btn"
        aria-label="Zoom in"
        disabled={!svg || zoom >= MAX_ZOOM}
        onclick={() => setManualZoom(zoom + ZOOM_STEP)}
      >
        +
      </button>
      <button type="button" class="dmd-diagram-btn" disabled={!svg || isFitted} onclick={fitDiagram}>Fit</button>
      <button
        type="button"
        class="dmd-diagram-btn"
        disabled={!svg || zoom === 1}
        onclick={() => setManualZoom(1)}
      >
        1:1
      </button>
      <span class="dmd-diagram-toolbar-spacer"></span>
      <button type="button" class="dmd-diagram-btn" disabled={!svg} onclick={downloadSvg}>SVG</button>
      <button type="button" class="dmd-diagram-btn" disabled={!svg} onclick={() => (expanded = !expanded)}>
        {expanded ? "Close" : "Expand"}
      </button>
    </div>

    <div
      role="application"
      class="dmd-diagram-stage{isPanning ? " is-panning" : ""}"
      bind:this={stageElement}
      onpointerdown={handlePanStart}
      onpointermove={handlePanMove}
      onpointerup={handlePanEnd}
      onpointercancel={handlePanEnd}
    >
      {#if error}
        <pre class="dmd-diagram-error">Diagram syntax error: {error}</pre>
      {:else if svg && renderedSize}
        <div
          bind:this={canvasElement}
          class="dmd-diagram-canvas"
          style="width: {renderedSize.width}px; height: {renderedSize.height}px; transform: translate3d(calc(-50% + {camera.x}px), calc(-50% + {camera.y}px), 0);"
        >
          <div class="dmd-diagram-svg">
            {@html svg}
          </div>
          {#each subgraphActions as subgraph (subgraph.id)}
            <button
              type="button"
              class="dmd-diagram-subgraph-copy{copiedTarget === subgraph.id ? " copied" : ""}"
              style="left: {subgraph.left}px; top: {subgraph.top}px;"
              aria-label={copiedTarget === subgraph.id
                ? `${subgraph.label} subgraph Markdown copied`
                : `Copy ${subgraph.label} subgraph Markdown`}
              title={copiedTarget === subgraph.id ? "Copied" : `Copy ${subgraph.label} subgraph Markdown`}
              onclick={() => copyMarkdown(subgraph.markdown, subgraph.id)}
            >
              {#if copiedTarget === subgraph.id}
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
              {:else}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="8" y="8" width="11" height="11" rx="2" />
                  <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      {:else}
        <div class="dmd-diagram-loading">Rendering diagram…</div>
      {/if}
    </div>
    <div class="dmd-diagram-status" aria-live="polite">
      {copiedTarget === "error" ? "Clipboard unavailable. Select the diagram text manually." : ""}
    </div>
  </div>
</figure>