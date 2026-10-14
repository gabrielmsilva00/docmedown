/**
 * React Custom Element Bridge for DocMeDown.
 *
 * Wraps arbitrary React components (including hooks, context, state, and third-party
 * React libraries) inside a native Custom Element. This allows React components
 * to be mounted directly in Svelte 5 / Markdown without losing React lifecycle semantics.
 */

export interface ReactBridgeOptions {
  /** Explicit React module/object (providing createElement) */
  React?: any;
  /** Explicit ReactDOM / client module/object (providing createRoot) */
  ReactDOM?: any;
  createRoot?: (container: Element | DocumentFragment) => {
    render: (children: any) => void;
    unmount: () => void;
  };
  createElement?: (type: any, props?: any, ...children: any[]) => any;
  /** Use open Shadow DOM instead of light DOM (default: false to inherit theme tokens) */
  shadowRoot?: boolean;
  /** Default props to inject into the component */
  defaultProps?: Record<string, unknown>;
}

export type DmdElementClass = new () => HTMLElement;

/**
 * Normalizes an attribute string value to its corresponding JavaScript primitive or JSON object.
 */
export function normalizeAttributeValue(value: string | null): unknown {
  if (value === null) return undefined;
  if (value === "" || value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  if (value.toLowerCase() === "null") return null;
  if (value.toLowerCase() === "undefined") return undefined;

  // Number conversion
  if (/^-?\d+(\.\d+)?$/.test(value.trim())) {
    const num = Number(value.trim());
    if (!Number.isNaN(num)) return num;
  }

  // JSON array/object parsing
  const trimmed = value.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fall through to raw string
    }
  }

  return value;
}

/**
 * Converts a kebab-case attribute name (e.g. `user-name`, `api-key`) to camelCase (`userName`, `apiKey`).
 */
export function kebabToCamelCase(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Resolves React and ReactDOM runtime dependencies asynchronously or synchronously.
 */
async function resolveReact(options?: ReactBridgeOptions): Promise<{
  React: any;
  ReactDOM: any;
  createRoot: (container: Element | DocumentFragment) => any;
  createElement: (type: any, props?: any, ...children: any[]) => any;
}> {
  const globalObj = typeof window !== "undefined" ? window : (globalThis as any);
  const runtimeReact = globalObj.__DOCMEDOWN_REACT__;

  let React = options?.React || runtimeReact?.React || globalObj.React;
  let ReactDOM = options?.ReactDOM || runtimeReact?.ReactDOM || globalObj.ReactDOM;

  if (!React) {
    try {
      React = await import(/* @vite-ignore */ "react");
    } catch {
      // React might be under default export
      React = (await import(/* @vite-ignore */ "react")).default;
    }
  }

  if (!ReactDOM) {
    try {
      ReactDOM = await import(/* @vite-ignore */ "react-dom/client");
    } catch {
      try {
        ReactDOM = await import(/* @vite-ignore */ "react-dom");
      } catch {
        // Fall back to global if present
      }
    }
  }

  const createRoot =
    options?.createRoot ||
    ReactDOM?.createRoot ||
    runtimeReact?.createRoot ||
    (ReactDOM?.default ? ReactDOM.default.createRoot : undefined);

  const createElement =
    options?.createElement ||
    React?.createElement ||
    runtimeReact?.createElement ||
    (React?.default ? React.default.createElement : undefined);

  if (!createRoot || !createElement) {
    throw new Error(
      "[DocMeDown] ReactBridge: could not resolve React.createElement and ReactDOM.createRoot. Ensure React is available.",
    );
  }

  return { React, ReactDOM, createRoot, createElement };
}

/**
 * Wraps a React component function/class in a standard browser Custom Element class.
 */
export function createReactBridge(Component: any, options: ReactBridgeOptions = {}): DmdElementClass {
  return class ReactBridgeElement extends HTMLElement {
    private _root: { render: (node: any) => void; unmount: () => void } | null = null;
    private _container: HTMLElement | null = null;
    private _observer: MutationObserver | null = null;
    private _propsStore: Record<string, unknown> = {};
    private _mounted = false;

    connectedCallback() {
      if (this._mounted) return;
      this._mounted = true;

      // Prepare host container
      if (options.shadowRoot) {
        const shadow = this.attachShadow({ mode: "open" });
        this._container = document.createElement("div");
        this._container.className = "dmd-react-host";
        shadow.appendChild(this._container);
      } else {
        this._container = document.createElement("div");
        this._container.className = "dmd-react-host";
        this.appendChild(this._container);
      }

      // Initial mount
      this.mountPromise = this.mountReact();

      // Observe attribute changes for dynamic prop updates
      if (typeof MutationObserver !== "undefined") {
        this._observer = new MutationObserver(() => {
          this.updatePropsAndRender();
        });
        this._observer.observe(this, { attributes: true });
      }
    }

    public mountPromise: Promise<void> | null = null;

    disconnectedCallback() {
      this._mounted = false;
      if (this._observer) {
        this._observer.disconnect();
        this._observer = null;
      }
      if (this._root) {
        try {
          this._root.unmount();
        } catch (e) {
          console.warn("[DocMeDown] Error unmounting React component:", e);
        }
        this._root = null;
      }
    }

    /**
     * Reads all attributes and JS properties into a consolidated React props dictionary.
     */
    private collectProps(): Record<string, unknown> {
      const props: Record<string, unknown> = {
        ...(options.defaultProps || {}),
        ...this._propsStore,
      };

      for (let i = 0; i < this.attributes.length; i++) {
        const attr = this.attributes[i];
        if (attr.name.startsWith("data-dmd-")) continue;

        // Skip internal/system attributes
        if (attr.name === "class" || attr.name === "style" || attr.name === "id") continue;

        const propName = kebabToCamelCase(attr.name);
        // Only override if not already explicitly set via JS property
        if (this._propsStore[propName] === undefined) {
          props[propName] = normalizeAttributeValue(attr.value);
        }
      }

      // Provide event forwarding proxies for on* props
      // If the React component calls props.onSelect(data) or props.onSave(data),
      // we dispatch a bubbling DOM CustomEvent on this element so Svelte / Markdown can listen.
      const proxyHandler = (eventName: string, detail: unknown) => {
        const customEvent = new CustomEvent(eventName, {
          detail,
          bubbles: true,
          composed: true,
        });
        this.dispatchEvent(customEvent);
      };

      // Wrap known event props
      for (const key of Object.keys(props)) {
        if (/^on[A-Z]/.test(key) && typeof props[key] !== "function") {
          const eventName = key.slice(2).toLowerCase();
          props[key] = (detail: unknown) => proxyHandler(eventName, detail);
        }
      }

      return props;
    }

    private async mountReact() {
      const container = this._container;
      if (!container) return;

      try {
        const { createRoot, createElement } = await resolveReact(options);
        if (!this._mounted) return;

        const root = createRoot(container);
        this._root = root;
        const props = this.collectProps();
        root.render(createElement(Component, props));
      } catch (error) {
        console.error("[DocMeDown] Failed to mount React component bridge:", error);
        if (this._container) {
          this._container.innerHTML = `<div style="color:var(--dmd-danger, #ef4444);font-size:0.875rem;padding:0.5rem;border:1px solid currentColor;border-radius:4px;">Failed to render React component: ${error instanceof Error ? error.message : String(error)}</div>`;
        }
      }
    }

    private async updatePropsAndRender() {
      if (!this._root || !this._container) return;

      try {
        const { createElement } = await resolveReact(options);
        const props = this.collectProps();
        this._root.render(createElement(Component, props));
      } catch (error) {
        console.warn("[DocMeDown] Error updating React component props:", error);
      }
    }

    /**
     * Allows setting props directly via JS property on the custom element instance.
     */
    public setProp(name: string, value: unknown) {
      this._propsStore[name] = value;
      this.updatePropsAndRender();
    }

    public getProp(name: string): unknown {
      return this._propsStore[name];
    }
  };
}
