/**
 * Web Component / Lit Custom Element Bridge for DocMeDown.
 *
 * Lit components are native Custom Elements. This bridge normalizes attribute-to-property
 * reflection, event propagation, and slot handling for seamless interoperability
 * with Svelte 5 and Markdown tags.
 */

import { type DmdElementClass, kebabToCamelCase, normalizeAttributeValue } from "./react-bridge";

export interface ElementBridgeOptions {
  /** Tag name to register in customElements registry */
  tag?: string;
  /** Property names that expect complex objects/arrays to parse from JSON attributes */
  jsonProperties?: string[];
  /** Custom events to ensure bubble with composed: true */
  bubbleEvents?: string[];
}

/**
 * Creates an enhanced Custom Element wrapper or registers an existing Lit/HTMLElement class.
 */
export function createElementBridge(
  ElementClass: CustomElementConstructor,
  options: ElementBridgeOptions = {},
): DmdElementClass {
  // If the class is already a Custom Element class, wrap it with property reflection helpers
  return class ElementBridgeWrapper extends ElementClass {
    connectedCallback() {
      const superProto = Object.getPrototypeOf(ElementBridgeWrapper.prototype);
      if (superProto && typeof superProto.connectedCallback === "function") {
        superProto.connectedCallback.call(this);
      }

      this.syncAttributesToProperties();

      // Forward declared events with bubbling
      if (options.bubbleEvents) {
        for (const evt of options.bubbleEvents) {
          this.addEventListener(evt, (e: Event) => {
            if (!e.bubbles || !e.composed) {
              e.stopPropagation();
              this.dispatchEvent(
                new CustomEvent(evt, {
                  detail: (e as CustomEvent).detail,
                  bubbles: true,
                  composed: true,
                }),
              );
            }
          });
        }
      }
    }

    private syncAttributesToProperties() {
      for (let i = 0; i < this.attributes.length; i++) {
        const attr = this.attributes[i];
        if (attr.name.startsWith("data-dmd-")) continue;
        if (attr.name === "class" || attr.name === "style" || attr.name === "id") continue;

        const propName = kebabToCamelCase(attr.name);
        const value = normalizeAttributeValue(attr.value);

        try {
          (this as any)[propName] = value;
        } catch {
          // Property may be read-only or setter throws
        }
      }
    }
  };
}

/**
 * Registers a Web Component or Lit class under a specified tag if not already registered.
 */
export function registerWebComponent(tag: string, elementClass: CustomElementConstructor): string {
  if (typeof window !== "undefined" && typeof customElements !== "undefined") {
    if (!customElements.get(tag)) {
      customElements.define(tag, elementClass);
    }
  }
  return tag;
}
