import mermaid from "mermaid";

function cssVariable(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;

  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/**
 * Mermaid HTML labels render through SVG foreignObject elements. They do not
 * inherit DocMeDown's reset and token styles consistently, especially in a
 * standalone file. SVG text labels keep layout deterministic in serveable and
 * file:/// output while the token mapping preserves the active DocMeDown theme.
 */
export function createMermaidConfig() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const fontFamily = cssVariable("--dmd-font-sans", "system-ui, sans-serif");
  const primaryColor = cssVariable("--dmd-bg-card", isDark ? "#15242e" : "#fffefa");
  const secondaryColor = cssVariable("--dmd-bg-secondary", isDark ? "#162631" : "#eef1ed");
  const borderColor = cssVariable("--dmd-border-color", isDark ? "#314650" : "#d2dcd6");
  const textColor = cssVariable("--dmd-text-primary", isDark ? "#f3f5ef" : "#132033");
  const accentColor = cssVariable("--dmd-accent", "#6366f1");

  return {
    startOnLoad: false,
    securityLevel: "strict" as const,
    htmlLabels: false,
    fontFamily,
    theme: isDark ? ("dark" as const) : ("default" as const),
    themeVariables: {
      primaryColor,
      primaryTextColor: textColor,
      primaryBorderColor: borderColor,
      secondaryColor,
      secondaryTextColor: textColor,
      secondaryBorderColor: borderColor,
      tertiaryColor: secondaryColor,
      tertiaryTextColor: textColor,
      tertiaryBorderColor: borderColor,
      lineColor: accentColor,
      textColor,
      mainBkg: primaryColor,
      clusterBkg: secondaryColor,
      clusterBorder: borderColor,
      fontFamily,
    },
  };
}

export async function renderMermaidDiagrams() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const elements = document.querySelectorAll(".dmd-mermaid-container pre.mermaid");
  if (elements.length === 0) return;

  try {
    // Mermaid is bundled with the runtime so online and file:/// output render
    // diagrams identically without a CDN request.
    mermaid.initialize(createMermaidConfig());
    await mermaid.run({
      nodes: Array.from(elements) as HTMLElement[],
    });
  } catch (err) {
    console.warn("[DocMeDown] Mermaid diagram rendering notice:", err);
  }
}
