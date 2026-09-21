import { html, LitElement } from "lit";
import { sharedStyles } from "./shared-styles";

export class DmdBadge extends LitElement {
  static properties = {
    type: { type: String },
    pill: { type: Boolean },
    dot: { type: Boolean },
  };
  static styles = [sharedStyles];

  declare type: string;
  declare pill: boolean;
  declare dot: boolean;

  constructor() {
    super();
    this.type = "info";
    this.pill = false;
    this.dot = false;
  }

  render() {
    return html`
      <span
        class="dmd-badge dmd-badge-${this.type}${this.pill ? " dmd-badge-pill" : ""}${this.dot ? " dmd-badge-dot" : ""}"
      >
        ${
          this.dot
            ? html`<span class="dmd-badge-pulse" aria-hidden="true"
              ><span class="dmd-badge-pulse-ring"></span
              ><span class="dmd-badge-pulse-core"></span
            ></span>`
            : ""
        }
        <span class="dmd-badge-label"><slot></slot></span>
      </span>
    `;
  }
}

customElements.define("dmd-badge", DmdBadge);
