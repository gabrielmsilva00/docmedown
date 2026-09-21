import { html, LitElement } from "lit";
import { sharedStyles } from "./shared-styles";

export class DmdTimeline extends LitElement {
  static styles = [sharedStyles];
  render() {
    return html`<div class="dmd-timeline"><slot></slot></div>`;
  }
}

export class DmdTimelineItem extends LitElement {
  static properties = {
    title: { type: String },
    subtitle: { type: String },
  };
  static styles = [sharedStyles];

  declare title: string;
  declare subtitle: string;

  constructor() {
    super();
    this.title = "";
    this.subtitle = "";
  }

  render() {
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
}

customElements.define("dmd-timeline", DmdTimeline);
customElements.define("dmd-timeline-item", DmdTimelineItem);
