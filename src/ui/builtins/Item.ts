import { html, LitElement } from "lit";
import { sharedStyles } from "./shared-styles";

/**
 * Universal child element: reads its parent custom-element tag and renders as
 * that container's designated child (TimelineItem, AccordionItem, Column,
 * Step with auto-numbering, Card, or Tab). With no recognized container it
 * degrades to an <li>.
 */
export class DmdItem extends LitElement {
  static properties = {
    title: { type: String },
    subtitle: { type: String },
    description: { type: String },
    icon: { type: String },
    label: { type: String },
    value: { type: String },
    step: { type: String },
    defaultopen: { type: Boolean },
    // Set by <dmd-columns> after this element's first render; reactive so
    // the column treatment class is applied when the attribute arrives.
    colType: { type: String, attribute: "data-col-type" },
  };
  static styles = [sharedStyles];

  declare title: string;
  declare subtitle: string;
  declare description: string;
  declare icon: string;
  declare label: string;
  declare value: string;
  declare step: string;
  declare defaultopen: boolean;
  declare colType: string;

  private _open = false;

  constructor() {
    super();
    this.title = "";
    this.subtitle = "";
    this.description = "";
    this.icon = "";
    this.label = "";
    this.value = "";
    this.step = "";
    this.defaultopen = false;
    this.colType = "";
  }

  connectedCallback() {
    super.connectedCallback();
    this._open = this.defaultopen;
  }

  private get parentKind(): string {
    const parent = this.parentElement?.tagName?.toLowerCase();
    switch (parent) {
      case "dmd-timeline":
        return "timeline";
      case "dmd-accordion":
        return "accordion";
      case "dmd-columns":
        return "columns";
      case "dmd-card-grid":
        return "cardgrid";
      case "dmd-tabs":
        return "tabs";
      case "dmd-steps":
        return "steps";
      default:
        return "none";
    }
  }

  private get autoStep(): string {
    if (this.parentKind !== "steps" || !this.parentElement) return "";
    const siblings = Array.from(this.parentElement.children).filter(
      (el) => el.tagName.toLowerCase() === "dmd-item" || el.tagName.toLowerCase() === "dmd-step",
    );
    return String(siblings.indexOf(this) + 1);
  }

  private toggleAccordion() {
    this._open = !this._open;
    this.requestUpdate();
  }

  render() {
    const kind = this.parentKind;

    if (kind === "timeline") {
      return html`
        <div class="dmd-timeline-item">
          <div class="dmd-timeline-dot" aria-hidden="true"></div>
          <div class="dmd-timeline-content">
            <div class="dmd-timeline-title">${this.title}</div>
            ${this.subtitle ? html`<div class="dmd-timeline-subtitle">${this.subtitle}</div>` : ""}
            <div class="dmd-timeline-body"><slot></slot></div>
          </div>
        </div>
      `;
    }

    if (kind === "accordion") {
      return html`
        <div class="dmd-accordion-item${this._open ? " open" : ""}">
          <button
            type="button"
            class="dmd-accordion-trigger"
            aria-expanded=${this._open}
            @click=${() => this.toggleAccordion()}
          >
            <span class="dmd-accordion-label">${this.title}</span>
            <span class="dmd-accordion-chevron" aria-hidden="true">▾</span>
          </button>
          <div class="dmd-accordion-panel${this._open ? " open" : ""}"><slot></slot></div>
        </div>
      `;
    }

    if (kind === "steps") {
      const stepNum = this.step || this.autoStep;
      return html`
        <div class="dmd-step-item">
          <div class="dmd-step-marker">${stepNum}</div>
          <div class="dmd-step-content">
            <h4 class="dmd-step-title">${this.title}</h4>
            <div class="dmd-step-body"><slot></slot></div>
          </div>
        </div>
      `;
    }

    if (kind === "columns") {
      const extraClass = this.colType && this.colType !== "normal" ? ` dmd-column-${this.colType}` : "";
      return html`<div class="dmd-column${extraClass}"><slot></slot></div>`;
    }

    if (kind === "cardgrid") {
      return html`
        <div class="dmd-card dmd-card-shadow">
          ${
            this.title || this.icon || this.description
              ? html`<div class="dmd-card-header">
                ${this.icon ? html`<div class="dmd-card-icon"><span>${this.icon}</span></div>` : ""}
                <div class="dmd-card-header-text">
                  ${this.title ? html`<h3 class="dmd-card-title">${this.title}</h3>` : ""}
                  ${this.description ? html`<p class="dmd-card-subtitle">${this.description}</p>` : ""}
                </div>
              </div>`
              : ""
          }
          <div class="dmd-card-body"><slot></slot></div>
        </div>
      `;
    }

    if (kind === "tabs") {
      return html`<div class="dmd-tab-content"><slot></slot></div>`;
    }

    return html`<li><slot></slot></li>`;
  }
}

customElements.define("dmd-item", DmdItem);
