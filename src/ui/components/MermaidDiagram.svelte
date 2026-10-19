<script lang="ts">
  import {
    calculateDiagramCameraBounds,
    calculateDiagramFit,
    calculateDiagramFitHeight,
    calculateDiagramFitWidth,
    type DiagramCamera,
    type DiagramCameraBounds,
    type DiagramSize,
    decodeDiagramSource,
    detectDiagramType,
    extractDiagramSubgraphs,
    formatDiagramMarkdown,
    formatDiagramSubgraphMarkdown,
    panDiagramCamera,
    readDiagramSize,
    renderDiagramSvg,
    resolveDiagramContext,
  } from "../../runtime/markdown/mermaid";

  const MIN_ZOOM = 0.05;
  const MAX_ZOOM = 4.0;
  const ZOOM_STEP = 0.15;
  const clampZoom = (value: number): number =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));

  interface PanGesture {
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  }

  interface HoveredCluster {
    id: string;
    label: string;
    markdown: string;
    left: number;
    top: number;
  }

  let { source }: { source: string } = $props();
  const diagramSource = $derived(decodeDiagramSource(source));
  const diagramType = $derived(detectDiagramType(diagramSource));

  let svg = $state<string | null>(null);
  let diagramSize = $state<DiagramSize | null>(null);
  let error = $state<string | null>(null);
  let zoom = $state(1);
  let fitZoom = $state(1);
  let isFitted = $state(true);
  let fitMode = $state<"all" | "width" | "height" | "1:1">("all");
  let expanded = $state(false);
  let showMinimap = $state(false);
  let isCopyMenuOpen = $state(false);
  let isExportMenuOpen = $state(false);
  let camera = $state<DiagramCamera>({ x: 0, y: 0 });
  let copiedTarget = $state<string | null>(null);
  let isPanning = $state(false);
  let stageHeight = $state<number | null>(null);
  let activeClusterPill = $state<HoveredCluster | null>(null);

  let stageElement = $state<HTMLDivElement | null>(null);
  let canvasElement = $state<HTMLDivElement | null>(null);
  let minimapTrackEl = $state<HTMLDivElement | null>(null);
  let panGesture: PanGesture | null = null;
  let minimapPanGesture: { pointerId: number } | null = null;
  let cameraRef: DiagramCamera = { x: 0, y: 0 };
  let copyResetTimer: number | null = null;
  let clusterLeaveTimer: number | null = null;

  const renderedSize = $derived(
    diagramSize
      ? {
          width: Math.max(1, Math.round(diagramSize.width * zoom)),
          height: Math.max(1, Math.round(diagramSize.height * zoom)),
        }
      : null,
  );

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

  async function svgToPngBlob(svgMarkup: string, naturalWidth: number, naturalHeight: number): Promise<Blob> {
    const scale = 2; // Retina sharpness
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context is unavailable.");

    // Fill background with active canvas color so exported PNG looks complete
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    ctx.fillStyle = isDark ? "#0f1620" : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG into image element for PNG conversion."));
      img.src = url;
    });
    URL.revokeObjectURL(url);

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("Canvas toBlob failed."));
      }, "image/png");
    });
  }

  // Reactive theme observer and re-render
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

  // Stage viewport measurement and responsive auto-fit
  $effect(() => {
    if (!stageElement || !diagramSize) return;

    const measure = () => {
      const styles = getComputedStyle(stageElement!);
      const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
      const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
      const availableWidth = Math.max(1, stageElement!.clientWidth - horizontalPadding);
      const availableHeight = Math.max(1, stageElement!.clientHeight - verticalPadding);

      const nextFit = expanded
        ? clampZoom(calculateDiagramFit(diagramSize!, { width: availableWidth, height: availableHeight }))
        : clampZoom(Math.min(1, availableWidth / diagramSize!.width));

      const targetHeight = expanded
        ? null
        : Math.round(Math.min(620, Math.max(220, diagramSize!.height * nextFit + verticalPadding)));
      stageHeight = targetHeight;
      const visibleHeight = Math.max(1, (targetHeight ?? stageElement!.clientHeight) - verticalPadding);
      fitZoom = nextFit;
      if (isFitted) {
        zoom = nextFit;
        camera = { x: 0, y: Math.max(0, (diagramSize!.height * nextFit - visibleHeight) / 2) };
      }
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(stageElement);
    return () => observer.disconnect();
  });

  // Fullscreen expanded mode keyboard listener
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
      if (clusterLeaveTimer !== null) window.clearTimeout(clusterLeaveTimer);
    };
  });

  // Close menus on outside click
  $effect(() => {
    if (!isCopyMenuOpen && !isExportMenuOpen) return;
    const closeMenus = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".dmd-diagram-dropdown")) {
        isCopyMenuOpen = false;
        isExportMenuOpen = false;
      }
    };
    window.addEventListener("click", closeMenus);
    return () => window.removeEventListener("click", closeMenus);
  });

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

  // Re-clamp camera on bounds delta
  $effect(() => {
    void renderedSize;
    void zoom;
    const next = clampCamera(cameraRef);
    if (next.x !== cameraRef.x || next.y !== cameraRef.y) {
      cameraRef = next;
      camera = next;
    }
  });

  function setManualZoom(nextZoom: number) {
    isFitted = false;
    zoom = clampZoom(nextZoom);
  }

  function setFitMode(mode: "all" | "width" | "height" | "1:1") {
    fitMode = mode;
    isFitted = mode === "all";
    const stage = stageElement;
    if (!stage || !diagramSize) return;
    const styles = getComputedStyle(stage);
    const viewport = {
      width: Math.max(1, stage.clientWidth - Number.parseFloat(styles.paddingLeft) - Number.parseFloat(styles.paddingRight)),
      height: Math.max(1, stage.clientHeight - Number.parseFloat(styles.paddingTop) - Number.parseFloat(styles.paddingBottom)),
    };

    if (mode === "all") {
      zoom = clampZoom(calculateDiagramFit(diagramSize, viewport, true));
      cameraRef = { x: 0, y: 0 };
      camera = { x: 0, y: 0 };
    } else if (mode === "width") {
      zoom = clampZoom(calculateDiagramFitWidth(diagramSize, viewport, true));
      cameraRef = { x: 0, y: 0 };
      camera = { x: 0, y: 0 };
    } else if (mode === "height") {
      zoom = clampZoom(calculateDiagramFitHeight(diagramSize, viewport, true));
      cameraRef = { x: 0, y: 0 };
      camera = { x: 0, y: 0 };
    } else {
      zoom = 1;
      cameraRef = { x: 0, y: 0 };
      camera = { x: 0, y: 0 };
    }
  }

  function fitDiagram() {
    setFitMode("all");
  }

  function resetCamera() {
    cameraRef = { x: 0, y: 0 };
    camera = { x: 0, y: 0 };
    fitDiagram();
  }

  async function triggerCopy(text: string, label: string) {
    try {
      await writeClipboardText(text);
      copiedTarget = label;
      isCopyMenuOpen = false;
      if (copyResetTimer !== null) window.clearTimeout(copyResetTimer);
      copyResetTimer = window.setTimeout(() => (copiedTarget = null), 2000);
    } catch {
      copiedTarget = "error";
    }
  }

  async function copySvgCode() {
    if (!svg) return;
    await triggerCopy(svg, "svg");
  }

  async function copyMermaidSource() {
    await triggerCopy(diagramSource, "source");
  }

  async function copyMarkdownBlock() {
    await triggerCopy(formatDiagramMarkdown(diagramSource), "markdown");
  }

  async function copyPngImage() {
    if (!svg || !diagramSize) return;
    try {
      const blob = await svgToPngBlob(svg, diagramSize.width, diagramSize.height);
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        copiedTarget = "png";
        isCopyMenuOpen = false;
        if (copyResetTimer !== null) window.clearTimeout(copyResetTimer);
        copyResetTimer = window.setTimeout(() => (copiedTarget = null), 2000);
      } else {
        // Fallback to downloading
        downloadPng();
        copiedTarget = "png-downloaded";
        isCopyMenuOpen = false;
        if (copyResetTimer !== null) window.clearTimeout(copyResetTimer);
        copyResetTimer = window.setTimeout(() => (copiedTarget = null), 2200);
      }
    } catch {
      copiedTarget = "error";
    }
  }

  function downloadSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${diagramType.toLowerCase()}-diagram.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
    isExportMenuOpen = false;
  }

  async function downloadPng() {
    if (!svg || !diagramSize) return;
    try {
      const blob = await svgToPngBlob(svg, diagramSize.width, diagramSize.height);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${diagramType.toLowerCase()}-diagram.png`;
      anchor.click();
      URL.revokeObjectURL(url);
      isExportMenuOpen = false;
    } catch {
      copiedTarget = "error";
    }
  }

  // Pointer panning & focus interactions
  function canStartPan(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return true;
    return !target.closest(".dmd-diagram-subgraph-pill, .dmd-diagram-floating-controls, .dmd-diagram-minimap, button, a");
  }

  function handlePanStart(event: PointerEvent) {
    const stage = stageElement;
    if (!stage || (event.pointerType === "mouse" && event.button !== 0) || !canStartPan(event.target)) return;
    panGesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    };
    stage.setPointerCapture(event.pointerId);
    isPanning = true;
    event.preventDefault();
  }

  function handlePanMove(event: PointerEvent) {
    const gesture = panGesture;
    if (gesture?.pointerId === event.pointerId) {
      const deltaX = event.clientX - gesture.lastX;
      const deltaY = event.clientY - gesture.lastY;
      if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 4) {
        gesture.moved = true;
      }
      const result = panDiagramCamera(cameraRef, { x: deltaX, y: deltaY }, readCameraBounds());
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
      cameraRef = result.camera;
      camera = result.camera;
      if (!expanded && result.remainder.y !== 0) window.scrollBy({ top: -result.remainder.y, behavior: "instant" as any });
      event.preventDefault();
    }
  }

  function focusElement(el: SVGGraphicsElement) {
    const stage = stageElement;
    const canvas = canvasElement;
    if (!stage || !canvas) return;
    const elRect = el.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const elCenterX = elRect.left + elRect.width / 2 - (canvasRect.left + canvasRect.width / 2);
    const elCenterY = elRect.top + elRect.height / 2 - (canvasRect.top + canvasRect.height / 2);

    const targetCamera = { x: -elCenterX, y: -elCenterY };
    const bounded = panDiagramCamera({ x: 0, y: 0 }, targetCamera, readCameraBounds());
    cameraRef = bounded.camera;
    camera = bounded.camera;
  }

  function handlePanEnd(event: PointerEvent) {
    const stage = stageElement;
    const gesture = panGesture;
    if (gesture?.pointerId !== event.pointerId) return;

    // If pointer didn't move, it was a click on a node/subgraph to focus it
    if (!gesture.moved) {
      const target = event.target as Element | null;
      const nodeOrCluster = target?.closest(".pele-node, .pele-cluster") as SVGGraphicsElement | null;
      if (nodeOrCluster && !target?.closest("button, .dmd-diagram-subgraph-pill")) {
        focusElement(nodeOrCluster);
      }
    }

    panGesture = null;
    isPanning = false;
    if (stage?.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  }

  // Smooth double-click to zoom in or reset
  function handleDoubleClick(event: MouseEvent) {
    const stage = stageElement;
    if (!stage || !diagramSize) return;
    if ((event.target as Element | null)?.closest("button, .dmd-diagram-subgraph-pill, .dmd-diagram-minimap")) return;

    const rect = stage.getBoundingClientRect();
    const mx = event.clientX - (rect.left + rect.width / 2);
    const my = event.clientY - (rect.top + rect.height / 2);

    if (isFitted || Math.abs(zoom - fitZoom) < 0.05) {
      const targetZoom = clampZoom(Math.max(1.5, fitZoom * 1.8));
      const zoomRatio = targetZoom / zoom;
      const newCamX = mx - (mx - cameraRef.x) * zoomRatio;
      const newCamY = my - (my - cameraRef.y) * zoomRatio;
      isFitted = false;
      zoom = targetZoom;
      const bounded = panDiagramCamera({ x: 0, y: 0 }, { x: newCamX, y: newCamY }, readCameraBounds());
      cameraRef = bounded.camera;
      camera = bounded.camera;
    } else {
      fitDiagram();
    }
  }

  // Stage pointer tracking for contextual subgraph pill
  function handleStagePointerMove(event: PointerEvent) {
    if (isPanning) return;
    const target = event.target as Element | null;
    const cluster = target?.closest(".pele-cluster") as SVGGraphicsElement | null;

    if (!cluster) {
      if (activeClusterPill && !target?.closest(".dmd-diagram-subgraph-pill")) {
        if (!clusterLeaveTimer) {
          clusterLeaveTimer = window.setTimeout(() => {
            activeClusterPill = null;
            clusterLeaveTimer = null;
          }, 200);
        }
      }
      return;
    }

    if (clusterLeaveTimer) {
      window.clearTimeout(clusterLeaveTimer);
      clusterLeaveTimer = null;
    }

    const currentCanvas = canvasElement;
    if (!currentCanvas) return;
    const canvasRect = currentCanvas.getBoundingClientRect();
    const rect = cluster.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const definitions = extractDiagramSubgraphs(diagramSource);
    const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const clusterLabel = cluster.querySelector(".pele-cluster-label")?.textContent?.trim() || cluster.id || "Subgraph";
    const norm = normalize(cluster.dataset.id || cluster.id || clusterLabel);

    const definition =
      definitions.find((d) => normalize(d.id) === norm || normalize(d.label) === norm) ||
      definitions.find((d) => norm.includes(normalize(d.id))) ||
      definitions[0];

    if (!definition) return;

    activeClusterPill = {
      id: definition.id,
      label: definition.label || clusterLabel,
      markdown: formatDiagramSubgraphMarkdown(diagramSource, definition.source),
      left: rect.right - canvasRect.left - 6,
      top: rect.top - canvasRect.top + 6,
    };
  }

  // Keyboard navigation when stage is focused
  function handleKeyDown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    const STEP = 45;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setManualZoom(zoom + ZOOM_STEP);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      setManualZoom(zoom - ZOOM_STEP);
    } else if (event.key === "0") {
      event.preventDefault();
      setManualZoom(1);
    } else if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      fitDiagram();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      const res = panDiagramCamera(cameraRef, { x: STEP, y: 0 }, readCameraBounds());
      cameraRef = res.camera;
      camera = res.camera;
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      const res = panDiagramCamera(cameraRef, { x: -STEP, y: 0 }, readCameraBounds());
      cameraRef = res.camera;
      camera = res.camera;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const res = panDiagramCamera(cameraRef, { x: 0, y: STEP }, readCameraBounds());
      cameraRef = res.camera;
      camera = res.camera;
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const res = panDiagramCamera(cameraRef, { x: 0, y: -STEP }, readCameraBounds());
      cameraRef = res.camera;
      camera = res.camera;
    }
  }

  // Non-passive wheel handler: Pan diagram or Ctrl/Cmd/Pinch zoom toward mouse pointer
  $effect(() => {
    const stage = stageElement;
    if (!stage) return;

    const handleWheel = (event: WheelEvent) => {
      if (!renderedSize || !diagramSize) return;

      // Ctrl or Meta wheel is zoom toward cursor (also triggered by trackpad pinch gesture)
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const rect = stage.getBoundingClientRect();
        const mx = event.clientX - (rect.left + rect.width / 2);
        const my = event.clientY - (rect.top + rect.height / 2);

        const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
        const nextZoom = clampZoom(zoom * factor);
        if (nextZoom === zoom) return;

        const zoomRatio = nextZoom / zoom;
        const newCamX = mx - (mx - cameraRef.x) * zoomRatio;
        const newCamY = my - (my - cameraRef.y) * zoomRatio;

        isFitted = false;
        zoom = nextZoom;
        const bounded = panDiagramCamera({ x: 0, y: 0 }, { x: newCamX, y: newCamY }, readCameraBounds());
        cameraRef = bounded.camera;
        camera = bounded.camera;
        return;
      }

      // Normal wheel: pan diagram camera
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

  // Minimap pan and jump logic
  function handleMinimapPointerDown(event: PointerEvent) {
    const track = minimapTrackEl;
    if (!track || !renderedSize || !diagramSize) return;
    minimapPanGesture = { pointerId: event.pointerId };
    track.setPointerCapture(event.pointerId);

    const updateFromMinimap = (e: PointerEvent) => {
      const rect = track.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width - 0.5;
      const normY = (e.clientY - rect.top) / rect.height - 0.5;
      const targetCamX = -normX * renderedSize.width;
      const targetCamY = -normY * renderedSize.height;
      const bounded = panDiagramCamera({ x: 0, y: 0 }, { x: targetCamX, y: targetCamY }, readCameraBounds());
      cameraRef = bounded.camera;
      camera = bounded.camera;
    };

    updateFromMinimap(event);

    const onPointerMove = (e: PointerEvent) => {
      if (minimapPanGesture?.pointerId === e.pointerId) updateFromMinimap(e);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (minimapPanGesture?.pointerId === e.pointerId) {
        minimapPanGesture = null;
        if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }
</script>

<svelte:options
  customElement={{
    tag: "dmd-mermaid",
    shadow: "none",
  }}
/>

<figure class="dmd-diagram-viewer{expanded ? " is-expanded" : ""}">
  <div class="dmd-diagram-frame">
    <!-- Polished Top Toolbar -->
    <div class="dmd-diagram-toolbar">
      <div class="dmd-diagram-badge">
        <span class="dmd-diagram-badge-icon" aria-hidden="true">📐</span>
        <span class="dmd-diagram-badge-text">{diagramType}</span>
      </div>

      <span class="dmd-diagram-toolbar-spacer"></span>

      <!-- Copy Dropdown Button -->
      <div class="dmd-diagram-dropdown">
        <button
          type="button"
          class="dmd-diagram-btn dmd-diagram-dropdown-trigger{copiedTarget ? ' copied' : ''}"
          disabled={!svg}
          aria-expanded={isCopyMenuOpen}
          aria-haspopup="menu"
          onclick={() => { isCopyMenuOpen = !isCopyMenuOpen; isExportMenuOpen = false; }}
        >
          <svg viewBox="0 0 24 24" class="dmd-icon" aria-hidden="true">
            {#if copiedTarget}
              <path d="m5 12 4 4L19 6" />
            {:else}
              <rect x="8" y="8" width="11" height="11" rx="2" />
              <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
            {/if}
          </svg>
          <span>{copiedTarget ? "Copied!" : "Copy"}</span>
          <span class="dmd-chevron" aria-hidden="true">▾</span>
        </button>

        {#if isCopyMenuOpen}
          <div class="dmd-diagram-dropdown-menu" role="menu">
            <button type="button" class="dmd-dropdown-item" role="menuitem" onclick={copyMarkdownBlock}>
              <span class="dmd-dropdown-icon">📋</span>
              <span class="dmd-dropdown-label">Copy Markdown (<code>```mermaid</code>)</span>
            </button>
            <button type="button" class="dmd-dropdown-item" role="menuitem" onclick={copyMermaidSource}>
              <span class="dmd-dropdown-icon">📝</span>
              <span class="dmd-dropdown-label">Copy Mermaid Source</span>
            </button>
            <button type="button" class="dmd-dropdown-item" role="menuitem" onclick={copySvgCode}>
              <span class="dmd-dropdown-icon">🖼️</span>
              <span class="dmd-dropdown-label">Copy SVG Code</span>
            </button>
            <button type="button" class="dmd-dropdown-item" role="menuitem" onclick={copyPngImage}>
              <span class="dmd-dropdown-icon">🎨</span>
              <span class="dmd-dropdown-label">Copy PNG Image</span>
            </button>
          </div>
        {/if}
      </div>

      <!-- Export / Download Dropdown -->
      <div class="dmd-diagram-dropdown">
        <button
          type="button"
          class="dmd-diagram-btn dmd-diagram-dropdown-trigger"
          disabled={!svg}
          aria-expanded={isExportMenuOpen}
          aria-haspopup="menu"
          onclick={() => { isExportMenuOpen = !isExportMenuOpen; isCopyMenuOpen = false; }}
        >
          <svg viewBox="0 0 24 24" class="dmd-icon" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export</span>
          <span class="dmd-chevron" aria-hidden="true">▾</span>
        </button>

        {#if isExportMenuOpen}
          <div class="dmd-diagram-dropdown-menu" role="menu">
            <button type="button" class="dmd-dropdown-item" role="menuitem" onclick={downloadSvg}>
              <span class="dmd-dropdown-icon">📄</span>
              <span class="dmd-dropdown-label">Download Vector SVG</span>
            </button>
            <button type="button" class="dmd-dropdown-item" role="menuitem" onclick={downloadPng}>
              <span class="dmd-dropdown-icon">🖼️</span>
              <span class="dmd-dropdown-label">Download Raster PNG (2x)</span>
            </button>
          </div>
        {/if}
      </div>

      <span class="dmd-diagram-toolbar-divider" aria-hidden="true"></span>

      <!-- Minimap Toggle -->
      <button
        type="button"
        class="dmd-diagram-btn dmd-diagram-icon-btn{showMinimap ? ' active' : ''}"
        disabled={!svg}
        aria-label="Toggle Minimap"
        title={showMinimap ? "Hide Minimap" : "Show Minimap"}
        onclick={() => (showMinimap = !showMinimap)}
      >
        <svg viewBox="0 0 24 24" class="dmd-icon" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <rect x="13" y="13" width="6" height="6" rx="1" fill="currentColor" fill-opacity="0.3" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      </button>

      <!-- Expand / Restore Button -->
      <button
        type="button"
        class="dmd-diagram-btn dmd-diagram-icon-btn"
        disabled={!svg}
        aria-label={expanded ? "Exit Fullscreen" : "Expand Diagram"}
        title={expanded ? "Exit Fullscreen (Esc)" : "Expand Diagram"}
        onclick={() => (expanded = !expanded)}
      >
        {#if expanded}
          <svg viewBox="0 0 24 24" class="dmd-icon" aria-hidden="true">
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="14" y1="10" x2="21" y2="3" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" class="dmd-icon" aria-hidden="true">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        {/if}
      </button>
    </div>

    <!-- Diagram Stage with Grid Canvas -->
    <div
      role="application"
      aria-label="Interactive Mermaid diagram canvas"
      tabindex="0"
      class="dmd-diagram-stage{isPanning ? " is-panning" : ""}"
      style={stageHeight !== null && !expanded ? `height: ${stageHeight}px; aspect-ratio: auto;` : undefined}
      bind:this={stageElement}
      onpointerdown={handlePanStart}
      onpointermove={handlePanMove}
      onpointerup={handlePanEnd}
      onpointercancel={handlePanEnd}
      ondblclick={handleDoubleClick}
      onkeydown={handleKeyDown}
      onpointerover={handleStagePointerMove}
    >
      {#if error}
        <pre class="dmd-diagram-error">Diagram syntax error: {error}</pre>
      {:else if svg && renderedSize}
        <div
          bind:this={canvasElement}
          class="dmd-diagram-canvas"
          style="width: {renderedSize.width}px; height: {renderedSize.height}px; margin-left: {-Math.round(renderedSize.width / 2)}px; margin-top: {-Math.round(renderedSize.height / 2)}px; transform: translate({Math.round(camera.x)}px, {Math.round(camera.y)}px);"
        >
          <div class="dmd-diagram-svg">
            {@html svg}
          </div>

          <!-- Contextual Subgraph Hover Pill (Clean & Non-Intrusive) -->
          {#if activeClusterPill}
            <div
              class="dmd-diagram-subgraph-pill"
              style="left: {activeClusterPill.left}px; top: {activeClusterPill.top}px;"
            >
              <button
                type="button"
                class="dmd-subgraph-pill-btn dmd-diagram-subgraph-copy{copiedTarget === activeClusterPill.id ? ' copied' : ''}"
                aria-label={activeClusterPill.label ? `Copy ${activeClusterPill.label} subgraph Markdown` : "Copy graph Markdown"}
                onclick={() => triggerCopy(activeClusterPill!.markdown, activeClusterPill!.id)}
                title={activeClusterPill.label ? `Copy ${activeClusterPill.label} subgraph Markdown` : "Copy graph Markdown"}
              >
                <svg viewBox="0 0 24 24" class="dmd-icon-sm" aria-hidden="true">
                  {#if copiedTarget === activeClusterPill.id}
                    <path d="m5 12 4 4L19 6" />
                  {:else}
                    <rect x="8" y="8" width="11" height="11" rx="2" />
                    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                  {/if}
                </svg>
                <span>{copiedTarget === activeClusterPill.id ? "Copied Subgraph!" : `Copy "${activeClusterPill.label}"`}</span>
              </button>
            </div>
          {/if}
        </div>

        <!-- Floating Corner Navigation Controls -->
        <div class="dmd-diagram-floating-controls" role="toolbar" aria-label="Diagram navigation">
          <button
            type="button"
            class="dmd-diagram-pill-btn"
            aria-label="Zoom out (-)"
            disabled={zoom <= MIN_ZOOM}
            onclick={() => setManualZoom(zoom - ZOOM_STEP)}
            title="Zoom out (-)"
          >
            −
          </button>

          <button
            type="button"
            class="dmd-diagram-pill-btn dmd-diagram-zoom-badge"
            aria-label="Reset zoom to 100%"
            title="Click to reset 1:1"
            onclick={() => setFitMode("1:1")}
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            class="dmd-diagram-pill-btn"
            aria-label="Zoom in (+)"
            disabled={zoom >= MAX_ZOOM}
            onclick={() => setManualZoom(zoom + ZOOM_STEP)}
            title="Zoom in (+)"
          >
            +
          </button>

          <span class="dmd-floating-divider" aria-hidden="true"></span>

          <button
            type="button"
            class="dmd-diagram-pill-btn{isFitted && fitMode === 'all' ? ' active' : ''}"
            onclick={() => setFitMode(fitMode === "all" ? "width" : fitMode === "width" ? "height" : "all")}
            title="Cycle Fit Modes (All / Width / Height)"
          >
            {fitMode === "width" ? "Fit W" : fitMode === "height" ? "Fit H" : "Fit"}
          </button>

          <button
            type="button"
            class="dmd-diagram-pill-btn"
            onclick={resetCamera}
            title="Reset position and fit (F)"
          >
            <svg viewBox="0 0 24 24" class="dmd-icon-sm" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M3 12h3M18 12h3M12 3v3M12 18v3" />
            </svg>
          </button>
        </div>

        <!-- Interactive Minimap Card -->
        {#if showMinimap && diagramSize}
          <div class="dmd-diagram-minimap">
            <div class="dmd-minimap-header">
              <span>Overview</span>
              <button
                type="button"
                class="dmd-minimap-close"
                onclick={() => (showMinimap = false)}
                aria-label="Close Minimap"
              >
                ✕
              </button>
            </div>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              bind:this={minimapTrackEl}
              class="dmd-minimap-track"
              onpointerdown={handleMinimapPointerDown}
            >
              <div class="dmd-minimap-svg-preview">
                {@html svg}
              </div>
              <!-- Viewport Indicator Box -->
              {#if stageElement}
                {@const stageW = stageElement.clientWidth || 400}
                {@const stageH = stageElement.clientHeight || 400}
                {@const vpW = Math.min(100, Math.max(10, (stageW / renderedSize.width) * 100))}
                {@const vpH = Math.min(100, Math.max(10, (stageH / renderedSize.height) * 100))}
                {@const vpLeft = Math.min(100 - vpW, Math.max(0, 50 - ((camera.x) / renderedSize.width) * 100 - vpW / 2))}
                {@const vpTop = Math.min(100 - vpH, Math.max(0, 50 - ((camera.y) / renderedSize.height) * 100 - vpH / 2))}
                <div
                  class="dmd-minimap-viewport"
                  style="left: {vpLeft}%; top: {vpTop}%; width: {vpW}%; height: {vpH}%;"
                ></div>
              {/if}
            </div>
          </div>
        {/if}
      {:else}
        <div class="dmd-diagram-loading">Rendering diagram…</div>
      {/if}
    </div>

    <!-- Hidden Accessible Status Announcement -->
    <div class="dmd-diagram-status" aria-live="polite">
      {copiedTarget === "error" ? "Clipboard access is unavailable. Select the diagram text manually." : ""}
      {copiedTarget ? `Copied ${copiedTarget} to clipboard.` : ""}
    </div>
  </div>
</figure>