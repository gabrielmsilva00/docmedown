import { normalizedDocConfigSchema, parseDocConfig } from "./config-schema";
import type { DocConfig, PartialDocConfig } from "./types";

export const DEFAULT_CONFIG: DocConfig = {
  name: "DocMeDown",
  tagline: "The simplest Markdown documenter yet",
  description: "Instant documentation site powered by DocMeDown",
  version: "1.0.0",
  rootDoc: "README.md",
  theme: {
    preset: "indigo",
    defaultMode: "auto",
    codeTheme: "github",
  },
  autoIndex: {
    enabled: true,
    sort: "natural",
    defaultCollapsed: false,
    exclude: ["node_modules", ".git", ".dmd", "dist", "bin", "package.json", "tsconfig.json"],
  },
  search: {
    enabled: true,
    placeholder: "Search documentation...",
    maxResults: 10,
  },
  footer: {
    copyright: `© ${new Date().getFullYear()} DocMeDown. All rights reserved.`,
    showBuiltWith: true,
  },
};

/**
 * Validates user-provided configuration, then deep-merges supported nested settings
 * with runtime defaults. Keep validation before merging so misspelled or unsupported
 * fields never become part of the effective runtime configuration.
 */
export function normalizeConfig(userConfig: unknown = {}): DocConfig {
  const parsedConfig = parseDocConfig(userConfig);
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...parsedConfig,
    theme: {
      ...DEFAULT_CONFIG.theme,
      ...parsedConfig.theme,
      logo: {
        ...DEFAULT_CONFIG.theme?.logo,
        ...parsedConfig.theme?.logo,
      },
    },
    autoIndex: {
      ...DEFAULT_CONFIG.autoIndex,
      ...parsedConfig.autoIndex,
    },
    search: {
      ...DEFAULT_CONFIG.search,
      ...parsedConfig.search,
    },
    footer: {
      ...DEFAULT_CONFIG.footer,
      ...parsedConfig.footer,
    },
  };

  return normalizedDocConfigSchema.parse(mergedConfig);
}

/** Parses JSON configuration and prefixes syntax or schema errors with its source. */
export function parseDocConfigJson(json: string, source: string): PartialDocConfig {
  try {
    return parseDocConfig(JSON.parse(json));
  } catch (error) {
    throw new Error(`${source}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Attempts to load config from:
 * 1. window.__DOCMEDOWN_CONFIG__
 * 2. <script id="dmd-config" type="application/json">
 * 3. Fetching docs.json / dmd.json relative to the base
 * 4. Falling back to intelligent defaults
 *
 * Each source is independently validated. An invalid higher-precedence source is
 * reported and skipped, allowing a lower-precedence valid source to take over.
 */
export async function loadDocConfig(basePath: string = ""): Promise<DocConfig> {
  // 1. Check window global
  if (typeof window !== "undefined" && (window as any).__DOCMEDOWN_CONFIG__) {
    try {
      return normalizeConfig((window as any).__DOCMEDOWN_CONFIG__);
    } catch (error) {
      console.warn("[DocMeDown] Invalid window.__DOCMEDOWN_CONFIG__:", error);
    }
  }

  // 2. Check inline <script id="dmd-config">
  if (typeof document !== "undefined") {
    const inlineScript = document.getElementById("dmd-config");
    if (inlineScript?.textContent) {
      try {
        return normalizeConfig(parseDocConfigJson(inlineScript.textContent.trim(), "Inline #dmd-config"));
      } catch (err) {
        console.warn("[DocMeDown] Failed to parse inline #dmd-config JSON:", err);
      }
    }
  }

  // 3. Try to fetch docs.json or dmd.json
  const configFiles = ["docs.json", "dmd.json", "_manifest.json"];
  for (const filename of configFiles) {
    try {
      const url = basePath ? `${basePath.replace(/\/$/, "")}/${filename}` : filename;
      const res = await fetch(url);
      if (res.ok) {
        const data: unknown = await res.json();
        if (filename === "_manifest.json" && typeof data === "object" && data !== null && "config" in data) {
          return normalizeConfig((data as { config: unknown }).config);
        }
        return normalizeConfig(data);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("Invalid DocMeDown configuration")) {
        console.warn(`[DocMeDown] Ignoring invalid ${filename}:\n${error.message}`);
      }
      // Continue to next candidate
    }
  }

  // 4. Return default config
  return normalizeConfig();
}
