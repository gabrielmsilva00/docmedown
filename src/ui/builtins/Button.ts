import { html, LitElement } from "lit";
import { sharedStyles } from "./shared-styles";

const SPINNER = html`<span class="dmd-btn-spinner" aria-hidden="true"
  ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <path d="M21 12a9 9 0 1 1-6.2-8.56" stroke-linecap="round" />
  </svg>
</span>`;

export class DmdButton extends LitElement {
  static properties = {
    variant: { type: String },
    size: { type: String },
    href: { type: String },
    external: { type: Boolean },
    block: { type: Boolean },
    iconposition: { type: String },
    loading: { type: Boolean },
    disabled: { type: Boolean },
    type: { type: String },
  };
  static styles = [sharedStyles];

  declare variant: string;
  declare size: string;
  declare href: string;
  declare external: boolean;
  declare block: boolean;
  declare iconposition: string;
  declare loading: boolean;
  declare disabled: boolean;
  declare type: string;

  constructor() {
    super();
    this.variant = "primary";
    this.size = "md";
    this.href = "";
    this.external = false;
    this.block = false;
    this.iconposition = "left";
    this.loading = false;
    this.disabled = false;
    this.type = "button";
  }

  private get cls(): string {
    return (
      `dmd-btn dmd-btn-${this.variant} dmd-btn-${this.size}` +
      `${this.block ? " dmd-btn-block" : ""}` +
      `${this.loading ? " dmd-btn-loading" : ""}`
    );
  }

  private get content() {
    return html`
      ${this.loading ? SPINNER : ""}
      <span class="dmd-btn-label"><slot></slot></span>
    `;
  }

  render() {
    if (this.href && !this.disabled) {
      return html`<a
        href=${this.href}
        class=${this.cls}
        target=${this.external ? "_blank" : ""}
        rel=${this.external ? "noopener noreferrer" : ""}
        aria-disabled=${this.loading ? "true" : ""}
        >${this.content}</a
      >`;
    }
    return html`<button
      type=${this.type}
      class=${this.cls}
      ?disabled=${this.disabled || this.loading}
    >
      ${this.content}
    </button>`;
  }
}

customElements.define("dmd-button", DmdButton);
