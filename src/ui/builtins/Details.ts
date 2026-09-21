import { html, LitElement } from "lit";
import { sharedStyles } from "./shared-styles";

export class DmdDetails extends LitElement {
  static properties = {
    summary: { type: String },
    open: { type: Boolean },
  };
  static styles = [sharedStyles];

  declare summary: string;
  declare open: boolean;

  constructor() {
    super();
    this.summary = "";
    this.open = false;
  }

  render() {
    return html`
      <details class="dmd-details" ?open=${this.open}>
        <summary class="dmd-details-summary">${this.summary}</summary>
        <div class="dmd-details-body"><slot></slot></div>
      </details>
    `;
  }
}

customElements.define("dmd-details", DmdDetails);
