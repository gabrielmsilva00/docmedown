import { html, LitElement, type PropertyValues } from "lit";
import { sharedStyles } from "./shared-styles";

export class DmdAccordion extends LitElement {
  static styles = [sharedStyles];
  render() {
    return html`<div class="dmd-accordion"><slot></slot></div>`;
  }
}

export class DmdAccordionItem extends LitElement {
  static properties = {
    title: { type: String },
    defaultopen: { type: Boolean },
  };
  static styles = [sharedStyles];

  declare title: string;
  declare defaultopen: boolean;
  private _open = false;

  constructor() {
    super();
    this.title = "";
    this.defaultopen = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this._open = this.defaultopen;
  }

  /**
   * `defaultopen` is read once at connect time and never affects the template
   * afterwards — only `title` changes and explicit `requestUpdate()` calls
   * (the toggle) need a render.
   */
  shouldUpdate(changedProperties: PropertyValues): boolean {
    if (changedProperties.size === 0 || !this.hasUpdated) return true;
    return changedProperties.has("title");
  }

  private toggle() {
    this._open = !this._open;
    this.requestUpdate();
  }

  render() {
    return html`
      <div class="dmd-accordion-item${this._open ? " open" : ""}">
        <button
          type="button"
          class="dmd-accordion-trigger"
          aria-expanded=${this._open}
          @click=${() => this.toggle()}
        >
          <span class="dmd-accordion-label">${this.title}</span>
          <span class="dmd-accordion-chevron" aria-hidden="true">▾</span>
        </button>
        <div class="dmd-accordion-panel${this._open ? " open" : ""}">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

customElements.define("dmd-accordion", DmdAccordion);
customElements.define("dmd-accordion-item", DmdAccordionItem);
