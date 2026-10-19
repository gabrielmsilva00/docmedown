/**
 * The diagram engine is lazy-loaded to keep the main bundle small. Only pages
 * with diagrams trigger the load. All pure utility functions
 * (readDiagramSize, calculateDiagramFit, etc.) remain synchronous and available
 * without loading the renderer.
 */

// Type-only import — tree-shaken at build time, zero runtime cost.
import type { RenderOptions } from "pele";
import { loadMermaidEngine } from "./mermaid-loader";

/**
 * DocMeDown diagram engine.
 *
 * Fences with the `mermaid` language emit `<div data-dmd-diagram="…">`
 * placeholders (see highlighter.ts). This module decodes each placeholder,
 * renders it through the locally bundled Pele renderer, and wraps the result in
 * an interactive viewer: family-aware theming, zoom/pan, fullscreen, SVG
 * export, readable error reporting, and automatic re-render when the active
 * DocMeDown theme family or color mode changes.
 *
 * Pele themes through `--pele-*` CSS variables. They are written onto the SVG
 * root so output is deterministic across online and `file:///` contexts and an
 * exported SVG keeps its colors outside the page — no reliance on ambient CSS
 * and no foreignObject HTML labels.
 */

export type DiagramFamily = "atlas" | "blueprint" | "terminal" | "editorial" | "botanical" | "studio";
export type DiagramMode = "light" | "dark";

/** Subset of DocMeDown tokens diagrams consume; overridable for pure tests. */
export interface DiagramTokens {
  canvas: string;
  surface: string;
  surfaceRaised: string;
  ink: string;
  inkSecondary: string;
  rule: string;
  accent: string;
  codeSurface: string;
  codeInk: string;
  fontFamily: string;
}

export interface DiagramSize {
  width: number;
  height: number;
}

export interface DiagramCamera {
  x: number;
  y: number;
}

export interface DiagramCameraBounds {
  x: number;
  y: number;
}

export interface DiagramPanResult {
  camera: DiagramCamera;
  remainder: DiagramCamera;
}

export interface DiagramSubgraph {
  id: string;
  label: string;
  source: string;
  startLine: number;
}

/**
 * Reads Mermaid's intrinsic coordinate system without requiring a browser DOM.
 * Mermaid emits a viewBox; width/height remain as a defensive fallback for
 * hand-authored or future renderer output.
 */
export function readDiagramSize(svg: string): DiagramSize | null {
  const viewBox = svg.match(/\bviewBox=["']\s*[-+\d.eE]+[\s,]+[-+\d.eE]+[\s,]+([-+\d.eE]+)[\s,]+([-+\d.eE]+)\s*["']/i);
  const width = viewBox ? Number(viewBox[1]) : Number(svg.match(/\bwidth=["']([\d.]+)(?:px)?["']/i)?.[1]);
  const height = viewBox ? Number(viewBox[2]) : Number(svg.match(/\bheight=["']([\d.]+)(?:px)?["']/i)?.[1]);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}

/** Returns the largest scale that contains the entire diagram in a viewport. */
export function calculateDiagramFit(diagram: DiagramSize, viewport: DiagramSize, allowUpscale = false): number {
  if (diagram.width <= 0 || diagram.height <= 0 || viewport.width <= 0 || viewport.height <= 0) return 1;
  const scale = Math.min(viewport.width / diagram.width, viewport.height / diagram.height);
  return Math.max(0.05, allowUpscale ? scale : Math.min(1, scale));
}

/** Returns the scale that fits the diagram's width to the viewport width. */
export function calculateDiagramFitWidth(diagram: DiagramSize, viewport: DiagramSize, allowUpscale = false): number {
  if (diagram.width <= 0 || viewport.width <= 0) return 1;
  const scale = viewport.width / diagram.width;
  return Math.max(0.05, allowUpscale ? scale : Math.min(1, scale));
}

/** Returns the scale that fits the diagram's height to the viewport height. */
export function calculateDiagramFitHeight(diagram: DiagramSize, viewport: DiagramSize, allowUpscale = false): number {
  if (diagram.height <= 0 || viewport.height <= 0) return 1;
  const scale = viewport.height / diagram.height;
  return Math.max(0.05, allowUpscale ? scale : Math.min(1, scale));
}

/** Identifies human-readable diagram type from Mermaid source. */
export function detectDiagramType(source: string): string {
  const cleaned = source.replace(/^\s*(?:---\r?\n[\s\S]*?\r?\n---\s*|%%[^\n]*\n\s*)*/, "").trim();
  const match = cleaned.match(/^([a-zA-Z0-9_-]+)/);
  if (!match) return "Diagram";
  const raw = match[1].toLowerCase();
  if (raw === "flowchart" || raw === "graph") return "Flowchart";
  if (raw === "sequencediagram") return "Sequence";
  if (raw === "classdiagram") return "Class";
  if (raw === "statediagram" || raw === "statediagram-v2") return "State";
  if (raw === "erdiagram") return "ER Diagram";
  if (raw === "gitgraph") return "Git Graph";
  if (raw === "mindmap") return "Mindmap";
  if (raw === "pie") return "Pie Chart";
  if (raw === "gantt") return "Gantt";
  if (raw === "timeline") return "Timeline";
  if (raw === "journey") return "User Journey";
  if (raw === "kanban") return "Kanban";
  if (raw === "architecture" || raw === "architecture-beta") return "Architecture";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Returns the camera travel available on each axis around a centered diagram. */
export function calculateDiagramCameraBounds(diagram: DiagramSize, viewport: DiagramSize): DiagramCameraBounds {
  return {
    x: Math.max(0, (diagram.width - viewport.width) / 2),
    y: Math.max(0, (diagram.height - viewport.height) / 2),
  };
}

/**
 * Applies a camera-space pan delta and returns any movement left after reaching
 * a bound. The caller can hand the vertical remainder to document scrolling.
 */
export function panDiagramCamera(
  current: DiagramCamera,
  delta: DiagramCamera,
  bounds: DiagramCameraBounds,
): DiagramPanResult {
  const requested = { x: current.x + delta.x, y: current.y + delta.y };
  const camera = {
    x: Math.min(bounds.x, Math.max(-bounds.x, requested.x)),
    y: Math.min(bounds.y, Math.max(-bounds.y, requested.y)),
  };

  return {
    camera,
    remainder: {
      x: requested.x - camera.x,
      y: requested.y - camera.y,
    },
  };
}

/** Wraps a raw Mermaid definition in a portable Markdown fence. */
export function formatDiagramMarkdown(source: string): string {
  return `\`\`\`mermaid\n${source.trim()}\n\`\`\``;
}

function parseSubgraphHeading(heading: string, index: number): Pick<DiagramSubgraph, "id" | "label"> {
  const trimmed = heading.trim();
  const bracketed = trimmed.match(/^([^\s[]+)\s*\[([\s\S]*)\]\s*$/);
  if (bracketed) {
    const rawLabel = bracketed[2].trim();
    const label = rawLabel.replace(/^(["'])([\s\S]*)\1$/, "$2").trim();
    return { id: bracketed[1], label: label || bracketed[1] };
  }

  const quoted = trimmed.match(/^["']([\s\S]+)["']$/);
  if (quoted) return { id: `subgraph-${index}`, label: quoted[1].trim() };

  return { id: trimmed.split(/\s+/)[0] || `subgraph-${index}`, label: trimmed || `Subgraph ${index + 1}` };
}

/** Extracts complete Mermaid `subgraph ... end` blocks, including nested blocks. */
export function extractDiagramSubgraphs(source: string): DiagramSubgraph[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const stack: Array<{ startLine: number; id: string; label: string }> = [];
  const subgraphs: DiagramSubgraph[] = [];

  lines.forEach((line, lineIndex) => {
    const start = line.match(/^\s*subgraph\s+(.+?)\s*$/i);
    if (start) {
      stack.push({ startLine: lineIndex, ...parseSubgraphHeading(start[1], lineIndex) });
      return;
    }

    if (/^\s*end\s*;?\s*$/i.test(line)) {
      const open = stack.pop();
      if (!open) return;
      subgraphs.push({
        id: open.id,
        label: open.label,
        source: lines.slice(open.startLine, lineIndex + 1).join("\n"),
        startLine: open.startLine,
      });
    }
  });

  return subgraphs.sort((left, right) => left.startLine - right.startLine);
}

/** Wraps one extracted subgraph in a standalone Mermaid Markdown fence. */
export function formatDiagramSubgraphMarkdown(diagramSource: string, subgraphSource: string): string {
  const declaration = diagramSource
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .find((line) => /^\s*(?:graph|flowchart)\s+\S+/i.test(line));
  const lines = subgraphSource.replace(/\r\n?/g, "\n").split("\n");
  const indentation = Math.min(
    ...lines.filter((line) => line.trim()).map((line) => line.match(/^\s*/)?.[0].length ?? 0),
  );
  const normalizedSubgraph = lines.map((line) => line.slice(indentation)).join("\n");
  return formatDiagramMarkdown(`${declaration?.trim() || "flowchart TD"}\n${normalizedSubgraph.trim()}`);
}

const SANS_STACK = "ui-sans-serif, system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO_STACK = "ui-monospace, 'Cascadia Code', 'SF Mono', Menlo, Consolas, monospace";

/** Token defaults per family/mode, mirroring themes.css when the DOM is absent. */
const FAMILY_TOKENS: Record<DiagramFamily, Record<DiagramMode, DiagramTokens>> = {
  atlas: {
    light: {
      canvas: "#f7f7f5",
      surface: "#ffffff",
      surfaceRaised: "#e4e6e3",
      ink: "#1a1d21",
      inkSecondary: "#575f66",
      rule: "#ddded8",
      accent: "#315cf5",
      codeSurface: "#16181d",
      codeInk: "#dfe3ea",
      fontFamily: SANS_STACK,
    },
    dark: {
      canvas: "#121417",
      surface: "#191d21",
      surfaceRaised: "#212529",
      ink: "#ededef",
      inkSecondary: "#a8afb6",
      rule: "#2b3036",
      accent: "#5b8cff",
      codeSurface: "#0d0f12",
      codeInk: "#dde3ec",
      fontFamily: SANS_STACK,
    },
  },
  blueprint: {
    light: {
      canvas: "#f2f5f7",
      surface: "#fafcfd",
      surfaceRaised: "#dde5ea",
      ink: "#14212b",
      inkSecondary: "#45606f",
      rule: "#c6d3da",
      accent: "#be3827",
      codeSurface: "#101b23",
      codeInk: "#ccdae2",
      fontFamily: SANS_STACK,
    },
    dark: {
      canvas: "#0f171e",
      surface: "#121c24",
      surfaceRaised: "#182731",
      ink: "#dbe6ec",
      inkSecondary: "#92aab8",
      rule: "#24363f",
      accent: "#ff6a55",
      codeSurface: "#0a1116",
      codeInk: "#cadbe4",
      fontFamily: SANS_STACK,
    },
  },

  terminal: {
    light: {
      canvas: "#f3f4f1",
      surface: "#fbfcfa",
      surfaceRaised: "#dfe2db",
      ink: "#161c17",
      inkSecondary: "#4a564d",
      rule: "#c9cdc3",
      accent: "#0b773d",
      codeSurface: "#0a0e0b",
      codeInk: "#cfe8d4",
      fontFamily: MONO_STACK,
    },
    dark: {
      canvas: "#0a0e0c",
      surface: "#0e130f",
      surfaceRaised: "#151d17",
      ink: "#d8e6d8",
      inkSecondary: "#93a794",
      rule: "#26382a",
      accent: "#39e87f",
      codeSurface: "#060907",
      codeInk: "#cde9d3",
      fontFamily: MONO_STACK,
    },
  },
  editorial: {
    light: {
      canvas: "#faf6ee",
      surface: "#fffdf7",
      surfaceRaised: "#eae1cf",
      ink: "#22201a",
      inkSecondary: "#665e4c",
      rule: "#ded2ba",
      accent: "#a34a33",
      codeSurface: "#211d15",
      codeInk: "#e8e0ce",
      fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif",
    },
    dark: {
      canvas: "#171512",
      surface: "#1c1915",
      surfaceRaised: "#26221b",
      ink: "#ece7db",
      inkSecondary: "#b0a78f",
      rule: "#363023",
      accent: "#dd805f",
      codeSurface: "#100e0a",
      codeInk: "#e3dbc9",
      fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif",
    },
  },
  botanical: {
    light: {
      canvas: "#f2f6ef",
      surface: "#fbfdf8",
      surfaceRaised: "#d6e2ce",
      ink: "#20392b",
      inkSecondary: "#4d6653",
      rule: "#b9ccb1",
      accent: "#276642",
      codeSurface: "#11251b",
      codeInk: "#dcebd8",
      fontFamily: "Palatino Linotype, Palatino, Georgia, serif",
    },
    dark: {
      canvas: "#101c16",
      surface: "#17271d",
      surfaceRaised: "#203827",
      ink: "#e2edda",
      inkSecondary: "#b0c6a6",
      rule: "#35543c",
      accent: "#99ce8a",
      codeSurface: "#0a140e",
      codeInk: "#dcebd8",
      fontFamily: "Palatino Linotype, Palatino, Georgia, serif",
    },
  },
  studio: {
    light: {
      canvas: "#f4f0ff",
      surface: "#fffcff",
      surfaceRaised: "#ddd0f5",
      ink: "#2b1944",
      inkSecondary: "#635074",
      rule: "#b8a5d8",
      accent: "#713ac3",
      codeSurface: "#251638",
      codeInk: "#eee0ff",
      fontFamily: "Arial Black, Segoe UI, sans-serif",
    },
    dark: {
      canvas: "#1b1428",
      surface: "#281e39",
      surfaceRaised: "#332547",
      ink: "#f2e9ff",
      inkSecondary: "#c3afd9",
      rule: "#59416e",
      accent: "#c5a0ff",
      codeSurface: "#120c1c",
      codeInk: "#eee0ff",
      fontFamily: "Arial Black, Segoe UI, sans-serif",
    },
  },
};

export function isDiagramFamily(value: string | null | undefined): value is DiagramFamily {
  return (
    value === "atlas" ||
    value === "blueprint" ||
    value === "terminal" ||
    value === "editorial" ||
    value === "botanical" ||
    value === "studio"
  );
}

/** Resolved Pele theme: the CSS variables plus the measuring options that must match them. */
export interface DiagramTheme {
  /** `--pele-*` custom properties, written onto the SVG root. */
  variables: Record<string, string>;
  /** Render options whose fonts mirror the variables so labels fit their measured boxes. */
  options: RenderOptions;
}

/**
 * Builds the complete Pele variable set for a family/mode pair. Pure so it is
 * directly unit-testable; the DOM engine resolves tokens automatically.
 */
export function buildDiagramTheme(family: DiagramFamily, mode: DiagramMode, tokens?: DiagramTokens): DiagramTheme {
  const t = tokens ?? FAMILY_TOKENS[family][mode];

  const variables: Record<string, string> = {
    "--pele-bg": t.canvas,
    "--pele-fg": t.ink,
    "--pele-muted": t.inkSecondary,
    // Edges and arrowheads carry the family accent.
    "--pele-line": t.accent,
    "--pele-surface": t.surface,
    "--pele-surface-alt": t.surfaceRaised,
    "--pele-border": family === "terminal" ? t.accent : t.rule,
    "--pele-accent": t.accent,
    "--pele-font": t.fontFamily,
    "--pele-font-mono": MONO_STACK,
    // Categorical series (pie slices, git branches): lead with the family
    // accent and secondary ink, then fall back to Pele's built-in palette.
    "--pele-series-1": t.accent,
    "--pele-series-2": t.inkSecondary,
  };

  return {
    variables,
    options: {
      fontFamily: t.fontFamily,
      fontFamilyMono: MONO_STACK,
      fontSize: 15,
      // The viewer sizes the canvas itself (zoom/pan/fit), so the SVG keeps a
      // fixed intrinsic size and never reflows to the container width.
      responsive: false,
      autoDirection: false,
      linkRel: "noopener noreferrer",
    },
  };
}

/**
 * Writes CSS variables onto the root `<svg>` element's inline style. Declaring
 * them on the root itself lets Pele's internal `var(--pele-*, fallback)`
 * indirections resolve without any surrounding stylesheet.
 */
export function applyDiagramTheme(svg: string, variables: Record<string, string>): string {
  const declarations = Object.entries(variables)
    .map(([name, value]) => `${name}:${value.replace(/;/g, "").replace(/"/g, "&quot;")}`)
    .join(";");

  return svg.replace(/<svg\b([^>]*)>/, (_match, attributes: string) => {
    if (/\sstyle="/.test(attributes)) {
      return `<svg${attributes.replace(/\sstyle="/, ` style="${declarations};`)}>`;
    }
    return `<svg${attributes} style="${declarations}">`;
  });
}

/** Formats a renderer failure as a readable message, keeping Pele's position info when present. */
export function describeDiagramError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const { line, snippet } = error as Error & { line?: number; snippet?: string };
  const location = typeof line === "number" && line > 0 ? `Line ${line}: ` : "";
  const context = typeof snippet === "string" && snippet.trim() ? `\n\n${snippet}` : "";
  return `${location}${error.message}${context}`;
}

/**
 * Unicode-safe base64 so any diagram source survives an HTML attribute
 * (ASCII letters/digits/+///= only — no quoting or escaping hazards).
 */
export function encodeDiagramSource(source: string): string {
  const bytes = new TextEncoder().encode(source);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function decodeDiagramSource(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const DIAGRAM_FAMILIES: DiagramFamily[] = ["atlas", "blueprint", "terminal", "editorial", "botanical", "studio"];

/**
 * Resolves the active family, color mode, and live CSS tokens from the
 * document element. Computed values win over static family defaults so config
 * accent overrides and theme deltas propagate into diagrams automatically.
 */
export function resolveDiagramContext(): { family: DiagramFamily; mode: DiagramMode; tokens: DiagramTokens } {
  const fallbackFamily: DiagramFamily = "atlas";
  if (typeof document === "undefined")
    return { family: fallbackFamily, mode: "light", tokens: FAMILY_TOKENS[fallbackFamily].light };

  const root = document.documentElement;
  const familyAttr = root.getAttribute("data-dmd-theme") as DiagramFamily | null;
  const family: DiagramFamily = familyAttr && DIAGRAM_FAMILIES.includes(familyAttr) ? familyAttr : fallbackFamily;
  const mode: DiagramMode = root.getAttribute("data-theme") === "dark" ? "dark" : "light";

  const fallback = FAMILY_TOKENS[family][mode];
  let tokens = fallback;
  if (typeof getComputedStyle === "function") {
    const styles = getComputedStyle(root);
    const read = (name: string): string => styles.getPropertyValue(name).trim();
    tokens = {
      ...fallback,
      ...(read("--dmd-bg-primary") ? { canvas: read("--dmd-bg-primary") } : {}),
      ...(read("--dmd-bg-card") ? { surface: read("--dmd-bg-card") } : {}),
      ...(read("--dmd-bg-tertiary") ? { surfaceRaised: read("--dmd-bg-tertiary") } : {}),
      ...(read("--dmd-text-primary") ? { ink: read("--dmd-text-primary") } : {}),
      ...(read("--dmd-text-secondary") ? { inkSecondary: read("--dmd-text-secondary") } : {}),
      ...(read("--dmd-border-color") ? { rule: read("--dmd-border-color") } : {}),
      ...(read("--dmd-font-display") ? { fontFamily: read("--dmd-font-display") } : {}),
      ...(read("--dmd-accent") ? { accent: read("--dmd-accent") } : {}),
      ...(read("--dmd-code-bg") ? { codeSurface: read("--dmd-code-bg") } : {}),
      ...(read("--dmd-code-text") ? { codeInk: read("--dmd-code-text") } : {}),
    };
  }

  return { family, mode, tokens };
}

/**
 * Validates and renders one diagram source to an SVG string using the locally
 * bundled Pele renderer. Throws readable syntax errors (with line and snippet
 * when Pele reports them) so the viewer panel can show them.
 */
export async function renderDiagramSvg(
  source: string,
  family: DiagramFamily,
  mode: DiagramMode,
  tokens?: DiagramTokens,
): Promise<string> {
  // The engine is resolved through the loader so the served build can
  // externalize it (see mermaid-loader.ts); bundled builds fall back to a
  // dynamic import.
  const engine = await loadMermaidEngine();

  // Pele holds no global configuration, so concurrent viewers need no
  // serialization: each render carries its own theme.
  const theme = buildDiagramTheme(family, mode, tokens);
  try {
    const { svg } = engine.render(source, theme.options);
    return applyDiagramTheme(svg, theme.variables);
  } catch (error) {
    throw new Error(describeDiagramError(error));
  }
}
