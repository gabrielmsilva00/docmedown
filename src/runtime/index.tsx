import React from "react";
import ReactDOM from "react-dom/client";
import { DocMeDownApp } from "./app";
import * as Builtins from "./components/Builtins";
import { ComponentRegistry } from "./components/DmdRegistry";
import { loadDocConfig, normalizeConfig } from "./config";
import type { DocMeDownInitOptions, DocMeDownInstance } from "./types";

export { DocMeDownApp } from "./app";
export * from "./components/Builtins";
export { loadDocConfig } from "./config";
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
} from "./config-schema";
export {
  createOfflineDownload,
  downloadOfflineCopy,
  isOfflineDocumentation,
  sanitizeDownloadName,
} from "./offline-export";
export * from "./types";

const mountedRoots = new WeakMap<HTMLElement, ReturnType<typeof ReactDOM.createRoot>>();

export async function initDocMeDown(options: DocMeDownInitOptions = {}): Promise<DocMeDownInstance | null> {
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

  await ComponentRegistry.getInstance().loadDmdDirectory(options.basePath || "");

  mountedRoots.get(container)?.unmount();
  const root = ReactDOM.createRoot(container);
  mountedRoots.set(container, root);
  root.render(<DocMeDownApp config={finalConfig} basePath={options.basePath || ""} />);

  const instance: DocMeDownInstance = {
    element: container,
    destroy: () => {
      const mountedRoot = mountedRoots.get(container!);
      if (!mountedRoot) return;
      mountedRoot.unmount();
      mountedRoots.delete(container!);
      container?.dispatchEvent(new CustomEvent("docmedown:destroyed"));
    },
  };

  container.dispatchEvent(new CustomEvent("docmedown:ready", { detail: instance }));
  return instance;
}

// Auto-initialize when loaded via standalone <script src="docmedown.js">
if (typeof window !== "undefined") {
  (window as any).React = React;
  (window as any).DocMeDown = {
    init: initDocMeDown,
    registerComponent: (name: string, comp: React.ComponentType<any>) =>
      ComponentRegistry.getInstance().register(name, comp),
    registerComponents: (map: Record<string, React.ComponentType<any>>) =>
      ComponentRegistry.getInstance().registerMultiple(map),
    components: Builtins,
  };

  const autoInitialize =
    !(window as any).__DOCMEDOWN_NO_AUTO_INIT__ && !document.querySelector('script[data-docmedown-auto-init="false"]');

  if (autoInitialize) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => void initDocMeDown(), { once: true });
    } else {
      void initDocMeDown();
    }
  }
}
