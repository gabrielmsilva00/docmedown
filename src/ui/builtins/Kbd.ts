import { html, LitElement } from "lit";
import { sharedStyles } from "./shared-styles";

export class DmdKbd extends LitElement {
  static properties = { keys: { type: String } };
  static styles = [sharedStyles];

  declare keys: string;
  constructor() {
    super();
    this.keys = "";
  }

  private get keyList(): string[] | null {
    if (!this.keys) return null;
    const list = this.keys
      .split("+")
      .map((k) => k.trim())
      .filter(Boolean);
    return list.length > 0 ? list : null;
  }

  render() {
    const keys = this.keyList;
    if (keys) {
      return html`
        <span class="dmd-kbd-group">
          <span class="dmd-sr-only">Keyboard shortcut: ${keys.join(" plus ")}</span>
          ${keys.map(
            (key, i) => html`
              <span class="dmd-kbd-chord">
                ${i > 0 ? html`<span class="dmd-kbd-plus" aria-hidden="true">+</span>` : ""}
                <kbd class="dmd-kbd">${key}</kbd>
              </span>
            `,
          )}
        </span>
      `;
    }
    return html`<kbd class="dmd-kbd"><slot></slot></kbd>`;
  }
}

customElements.define("dmd-kbd", DmdKbd);
