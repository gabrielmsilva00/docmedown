/**
 * Component registry v2 (Svelte runtime).
 *
 * Markdown components are **custom elements**: the markdown pipeline emits
 * PascalCase tags (`<Tabs>`, `<CardGrid>`, user `.dmd` components) and the
 * markdown body renames them to registered kebab-case element names
 * (`<dmd-tabs>`, `<dmd-card-grid>`, …). The browser upgrades them natively,
 * so nested component trees work without any framework mounting logic.
 */

import {
  type ComponentKind,
  createElementBridge,
  createReactBridge,
  type DynamicComponent,
  detectComponentKind,
  registerWebComponent,
} from "../runtime/bridges";
import { dmdTag } from "../runtime/svelte-tag";

export type DmdElementClass = new () => HTMLElement;
export {
  type ComponentKind,
  createElementBridge,
  createReactBridge,
  type DynamicComponent,
  detectComponentKind,
  dmdTag,
  registerWebComponent,
};

export class ComponentRegistry {
  private static instance: ComponentRegistry;

  /** Component name (any case) → custom element tag. */
  private tags = new Map<string, string>();

  public static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  private constructor() {
    if (typeof window !== "undefined") {
      const globals = (window as any).__SMD_COMPONENTS__ ?? (window as any).__DMD_COMPONENTS__;
      if (globals && typeof globals === "object") {
        this.registerMultiple(globals);
      }
    }
  }

  /**
   * Registers a markdown component. `element` may be a custom element class
   * (defined automatically under the derived tag), or omitted when the class
   * was already defined (e.g. Svelte `<svelte:options customElement>`).
   * Returns the element tag used in the DOM.
   */
  public register(name: string, element?: DmdElementClass | string, tag?: string): string {
    if (typeof element === "string" && !tag) {
      tag = element;
      element = undefined;
    }
    const tagName = tag || dmdTag(name);
    if (element && typeof window !== "undefined" && typeof customElements !== "undefined") {
      if (!customElements.get(tagName)) {
        customElements.define(tagName, element as CustomElementConstructor);
      }
    }
    this.tags.set(name, tagName);
    this.tags.set(name.toLowerCase(), tagName);
    this.tags.set(tagName, tagName);
    return tagName;
  }

  /**
   * Registers a React component function/class, wrapping it via ReactBridge.
   */
  public registerReact(name: string, component: any, tag?: string): string {
    const tagName = tag || dmdTag(name);
    const ElementClass = createReactBridge(component);
    return this.register(name, ElementClass, tagName);
  }

  /**
   * Registers a Web Component or Lit class, wrapping it via ElementBridge.
   */
  public registerWebComponent(name: string, elementClass: CustomElementConstructor, tag?: string): string {
    const tagName = tag || dmdTag(name);
    const ElementClass = createElementBridge(elementClass);
    return this.register(name, ElementClass, tagName);
  }

  public registerMultiple(map: Record<string, DmdElementClass | string>): void {
    for (const [name, value] of Object.entries(map)) {
      this.register(name, value);
    }
  }

  /** Resolves a PascalCase markdown tag (any case) to its custom element tag. */
  public resolveTag(tagName: string): string | null {
    const key = tagName.toLowerCase();
    return this.tags.get(tagName) ?? this.tags.get(key) ?? null;
  }

  public getAll(): Record<string, string> {
    return Object.fromEntries(this.tags);
  }

  /**
   * Loads user components from `.dmd/.components` (or the embedded
   * `componentsSource` blob produced by the build). Components may be
   * AOT-compiled `.svelte` custom elements, runtime-compiled `.svelte` files,
   * or legacy custom element classes. The deprecated bare `.dmd/` dir is
   * tried as a fallback.
   */
  public async loadDmdDirectory(basePath: string = ""): Promise<void> {
    if (typeof window === "undefined") return;

    const runtimeWindow = window as any;
    if (!runtimeWindow.__DOCMEDOWN_COMPONENTS_READY__ && runtimeWindow.__DOCMEDOWN_DATA__?.componentsSource) {
      const { linkSveltePrimitives } = await import("../runtime/svelte-runtime");
      const rawSource = runtimeWindow.__DOCMEDOWN_DATA__.componentsSource;
      const linkedSource = linkSveltePrimitives(rawSource);
      const componentModule = new Blob([linkedSource], {
        type: "text/javascript",
      });
      const componentModuleUrl = URL.createObjectURL(componentModule);
      runtimeWindow.__DOCMEDOWN_COMPONENTS_READY__ = import(/* @vite-ignore */ componentModuleUrl)
        .then((module) => {
          setTimeout(() => URL.revokeObjectURL(componentModuleUrl), 5000);
          return module.default || module;
        })
        .catch((err) => {
          setTimeout(() => URL.revokeObjectURL(componentModuleUrl), 5000);
          console.error("[DocMeDown] Error evaluating custom components module:", err);
          throw err;
        });
    }

    const embeddedComponents = runtimeWindow.__DOCMEDOWN_COMPONENTS_READY__;
    if (embeddedComponents && typeof embeddedComponents.then === "function") {
      try {
        const components = await embeddedComponents;
        if (components && typeof components === "object") {
          this.registerMultiple(components as Record<string, DmdElementClass | string>);
          return;
        }
      } catch (error) {
        console.warn("[DocMeDown] Failed to load embedded custom components:", error);
      }
    }

    const cleanBase = basePath ? basePath.replace(/\/$/, "") : "";
    const prefixes = cleanBase ? [`${cleanBase}/.dmd/.components`, `${cleanBase}/.dmd`] : [".dmd/.components", ".dmd"];

    async function fetchFirst(paths: string[]): Promise<{ res: Response; url: string } | null> {
      for (const url of paths) {
        try {
          const res = await fetch(url);
          if (res.ok) return { res, url };
        } catch {
          // try next prefix
        }
      }
      return null;
    }

    const withPrefixes = (suffix: string): string[] => prefixes.map((p) => `${p}${suffix}`);

    // In dynamic/serve mode, load raw components (.svelte, .tsx, .jsx, .ts) listed in the manifest
    const manifestComps: string[] = runtimeWindow.__DOCMEDOWN_DATA__?.manifest?.customComponents || [];
    if (manifestComps.length > 0) {
      const { loadAndRegisterSvelteComponent } = await import("../runtime/svelte-runtime");
      for (const compName of manifestComps) {
        let loaded = false;

        // 1. Try Svelte (.svelte)
        try {
          const hit = await fetchFirst(withPrefixes(`/${compName}.svelte`));
          if (hit) {
            const tag = await loadAndRegisterSvelteComponent(hit.url, compName);
            this.register(compName, tag);
            loaded = true;
          }
        } catch {
          // not found or compilation error, try next format
        }

        // 2. Try React TSX / JSX (.tsx, .jsx)
        if (!loaded) {
          for (const ext of [".tsx", ".jsx"]) {
            try {
              const hit = await fetchFirst(withPrefixes(`/${compName}${ext}`));
              if (hit) {
                const source = await hit.res.text();
                const { compileTsx } = await import("../runtime/ts-compiler");
                const compiledJs = await compileTsx(source, { filename: `${compName}${ext}` });
                const blob = new Blob([compiledJs], { type: "text/javascript" });
                const blobUrl = URL.createObjectURL(blob);
                try {
                  const mod = await import(/* @vite-ignore */ blobUrl);
                  const ReactComp = mod.default || mod[compName] || mod;
                  this.registerReact(compName, ReactComp);
                  loaded = true;
                  break;
                } finally {
                  URL.revokeObjectURL(blobUrl);
                }
              }
            } catch (err) {
              console.warn(`[DocMeDown] Could not dynamically load React component ${compName}${ext}:`, err);
            }
          }
        }

        // 3. Try Web Component / Lit (.ts, .js)
        if (!loaded) {
          for (const ext of [".ts", ".js"]) {
            for (const candUrl of withPrefixes(`/${compName}${ext}`)) {
              try {
                const mod = await import(/* @vite-ignore */ candUrl);
                if (mod) {
                  const ElementClass = mod.default || mod[compName] || mod;
                  if (typeof ElementClass === "function") {
                    this.registerWebComponent(compName, ElementClass);
                    loaded = true;
                    break;
                  }
                }
              } catch {
                // not present, continue
              }
            }
            if (loaded) break;
          }
        }
      }
    }

    // Fallback for setup/languages/components/index across both prefixes.
    for (const base of prefixes) {
      for (const file of ["setup.js", "languages.js", "components.js", "index.js"]) {
        const url = `${base}/${file}`;
        try {
          const mod = await import(/* @vite-ignore */ url);
          if (mod) {
            const comps = mod.default || mod;
            if (comps && typeof comps === "object" && Object.keys(comps).length > 0) {
              this.registerMultiple(comps as Record<string, DmdElementClass | string>);
              console.log("[DocMeDown] Loaded custom .dmd components:", Object.keys(comps));
              return;
            }
          }
        } catch {
          // file not present, continue
        }
      }
    }
  }
}

/** Convenience helper for `.dmd` Svelte component modules: `defineDmd("CounterWidget", CounterWidgetElement)`. */
export function defineDmd(name: string, element: DmdElementClass | string, tag?: string): string {
  return ComponentRegistry.getInstance().register(name, element, tag);
}

/** Convenience helper for `.dmd` React component modules: `defineReactDmd("ReactMetric", ReactMetricComponent)`. */
export function defineReactDmd(name: string, component: any, tag?: string): string {
  return ComponentRegistry.getInstance().registerReact(name, component, tag);
}

/** Convenience helper for `.dmd` Web Component / Lit modules: `defineWebComponentDmd("UserBadge", UserBadgeElement)`. */
export function defineWebComponentDmd(name: string, elementClass: CustomElementConstructor, tag?: string): string {
  return ComponentRegistry.getInstance().registerWebComponent(name, elementClass, tag);
}
