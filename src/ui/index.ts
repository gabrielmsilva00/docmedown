import * as Svelte from "svelte";
import { mount, unmount } from "svelte";
import * as SvelteInternalClient from "svelte/internal/client";
import App from "./App.svelte";
import "./components/MermaidDiagram.svelte";
import { loadDocConfig, normalizeConfig } from "../runtime/config";
import { registerLanguage } from "../runtime/markdown/highlighter";
import { configureMermaidEngine } from "../runtime/markdown/mermaid-loader";
import { getStaticRuntimeContext } from "../runtime/router";
import { configureCompilerEngine } from "../runtime/svelte-compiler-loader";
import type { DocMeDownInitOptions, DocMeDownInstance } from "../runtime/types";
import { doc } from "./doc-context.svelte";
import { ComponentRegistry, defineDmd, dmdTag } from "./registry";
import { theme } from "./theme.svelte";

if (typeof window !== "undefined") {
  (window as any).__DOCMEDOWN_SVELTE__ = {
    ...Svelte,
    client: SvelteInternalClient,
    internal: {
      client: SvelteInternalClient,
    },
  };
}
if (typeof globalThis !== "undefined" && !(globalThis as any).__DOCMEDOWN_SVELTE__) {
  (globalThis as any).__DOCMEDOWN_SVELTE__ = {
    ...Svelte,
    client: SvelteInternalClient,
    internal: {
      client: SvelteInternalClient,
    },
  };
}

// Svelte builtin custom elements: self-register on import (<svelte:options customElement>).
import "./builtins/Accordion.svelte";
import "./builtins/AccordionItem.svelte";
import "./builtins/Alert.svelte";
import "./builtins/Callout.svelte";
import "./builtins/Badge.svelte";
import "./builtins/Button.svelte";
import "./builtins/Card.svelte";
import "./builtins/CardGrid.svelte";
import "./builtins/Columns.svelte";
import "./builtins/Column.svelte";
import "./builtins/Details.svelte";
import "./builtins/Item.svelte";
import "./builtins/Kbd.svelte";
import "./builtins/Step.svelte";
import "./builtins/Steps.svelte";
import "./builtins/Tab.svelte";
import "./builtins/Tabs.svelte";
import "./builtins/Timeline.svelte";
import "./builtins/TimelineItem.svelte";

export { loadDocConfig, normalizeConfig } from "../runtime/config";
export {
  docConfigSchema,
  docSearchConfigSchema,
  docThemeConfigSchema,
  formatConfigIssues,
  navLinkSchema,
  normalizedDocConfigSchema,
  parseDocConfig,
  remoteSourceSchema,
  sidebarItemSchema,
  socialLinkSchema,
} from "../runtime/config-schema";
export {
  createOfflineDownload,
  downloadOfflineCopy,
  isOfflineDocumentation,
  sanitizeDownloadName,
} from "../runtime/offline-export";
export {
  createRouter,
  getStaticRuntimeContext,
  isStaticRuntime,
  joinStaticBase,
  StaticRouter,
} from "../runtime/router";
export * from "../runtime/types";
export { doc } from "./doc-context.svelte";
export { ComponentRegistry, defineDmd, dmdTag } from "./registry";
export { theme } from "./theme.svelte";

// Map PascalCase markdown names onto the builtin custom element tags so the
// markdown body can rename <Tabs> → <dmd-tabs> during rendering.
const BUILTIN_NAMES = [
  "Tabs",
  "Tab",
  "Card",
  "CardGrid",
  "Badge",
  "Steps",
  "Step",
  "Alert",
  "Callout",
  "Button",
  "Kbd",
  "Details",
  "Accordion",
  "AccordionItem",
  "Columns",
  "Column",
  "Timeline",
  "TimelineItem",
  "Item",
];
for (const name of BUILTIN_NAMES) {
  ComponentRegistry.getInstance().register(name, dmdTag(name));
}

const mountedInstances = new WeakMap<HTMLElement, { destroy: () => void }>();

export async function initDocMeDown(options: DocMeDownInitOptions = {}): Promise<DocMeDownInstance | null> {
  // The served build fetches its on-demand Mermaid and Svelte compiler bundles
  // relative to the documentation base, so a nested page reaches the site-root script.
  configureMermaidEngine(options.basePath || "");
  configureCompilerEngine(options.basePath || "");

  let container: HTMLElement | null = null;

  if (typeof options.el === "string") {
    container = document.querySelector(options.el);
  } else if (options.el instanceof HTMLElement) {
    container = options.el;
  } else {
    container = document.getElementById("dmd-app");
    if (!container) {
      container = document.createElement("div");
      container.id = "dmd-app";
      document.body.appendChild(container);
    }
  }

  if (!container) {
    console.error("[DocMeDown] Could not find or create mount container element");
    return null;
  }

  const loadedConfig = await loadDocConfig(options.basePath || "");
  const finalConfig = normalizeConfig({ ...loadedConfig, ...options.config });

  theme.init({
    defaultMode: finalConfig.theme?.defaultMode,
    defaultFamily: finalConfig.theme?.family,
    defaultDensity: finalConfig.theme?.density,
    accentColor: finalConfig.theme?.accentColor,
    accentColorDark: finalConfig.theme?.accentColorDark,
  });
  void doc.init(finalConfig, options.basePath || "");

  // User components register before the first render so markdown custom
  // elements upgrade together with the builtins.
  await ComponentRegistry.getInstance().loadDmdDirectory(options.basePath || "");

  mountedInstances.get(container)?.destroy();

  // Svelte's mount() renders into the target but does NOT replace existing
  // children the way React's createRoot().render() did. The offline shell's
  // bootstrap placeholder ("Opening offline documentation…") and any
  // prerendered shell article would otherwise remain visible before the app,
  // so clear the container before mounting.
  container.innerHTML = "";
  const app = mount(App, { target: container });

  const instance: DocMeDownInstance = {
    element: container,
    destroy: () => {
      unmount(app);
      doc.destroy();
      container?.dispatchEvent(new CustomEvent("docmedown:destroyed"));
    },
  };
  mountedInstances.set(container, instance);

  container.dispatchEvent(new CustomEvent("docmedown:ready", { detail: instance }));
  return instance;
}

// Auto-initialize when loaded via a standalone <script> tag (docmedown.web.js
// on the served site, docmedown.iife.js from the CDN, or the offline runtime).
if (typeof window !== "undefined") {
  (window as any).DocMeDown = {
    init: initDocMeDown,
    /** Registers a markdown component as a custom element: defineDmd(name, ElementClass, tag?). */
    registerComponent: (name: string, element: unknown, tag?: string) => defineDmd(name, element as never, tag),
    registerComponents: (map: Record<string, unknown>) =>
      ComponentRegistry.getInstance().registerMultiple(map as Record<string, never>),
    /** Register a custom Prism grammar at runtime, e.g. from `.dmd`. */
    registerLanguage,
  };

  const autoInitialize =
    !(window as any).__DOCMEDOWN_NO_AUTO_INIT__ && !document.querySelector('script[data-docmedown-auto-init="false"]');

  if (autoInitialize) {
    // Prerendered static pages carry a relative asset prefix so nested pages
    // reach _manifest.json/_docs.js at the documentation site root.
    const staticBasePath = getStaticRuntimeContext()?.base ?? "";
    const bootstrap = () => void initDocMeDown({ basePath: staticBasePath });
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
    } else {
      bootstrap();
    }
  }
}
