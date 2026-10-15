/**
 * Unified Component API and Dynamic Framework Adapter.
 *
 * Implements a unified abstraction over Svelte 5, React, and Web Elements (Lit):
 *
 * ┌─────────────┐ .tsx ───────────────►│ TSX compiler│──► React module
 * └─────────────┘                      └─────────────┘
 *                                             │
 *                                             ▼ ReactBridge
 * ┌─────────────┐ .ts / Lit ──────────►│ TS compiler │──► customElements.define()
 * └─────────────┘                      └─────────────┘
 *                                             │
 *                                             ▼ ElementBridge
 * ┌───────────────┐ .svelte ────────────►│Svelte compiler│──► Svelte module
 * └───────────────┘                      └───────────────┘
 *                                             │
 *                                             ▼ Unified Component API
 *                                             │
 *                                             ▼ Svelte application
 */

import { createElementBridge, registerWebComponent } from "./element-bridge";
import { createReactBridge } from "./react-bridge";

export type ComponentKind = "svelte" | "react" | "element";

export interface DynamicComponent {
  kind: ComponentKind;
  component: unknown;
  name?: string;
  props?: Record<string, unknown>;
  events?: Record<string, (...args: any[]) => void>;
}

/**
 * Detects whether a component or module represents Svelte, React, or a Web Element / Lit.
 */
export function detectComponentKind(componentOrSource: unknown, filename?: string): ComponentKind {
  if (filename) {
    if (/\.svelte$/i.test(filename)) return "svelte";
    if (/\.(tsx|jsx)$/i.test(filename)) return "react";
    if (/\.(lit\.ts|lit\.js|wc\.ts|wc\.js)$/i.test(filename)) return "element";
  }

  if (typeof componentOrSource === "string") {
    const src = componentOrSource;
    if (/<svelte:options|<script|<style|from\s+['"]svelte/i.test(src)) return "svelte";
    if (/from\s+['"]lit|extends\s+LitElement/i.test(src)) return "element";
    if (/from\s+['"]react['"]|<[A-Z][A-Za-z0-9_]*|\buseState\b|\buseEffect\b/i.test(src)) return "react";
  }

  if (typeof componentOrSource === "function") {
    const fn = componentOrSource as any;

    // Custom Element / Lit class detection (subclass of HTMLElement)
    if (
      fn.prototype &&
      (fn.prototype instanceof (typeof HTMLElement !== "undefined" ? HTMLElement : Object) ||
        typeof fn.prototype.connectedCallback === "function" ||
        typeof fn.prototype.render === "function")
    ) {
      // Check if it's LitElement
      if (fn.styles !== undefined || fn.properties !== undefined) {
        return "element";
      }
      // If prototype has connectedCallback, it's a Custom Element
      if (typeof fn.prototype.connectedCallback === "function") {
        return "element";
      }
    }

    // React component detection
    if (
      (fn.prototype && (fn.prototype.isReactComponent || fn.prototype.isPureReactComponent)) ||
      fn.$$typeof === Symbol.for("react.element") ||
      fn.$$typeof === Symbol.for("react.memo") ||
      fn.$$typeof === Symbol.for("react.forward_ref")
    ) {
      return "react";
    }

    // Functional React component convention (name starts with uppercase or returns JSX)
    if (/^[A-Z]/.test(fn.name)) {
      return "react";
    }
  }

  // Fallback default
  return "svelte";
}

export { createElementBridge, createReactBridge, registerWebComponent };
