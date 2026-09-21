import { html, LitElement } from "lit";
import { sharedStyles } from "./shared-styles";

export class DmdStep extends LitElement {
  static properties = {
    title: { type: String },
    step: { type: String },
  };
  static styles = [sharedStyles];

  declare title: string;
  declare step: string;

  private _resolvedStep = "";

  constructor() {
    super();
    this.title = "";
    this.step = "";
  }

  connectedCallback() {
    super.connectedCallback();
    // Schedule auto-number resolution after microtask so sibling
    // dmd-step elements are all upgraded and present in the DOM.
    void Promise.resolve().then(() => {
      this._resolveStepNumber();
    });
  }

  private _resolveStepNumber() {
    const explicit = Number(this.step);
    if (this.step && Number.isFinite(explicit) && String(explicit) !== "") {
      this._resolvedStep = String(explicit);
      return;
    }
    const parent = this.parentElement;
    if (!parent) {
      this._resolvedStep = "";
      return;
    }
    const siblings = Array.from(parent.children).filter((el) => el.tagName.toLowerCase() === "dmd-step");
    this._resolvedStep = String(siblings.indexOf(this) + 1);
    this.requestUpdate();
  }

  render() {
    return html`
      <div class="dmd-step-item">
        <div class="dmd-step-marker">${this._resolvedStep}</div>
        <div class="dmd-step-content">
          <h4 class="dmd-step-title">${this.title}</h4>
          <div class="dmd-step-body"><slot></slot></div>
        </div>
      </div>
    `;
  }
}
customElements.define("dmd-step", DmdStep);
