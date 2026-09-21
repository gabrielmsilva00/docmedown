import { html, LitElement } from "lit";
import { sharedStyles } from "./shared-styles";

export class DmdSteps extends LitElement {
  static styles = [sharedStyles];
  render() {
    return html`<div class="dmd-steps"><slot></slot></div>`;
  }
}
customElements.define("dmd-steps", DmdSteps);
