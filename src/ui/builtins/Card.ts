import { html, LitElement } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { inferCardOutline } from "./card-outline";
import { sharedStyles } from "./shared-styles";

const CARD_COLORS = new Set(["blue", "green", "violet", "amber", "red", "neutral"]);

export class DmdCard extends LitElement {
  static properties = {
    title: { type: String },
    description: { type: String },
    href: { type: String },
    icon: { type: String },
    image: { type: String },
    imagealt: { type: String },
    badge: { type: String },
    badgetype: { type: String },
    footer: { type: String },
    color: { type: String },
    shadow: { type: Boolean },
  };
  static styles = [sharedStyles];

  declare title: string;
  declare description: string;
  declare href: string;
  declare icon: string;
  declare image: string;
  declare imagealt: string;
  declare badge: string;
  declare badgetype: string;
  declare footer: string;
  declare color: string;
  declare shadow: boolean;

  constructor() {
    super();
    this.title = "";
    this.description = "";
    this.href = "";
    this.icon = "";
    this.image = "";
    this.imagealt = "";
    this.badge = "";
    this.badgetype = "info";
    this.footer = "";
    this.color = "";
    this.shadow = true;
  }

  // Container-style cards: Markdown children adopted as chrome (see
  // inferCardOutline). Kept as markup because adopted content is rendered by
  // the shadow template, exactly like its prop-driven counterpart.
  private _autoTitle = "";
  private _autoDescription = "";
  private _autoFooter = "";

  connectedCallback() {
    super.connectedCallback();
    this._adoptOutline();
  }

  /**
   * Adopts a Markdown body as card chrome whenever the matching prop is empty:
   * a leading heading above H3 becomes the title, the deeper heading right
   * after it the description, and a trailing blockquote (or h6) the footer.
   * The adopted nodes are copied into the shadow chrome and removed from the
   * body, so an inferred heading renders exactly like a prop-driven title
   * (never at document heading scale) and an inferred footer still pins to the
   * bottom edge. Explicit props always win: nothing is adopted for them, and
   * their Markdown stays body copy.
   */
  private _adoptOutline() {
    const outline = inferCardOutline(Array.from(this.children));
    const canAdoptTitle = !this.title && !this._autoTitle;
    const canAdoptDescription = !this.description && !this._autoDescription;
    let adopted = false;

    if (canAdoptTitle && outline.title) {
      this._autoTitle = outline.title.innerHTML;
      outline.title.remove();
      adopted = true;
      // A subtitle only makes sense under an adopted title: with an explicit
      // `title` prop the heading pair is deliberately body copy.
      if (canAdoptDescription && outline.description) {
        this._autoDescription = outline.description.innerHTML;
        outline.description.remove();
        adopted = true;
      }
    }

    if (!this.footer && !this._autoFooter && outline.footer) {
      this._autoFooter = outline.footer.innerHTML;
      outline.footer.remove();
      adopted = true;
    }

    if (adopted) this.requestUpdate();
  }

  /**
   * Inference re-runs on slot change so a body that arrives after the first
   * render (client-side injection, late child upgrades) still lands in the
   * chrome; the `_auto*` guards above keep an adopted outline from being
   * adopted twice.
   */
  private _onSlotChange() {
    this._adoptOutline();
  }

  /**
   * Duplicates this card for a carousel's wrap-around slides. `cloneNode(true)`
   * carries the surviving light DOM only, so the inferred chrome of a
   * container-style card (`_auto*`) is copied over explicitly — without it the
   * clone would render as a bare body. Hosts without this method (a plain
   * `<Item>` slide) are deep-cloned by the caller instead.
   */
  cloneCard(): DmdCard {
    const copy = this.cloneNode(true) as DmdCard;
    copy._autoTitle = this._autoTitle;
    copy._autoDescription = this._autoDescription;
    copy._autoFooter = this._autoFooter;
    return copy;
  }

  private get colorClass(): string {
    if (!this.color) return "";
    return CARD_COLORS.has(this.color) ? ` dmd-card-${this.color}` : " dmd-card-accent";
  }

  private get colorStyle(): string {
    if (!this.color || CARD_COLORS.has(this.color)) return "";
    return `--dmd-card-accent: ${this.color};`;
  }

  private get hasHeader(): boolean {
    return !!(this.title || this._autoTitle || this.badge || this.icon || this.description || this._autoDescription);
  }

  private renderCard() {
    return html`
      <div
        class="dmd-card${this.colorClass}${this.shadow ? " dmd-card-shadow" : " dmd-card-flat"}"
        style=${this.colorStyle}
      >
        ${
          this.image
            ? html`<div class="dmd-card-media" aria-hidden=${this.imagealt ? undefined : "true"}>
              <img src=${this.image} alt=${this.imagealt || ""} loading="lazy" />
            </div>`
            : ""
        }
        ${
          this.hasHeader
            ? html`<div class="dmd-card-header">
              ${this.icon ? html`<div class="dmd-card-icon"><span>${unsafeHTML(this.icon)}</span></div>` : ""}
              <div class="dmd-card-header-text">
                ${
                  this.title || this._autoTitle || this.badge
                    ? html`<div class="dmd-card-title-row">
                      ${
                        this.title
                          ? html`<h3 class="dmd-card-title">${this.title}</h3>`
                          : this._autoTitle
                            ? html`<h3 class="dmd-card-title">${unsafeHTML(this._autoTitle)}</h3>`
                            : ""
                      }
                      ${
                        this.badge ? html`<span class="dmd-badge dmd-badge-${this.badgetype}">${this.badge}</span>` : ""
                      }
                    </div>`
                    : ""
                }
                ${
                  this.description
                    ? html`<p class="dmd-card-subtitle">${this.description}</p>`
                    : this._autoDescription
                      ? html`<p class="dmd-card-subtitle">${unsafeHTML(this._autoDescription)}</p>`
                      : ""
                }
              </div>
            </div>`
            : ""
        }
        <div class="dmd-card-body"><slot @slotchange=${this._onSlotChange}></slot></div>
        ${
          this.footer
            ? html`<div class="dmd-card-footer">${this.footer}</div>`
            : this._autoFooter
              ? html`<div class="dmd-card-footer">${unsafeHTML(this._autoFooter)}</div>`
              : ""
        }
      </div>
    `;
  }

  render() {
    if (this.href) {
      return html`<a href=${this.href} class="dmd-card-link">${this.renderCard()}</a>`;
    }
    return this.renderCard();
  }
}

customElements.define("dmd-card", DmdCard);
