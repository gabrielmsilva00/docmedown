/**
 * Component registry v2 (Svelte runtime).
 *
 * Markdown components are **custom elements**: the markdown pipeline emits
 * PascalCase tags (`<Tabs>`, `<CardGrid>`, user `.dmd` components) and the
 * markdown body renames them to registered kebab-case element names
 * (`<dmd-tabs>`, `<dmd-card-grid>`, …). The browser upgrades them natively,
 * so nested component trees work without any framework mounting logic.
 */

import { dmdTag } from "../runtime/svelte-tag";

export type DmdElementClass = new () => HTMLElement;
export { dmdTag };

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
   * Loads user components from the `.dmd` directory (or the embedded
   * `componentsSource` blob produced by the build). Components may be
   * AOT-compiled `.svelte` custom elements, runtime-compiled `.svelte` files,
   * or legacy custom element classes.
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
        .then((module) => module.default || module)
        .finally(() => URL.revokeObjectURL(componentModuleUrl));
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

    const prefix = basePath ? `${basePath.replace(/\/$/, "")}/.dmd` : ".dmd";

    // In dynamic/serve mode, load raw .svelte components listed in the manifest
    const manifestComps: string[] = runtimeWindow.__DOCMEDOWN_DATA__?.manifest?.customComponents || [];
    if (manifestComps.length > 0) {
      const { loadAndRegisterSvelteComponent } = await import("../runtime/svelte-runtime");
      for (const compName of manifestComps) {
        try {
          const tag = await loadAndRegisterSvelteComponent(`${prefix}/${compName}.svelte`, compName);
          this.register(compName, tag);
        } catch (err) {
          console.warn(`[DocMeDown] Could not dynamically compile ${compName}.svelte:`, err);
        }
      }
    }

    // Legacy fallback for .dmd/components.js or .dmd/index.js
    for (const url of [`${prefix}/components.js`, `${prefix}/index.js`]) {
      try {
        const mod = await import(/* @vite-ignore */ url);
        if (mod) {
          const comps = mod.default || mod;
          if (typeof comps === "object") {
            this.registerMultiple(comps as Record<string, DmdElementClass | string>);
            console.log("[DocMeDown] Loaded custom .dmd components:", Object.keys(comps));
            return;
          }
        }
      } catch {
        // .dmd components not present, continue
      }
    }
  }
}

/** Convenience helper for `.dmd` component modules: `defineDmd("CounterWidget", CounterWidgetElement)`. */
export function defineDmd(name: string, element: DmdElementClass | string, tag?: string): string {
  return ComponentRegistry.getInstance().register(name, element, tag);
}
