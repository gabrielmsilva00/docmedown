import { DocConfig } from './types';

export const DEFAULT_CONFIG: DocConfig = {
  name: 'DocMeDown',
  tagline: 'The simplest Markdown documenter yet',
  description: 'Instant documentation site powered by DocMeDown',
  version: '1.0.0',
  rootDoc: 'README.md',
  theme: {
    preset: 'indigo',
    defaultMode: 'auto',
    codeTheme: 'github',
  },
  autoIndex: {
    enabled: true,
    sort: 'natural',
    defaultCollapsed: false,
    exclude: ['node_modules', '.git', '.dmd', 'dist', 'bin', 'package.json', 'tsconfig.json'],
  },
  search: {
    enabled: true,
    placeholder: 'Search documentation...',
    maxResults: 10,
  },
  footer: {
    copyright: `© ${new Date().getFullYear()} DocMeDown. All rights reserved.`,
    showBuiltWith: true,
  },
};

/**
 * Normalizes and merges user config with defaults
 */
export function normalizeConfig(userConfig: Partial<DocConfig> = {}): DocConfig {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    theme: {
      ...DEFAULT_CONFIG.theme,
      ...userConfig.theme,
      logo: {
        ...DEFAULT_CONFIG.theme?.logo,
        ...userConfig.theme?.logo,
      },
    },
    autoIndex: {
      ...DEFAULT_CONFIG.autoIndex,
      ...userConfig.autoIndex,
    },
    search: {
      ...DEFAULT_CONFIG.search,
      ...userConfig.search,
    },
    footer: {
      ...DEFAULT_CONFIG.footer,
      ...userConfig.footer,
    },
  };
}

/**
 * Attempts to load config from:
 * 1. window.__DOCMEDOWN_CONFIG__
 * 2. <script id="dmd-config" type="application/json">
 * 3. Fetching docs.json / dmd.json relative to the base
 * 4. Falling back to intelligent defaults
 */
export async function loadDocConfig(basePath: string = ''): Promise<DocConfig> {
  // 1. Check window global
  if (typeof window !== 'undefined' && (window as any).__DOCMEDOWN_CONFIG__) {
    return normalizeConfig((window as any).__DOCMEDOWN_CONFIG__);
  }

  // 2. Check inline <script id="dmd-config">
  if (typeof document !== 'undefined') {
    const inlineScript = document.getElementById('dmd-config');
    if (inlineScript && inlineScript.textContent) {
      try {
        const parsed = JSON.parse(inlineScript.textContent.trim());
        return normalizeConfig(parsed);
      } catch (err) {
        console.warn('[DocMeDown] Failed to parse inline #dmd-config JSON:', err);
      }
    }
  }

  // 3. Try to fetch docs.json or dmd.json
  const configFiles = ['docs.json', 'dmd.json', '_manifest.json'];
  for (const filename of configFiles) {
    try {
      const url = basePath ? `${basePath.replace(/\/$/, '')}/${filename}` : filename;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (filename === '_manifest.json' && data.config) {
          return normalizeConfig(data.config);
        }
        return normalizeConfig(data);
      }
    } catch {
      // Continue to next candidate
    }
  }

  // 4. Return default config
  return normalizeConfig();
}
