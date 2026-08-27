import type React from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  type DiagramSize,
  extractDiagramSubgraphs,
  formatDiagramMarkdown,
  formatDiagramSubgraphMarkdown,
  readDiagramSize,
  renderDiagramSvg,
  resolveDiagramContext,
} from "../markdown/mermaid";

interface MermaidDiagramProps {
  /** Raw Mermaid diagram definition (already decoded from the placeholder). */
  source: string;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const clampZoom = (value: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));

interface DiagramSubgraphAction {
  id: string;
  label: string;
  markdown: string;
  left: number;
  top: number;
}

interface DiagramCamera {
  x: number;
  y: number;
}

interface PanGesture {
  pointerId: number;
  startX: number;
  startY: number;
  cameraX: number;
  cameraY: number;
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

const CopyIcon: React.FC<{ copied?: boolean }> = ({ copied = false }) =>
  copied ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );

/**
 * Interactive diagram viewer mounted onto every `mermaid` fence placeholder.
 *
 * - Renders through the locally bundled Mermaid with DocMeDown family tokens,
 *   so palettes match the active theme online and under file:///.
 * - Re-renders automatically when the theme family or color mode changes.
 * - Provides zoom controls, SVG download, fullscreen mode, and readable
 *   syntax-error reporting instead of Mermaid's injected error markup.
 */
export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ source }) => {
  const [svg, setSvg] = useState<string | null>(null);
  const [diagramSize, setDiagramSize] = useState<DiagramSize | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fitZoom, setFitZoom] = useState(1);
  const [isFitted, setIsFitted] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [subgraphActions, setSubgraphActions] = useState<DiagramSubgraphAction[]>([]);
  const [camera, setCamera] = useState<DiagramCamera>({ x: 0, y: 0 });
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<PanGesture | null>(null);
  const copyResetRef = useRef<number | null>(null);

  const renderedSize = useMemo(
    () =>
      diagramSize
        ? {
            width: Math.max(1, Math.round(diagramSize.width * zoom)),
            height: Math.max(1, Math.round(diagramSize.height * zoom)),
          }
        : null,
    [diagramSize, zoom],
  );

  // Re-run whenever the resolved document theme changes. Attribute/style
  // mutations on <html> cover family switches, mode switches, and inline
  // accent overrides alike.
  useEffect(() => {
    let cancelled = false;

    const render = () => {
      const { family, mode, tokens } = resolveDiagramContext();
      renderDiagramSvg(source, family, mode, tokens)
        .then((nextSvg) => {
          if (!cancelled) {
            setSvg(nextSvg);
            setDiagramSize(readDiagramSize(nextSvg));
            setError(null);
            setIsFitted(true);
          }
        })
        .catch((renderError: unknown) => {
          if (!cancelled) {
            setSvg(null);
            setDiagramSize(null);
            setError(renderError instanceof Error ? renderError.message : String(renderError));
          }
        });
    };

    render();

    if (typeof MutationObserver === "undefined")
      return () => {
        cancelled = true;
      };

    const observer = new MutationObserver(() => {
      if (!cancelled) render();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-dmd-theme", "data-theme", "data-dmd-density", "style"],
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [source]);

  // Mermaid occasionally emits a viewBox that excludes the tail of clustered
  // flowcharts (the Architecture Overview's third subgraph is a real example).
  // Once the SVG is in the document, measure its actual graphics tree and
  // replace the nominal bounds before fitting the viewer.
  useLayoutEffect(() => {
    if (!svg) return;
    const svgElement = canvasRef.current?.querySelector("svg");
    const graphics = svgElement?.querySelector<SVGGElement>(":scope > g");
    if (!svgElement || !graphics || typeof graphics.getBBox !== "function") return;

    try {
      const bounds = graphics.getBBox();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const padding = 20;
      const measured = {
        width: bounds.width + padding * 2,
        height: bounds.height + padding * 2,
      };
      svgElement.setAttribute(
        "viewBox",
        `${bounds.x - padding} ${bounds.y - padding} ${measured.width} ${measured.height}`,
      );
      svgElement.removeAttribute("width");
      svgElement.removeAttribute("height");
      setDiagramSize(measured);
    } catch {
      // Some non-browser DOM shims do not implement SVG geometry. The emitted
      // Mermaid viewBox remains a safe fallback in those environments.
    }
  }, [svg]);

  // The default viewer is a square inspection window. Fit is intentionally
  // width-first: tall diagrams continue below the fold and are explored by
  // panning instead of making the document card grow or exposing scrollbars.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || !diagramSize) return;

    const measure = () => {
      const styles = getComputedStyle(stage);
      const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
      const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
      const availableWidth = Math.max(1, stage.clientWidth - horizontalPadding);
      const availableHeight = Math.max(1, stage.clientHeight - verticalPadding);
      const nextFit = clampZoom(availableWidth / diagramSize.width);
      setFitZoom(nextFit);
      if (isFitted) {
        setZoom(nextFit);
        setCamera({ x: 0, y: Math.max(0, (diagramSize.height * nextFit - availableHeight) / 2) });
      }
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [diagramSize, isFitted]);

  // HTML copy controls are attached to Mermaid clusters (subgraphs), not
  // individual nodes. Final browser bounds keep the controls crisp after Fit,
  // manual zoom, bounds repair, panning, and responsive layout changes.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const svgElement = canvas?.querySelector("svg");
    if (!canvas || !svgElement || !diagramSize || zoom <= 0) {
      setSubgraphActions([]);
      return;
    }

    const frame = requestAnimationFrame(() => {
      const canvasRect = canvas.getBoundingClientRect();
      const definitions = extractDiagramSubgraphs(source);
      const unused = new Set(definitions.map((_, index) => index));
      const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
      const actions = [...svgElement.querySelectorAll<SVGGraphicsElement>(".cluster")]
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
            markdown: formatDiagramSubgraphMarkdown(source, definition.source),
            left: rect.right - canvasRect.left - 8,
            top: rect.top - canvasRect.top + 8,
          };
        })
        .filter((action): action is DiagramSubgraphAction => action !== null);
      setSubgraphActions(actions);
    });

    return () => cancelAnimationFrame(frame);
  }, [diagramSize, source, zoom]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  useEffect(
    () => () => {
      if (copyResetRef.current !== null) window.clearTimeout(copyResetRef.current);
    },
    [],
  );

  const downloadSvg = useCallback(() => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "diagram.svg";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [svg]);

  const setManualZoom = useCallback((nextZoom: number) => {
    setIsFitted(false);
    setZoom(clampZoom(nextZoom));
  }, []);

  const fitDiagram = useCallback(() => {
    setIsFitted(true);
    setZoom(fitZoom);
  }, [fitZoom]);

  const clampCamera = useCallback(
    (next: DiagramCamera): DiagramCamera => {
      const stage = stageRef.current;
      if (!stage || !renderedSize) return { x: 0, y: 0 };
      const styles = getComputedStyle(stage);
      const availableWidth =
        stage.clientWidth - Number.parseFloat(styles.paddingLeft) - Number.parseFloat(styles.paddingRight);
      const availableHeight =
        stage.clientHeight - Number.parseFloat(styles.paddingTop) - Number.parseFloat(styles.paddingBottom);
      const maxX = Math.max(0, (renderedSize.width - availableWidth) / 2);
      const maxY = Math.max(0, (renderedSize.height - availableHeight) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [renderedSize],
  );

  useLayoutEffect(() => {
    setCamera((current) => {
      const next = clampCamera(current);
      return next.x === current.x && next.y === current.y ? current : next;
    });
  }, [clampCamera]);

  const copyMarkdown = useCallback(async (markdown: string, target: string) => {
    try {
      await writeClipboardText(markdown);
      setCopiedTarget(target);
      if (copyResetRef.current !== null) window.clearTimeout(copyResetRef.current);
      copyResetRef.current = window.setTimeout(() => setCopiedTarget(null), 1800);
    } catch {
      setCopiedTarget("error");
    }
  }, []);

  const canStartPan = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return true;
    return !target.closest(".node, text, .dmd-diagram-subgraph-copy, button, a");
  };

  const handlePanStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage || (event.pointerType === "mouse" && event.button !== 0) || !canStartPan(event.target)) return;
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      cameraX: camera.x,
      cameraY: camera.y,
    };
    stage.setPointerCapture(event.pointerId);
    setIsPanning(true);
    event.preventDefault();
  };

  const handlePanMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = panRef.current;
    if (gesture?.pointerId === event.pointerId) {
      setCamera(
        clampCamera({
          x: gesture.cameraX + event.clientX - gesture.startX,
          y: gesture.cameraY + event.clientY - gesture.startY,
        }),
      );
    }
  };

  const handlePanEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (panRef.current?.pointerId !== event.pointerId) return;
    panRef.current = null;
    setIsPanning(false);
    if (stage?.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  };

  return (
    <figure className={`dmd-diagram-viewer${expanded ? " is-expanded" : ""}`}>
      <div className="dmd-diagram-frame">
        <div className="dmd-diagram-toolbar">
          <button
            type="button"
            className={`dmd-diagram-btn dmd-diagram-icon-btn dmd-diagram-copy-all${copiedTarget === "graph" ? " copied" : ""}`}
            disabled={!svg}
            aria-label={copiedTarget === "graph" ? "Graph Markdown copied" : "Copy graph Markdown"}
            title={copiedTarget === "graph" ? "Copied" : "Copy graph Markdown"}
            onClick={() => copyMarkdown(formatDiagramMarkdown(source), "graph")}
          >
            <CopyIcon copied={copiedTarget === "graph"} />
          </button>
          <span className="dmd-diagram-toolbar-divider" aria-hidden="true" />
          <button
            type="button"
            className="dmd-diagram-btn"
            aria-label="Zoom out"
            disabled={!svg || zoom <= MIN_ZOOM}
            onClick={() => setManualZoom(zoom - ZOOM_STEP)}
          >
            −
          </button>
          <span className="dmd-diagram-zoom-label" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="dmd-diagram-btn"
            aria-label="Zoom in"
            disabled={!svg || zoom >= MAX_ZOOM}
            onClick={() => setManualZoom(zoom + ZOOM_STEP)}
          >
            +
          </button>
          <button type="button" className="dmd-diagram-btn" disabled={!svg || isFitted} onClick={fitDiagram}>
            Fit
          </button>
          <button
            type="button"
            className="dmd-diagram-btn"
            disabled={!svg || zoom === 1}
            onClick={() => setManualZoom(1)}
          >
            1:1
          </button>
          <span className="dmd-diagram-toolbar-spacer" />
          <button type="button" className="dmd-diagram-btn" disabled={!svg} onClick={downloadSvg}>
            SVG
          </button>
          <button
            type="button"
            className="dmd-diagram-btn"
            disabled={!svg}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? "Close" : "Expand"}
          </button>
        </div>

        <div
          className={`dmd-diagram-stage${isPanning ? " is-panning" : ""}`}
          ref={stageRef}
          onPointerDown={handlePanStart}
          onPointerMove={handlePanMove}
          onPointerUp={handlePanEnd}
          onPointerCancel={handlePanEnd}
        >
          {error ? (
            <pre className="dmd-diagram-error">Diagram syntax error: {error}</pre>
          ) : svg && renderedSize ? (
            <div
              ref={canvasRef}
              className="dmd-diagram-canvas"
              style={{
                width: `${renderedSize.width}px`,
                height: `${renderedSize.height}px`,
                transform: `translate3d(calc(-50% + ${camera.x}px), calc(-50% + ${camera.y}px), 0)`,
              }}
            >
              <div className="dmd-diagram-svg" dangerouslySetInnerHTML={{ __html: svg }} />
              {subgraphActions.map((subgraph) => (
                <button
                  type="button"
                  key={subgraph.id}
                  className={`dmd-diagram-subgraph-copy${copiedTarget === subgraph.id ? " copied" : ""}`}
                  style={{ left: `${subgraph.left}px`, top: `${subgraph.top}px` }}
                  aria-label={
                    copiedTarget === subgraph.id
                      ? `${subgraph.label} subgraph Markdown copied`
                      : `Copy ${subgraph.label} subgraph Markdown`
                  }
                  title={copiedTarget === subgraph.id ? "Copied" : `Copy ${subgraph.label} subgraph Markdown`}
                  onClick={() => copyMarkdown(subgraph.markdown, subgraph.id)}
                >
                  <CopyIcon copied={copiedTarget === subgraph.id} />
                </button>
              ))}
            </div>
          ) : (
            <div className="dmd-diagram-loading">Rendering diagram…</div>
          )}
        </div>
        <div className="dmd-diagram-status" aria-live="polite">
          {copiedTarget === "error" ? "Clipboard unavailable. Select the diagram text manually." : ""}
        </div>
      </div>
    </figure>
  );
};
