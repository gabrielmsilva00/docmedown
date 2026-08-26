import type React from "react";
import * as Builtins from "./Builtins";

export type ComponentMap = Record<string, React.ComponentType<any>>;

export class ComponentRegistry {
  private static instance: ComponentRegistry;
  private components: ComponentMap = {
    Tabs: Builtins.Tabs,
    Tab: Builtins.Tab,
    Card: Builtins.Card,
    CardGrid: Builtins.CardGrid,
    Badge: Builtins.Badge,
    Steps: Builtins.Steps,
    Step: Builtins.Step,
  };

  private constructor() {
    this.checkGlobalComponents();
  }

  public static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  private checkGlobalComponents() {
    if (typeof window !== "undefined") {
      // Check window.__DMD_COMPONENTS__
      const globals = (window as any).__DMD_COMPONENTS__;
      if (globals && typeof globals === "object") {
        this.registerMultiple(globals);
      }
    }
  }

  public register(name: string, component: React.ComponentType<any>) {
    this.components[name] = component;
  }

  public registerMultiple(map: ComponentMap) {
    this.components = {
      ...this.components,
      ...map,
    };
  }

  public get(name: string): React.ComponentType<any> | undefined {
    return this.components[name];
  }

  public getAll(): ComponentMap {
    return { ...this.components };
  }

  /**
   * Dynamically loads custom components from .dmd/components.js if available
   */
  public async loadDmdDirectory(basePath: string = "") {
    if (typeof window === "undefined") return;

    const runtimeWindow = window as any;
    if (!runtimeWindow.__DOCMEDOWN_COMPONENTS_READY__ && runtimeWindow.__DOCMEDOWN_DATA__?.componentsSource) {
      const componentModule = new Blob([runtimeWindow.__DOCMEDOWN_DATA__.componentsSource], {
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
          this.registerMultiple(components);
          return;
        }
      } catch (error) {
        console.warn("[DocMeDown] Failed to load embedded custom components:", error);
      }
    }

    const urls = [
      basePath ? `${basePath.replace(/\/$/, "")}/.dmd/components.js` : ".dmd/components.js",
      basePath ? `${basePath.replace(/\/$/, "")}/.dmd/index.js` : ".dmd/index.js",
    ];

    for (const url of urls) {
      try {
        const mod = await import(/* @vite-ignore */ url);
        if (mod) {
          const comps = mod.default || mod;
          if (typeof comps === "object") {
            this.registerMultiple(comps);
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
