import { html, LitElement } from "lit";
import { sharedStyles } from "./shared-styles";

export class DmdColumns extends LitElement {
  static properties = {
    cols: {
      // `cols={3}` reaches the DOM as the literal string `{3}` when markdown
      // output bypasses the runtime's React-style normalization; parse
      // defensively and clamp to the supported 1-4 grid so the layout class
      // is always a real value (NaN would collapse the grid to one column).
      type: Number,
      converter: {
        fromAttribute: (value: string | null): number => {
          if (value === null) return 2;
          const n = Number.parseInt(value.replace(/[{}'"\s]/g, ""), 10);
          if (!Number.isFinite(n)) return 2;
          return Math.min(4, Math.max(1, n));
        },
      },
    },
    type: { type: String },
  };
  static styles = [sharedStyles];

  declare cols: number;
  declare type: string;

  constructor() {
    super();
    this.cols = 2;
    this.type = "normal";
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Propagate type to children so column shadow roots can style themselves.
    // Microtask ensures children are upgraded before we read/set attributes.
    queueMicrotask(() => this._propagateType());
  }

  updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("type")) {
      this._propagateType();
    }
  }

  private _propagateType(): void {
    const colType = this.type;
    for (const child of Array.from(this.children)) {
      const tag = child.tagName.toLowerCase();
      if (tag === "dmd-column" || tag === "dmd-item") {
        child.setAttribute("data-col-type", colType);
      }
    }
  }

  render() {
    return html`
      <div class="dmd-columns dmd-columns-${this.cols} dmd-columns-${this.type}">
        <slot></slot>
      </div>
    `;
  }
}

export class DmdColumn extends LitElement {
  static properties = {
    colType: { type: String, attribute: "data-col-type" },
  };
  static styles = [sharedStyles];

  declare colType: string;

  constructor() {
    super();
    this.colType = "";
  }

  render() {
    const extraClass = this.colType && this.colType !== "normal" ? ` dmd-column-${this.colType}` : "";
    return html`<div class="dmd-column${extraClass}"><slot></slot></div>`;
  }
}

customElements.define("dmd-columns", DmdColumns);
customElements.define("dmd-column", DmdColumn);
