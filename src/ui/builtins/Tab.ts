import { html, LitElement } from "lit";
import { sharedStyles } from "./shared-styles";

export class DmdTab extends LitElement {
  static properties = {
    label: { type: String },
    value: { type: String },
    icon: { type: String },
  };
  static styles = [sharedStyles];

  declare label: string;
  declare value: string;
  declare icon: string;

  constructor() {
    super();
    this.label = "";
    this.value = "";
    this.icon = "";
  }

  render() {
    return html`<div class="dmd-tab-content"><slot></slot></div>`;
  }
}

customElements.define("dmd-tab", DmdTab);
