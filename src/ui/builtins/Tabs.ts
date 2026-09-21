import { html, LitElement, type PropertyValues } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import type { DmdItem } from "./Item";
import { sharedStyles } from "./shared-styles";
import type { DmdTab } from "./Tab";

type TabLike = DmdTab | DmdItem;

export class DmdTabs extends LitElement {
  static properties = {
    defaultindex: { type: Number },
    groupid: { type: String },
    type: { type: String },
    variant: { type: String },
  };
  static styles = [sharedStyles];

  declare defaultindex: number;
  declare groupid: string;
  declare type: string;
  declare variant: string;

  private _activeIndex = 0;
  private _initialized = false;
  private _tabs: TabLike[] = [];
  private _baseId = `dmd${Math.random().toString(36).slice(2, 10)}`;
  private _headerRef = createRef<HTMLElement>();
  // Sliding indicator plumbing: the header exposes --dmd-tab-ind-x/-w CSS
  // vars; the indicator span animates transform/width against them (GPU-only).
  private _resizeObserver: ResizeObserver | null = null;
  private _observing = false;
  private _measureRaf = 0;

  constructor() {
    super();
    this.defaultindex = 0;
    this.groupid = "";
    this.type = "";
    this.variant = "";
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("dmd-tabs-change", this._onSync);
    // Track header reflows (fonts loading, container resizes) so the sliding
    // indicator always hugs the active tab. Callbacks are already frame-batched
    // by the browser; the measure itself is rAF-throttled on top of that.
    if (typeof ResizeObserver !== "undefined") {
      this._resizeObserver = new ResizeObserver(() => this._scheduleMeasure());
    }
    // Schedule initial tab discovery on a microtask so any subsequent
    // child upgrades that fire slotchange are captured after this one.
    // Without this, if children haven't been upgraded yet when the first
    // slotchange fires, _tabs stays empty and _initTabs returns early.
    void Promise.resolve().then(() => {
      if (!this._initialized) {
        this._tabs = this._readTabs();
        this._initTabs();
        this._applyVisibility();
        this.requestUpdate();
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("dmd-tabs-change", this._onSync);
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._observing = false;
    if (this._measureRaf) cancelAnimationFrame(this._measureRaf);
    this._measureRaf = 0;
  }

  private _onSync = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (!this.groupid || detail?.groupId !== this.groupid || detail?.value == null) return;
    const idx = this._tabs.findIndex((t) => (t.value || t.label || "") === detail.value);
    if (idx >= 0) {
      this._activeIndex = idx;
      this._applyVisibility();
      this.requestUpdate();
    }
  };

  private _readTabs(): TabLike[] {
    const slot = this.shadowRoot?.querySelector("slot");
    if (!slot) return [];
    return (slot.assignedElements() as TabLike[]).filter((el) => {
      const tag = el.tagName.toLowerCase();
      return tag === "dmd-tab" || tag === "dmd-item";
    });
  }

  private _initTabs() {
    if (this._initialized || this._tabs.length === 0) return;
    this._initialized = true;
    let next = Math.min(Math.max(this.defaultindex || 0, 0), this._tabs.length - 1);
    if (this.groupid) {
      try {
        const saved = localStorage.getItem(`dmd-tabs:${this.groupid}`);
        if (saved) {
          const idx = this._tabs.findIndex((t) => (t.value || t.label || "") === saved);
          if (idx >= 0) next = idx;
        }
      } catch {
        // storage unavailable (opaque origin)
      }
    }
    this._activeIndex = next;
    this._applyVisibility();
  }

  private _applyVisibility() {
    // Inline `display` beats both the UA `[hidden]` rule and our own
    // `:host { display: contents }`, so drive visibility with the inline
    // style alone: the active tab falls back to `:host` (contents), every
    // other tab is `display: none`. Never rely on `hidden` here.
    this._tabs.forEach((tab, i) => {
      if (i === this._activeIndex) {
        tab.style.removeProperty("display");
      } else {
        tab.style.display = "none";
      }
      tab.removeAttribute("hidden");
    });
  }

  private _onSlotChange() {
    this._tabs = this._readTabs();
    if (this._tabs.length > 0) {
      this._initTabs();
      this._applyVisibility();
    }
    this.requestUpdate();
  }

  /**
   * Positions the sliding indicator under/behind the active tab by writing
   * `--dmd-tab-ind-x`/`-w` onto the header. One batched layout read per
   * update, rAF-coalesced — never inside render(), never per scroll/frame.
   *
   * `offsetLeft`/`offsetWidth` are border-box measurements relative to the
   * header's padding box and invariant to scrolling (layout coordinates, not
   * viewport coordinates), so the indicator (which lives in the same scrolled
   * plane as the buttons) stays glued to the active tab — under centering
   * slack, horizontal overflow, fonts loading, and container resizes alike.
   * The absolute indicator must be explicitly anchored with `left: 0` (see
   * main.css): without an inset, an absolutely positioned flex child gets its
   * static position from the header's alignment, so a `justify-content:
   * center` row would double-count the centering slack and park the pill in
   * empty space.
   */
  private _scheduleMeasure() {
    if (this._measureRaf) return;
    this._measureRaf = requestAnimationFrame(() => {
      this._measureRaf = 0;
      const header = this._headerRef.value;
      if (!header || !this.isConnected) return;
      const buttons = header.querySelectorAll<HTMLButtonElement>(".dmd-tab-btn");
      const button = buttons[this._activeIndex];
      if (!button) return;
      header.style.setProperty("--dmd-tab-ind-x", `${button.offsetLeft}px`);
      header.style.setProperty("--dmd-tab-ind-w", `${button.offsetWidth}px`);
    });
  }

  updated() {
    // First render → start observing the header; every render → re-hug the
    // active tab (rAF coalesces bursts such as arrow-key navigation).
    if (this._resizeObserver && this._headerRef.value && !this._observing) {
      this._resizeObserver.observe(this._headerRef.value);
      this._observing = true;
    }
    this._scheduleMeasure();
  }

  private _select(idx: number, focus = false) {
    if (this._tabs.length === 0) return;
    const clamped = ((idx % this._tabs.length) + this._tabs.length) % this._tabs.length;
    this._activeIndex = clamped;
    this._applyVisibility();
    if (this.groupid) {
      try {
        const key = this._tabs[clamped]?.value || this._tabs[clamped]?.label || String(clamped);
        localStorage.setItem(`dmd-tabs:${this.groupid}`, String(key));
        window.dispatchEvent(new CustomEvent("dmd-tabs-change", { detail: { groupId: this.groupid, value: key } }));
      } catch {
        /* ignore */
      }
    }
    if (focus) {
      (this.shadowRoot?.querySelectorAll<HTMLButtonElement>(".dmd-tab-btn")[clamped] as HTMLElement)?.focus?.();
    }
    this.requestUpdate();
  }

  private _onKeyDown(event: KeyboardEvent, idx: number) {
    const key = event.key;
    if (key === "ArrowRight" || key === "ArrowDown") {
      event.preventDefault();
      this._select(idx + 1, true);
    } else if (key === "ArrowLeft" || key === "ArrowUp") {
      event.preventDefault();
      this._select(idx - 1, true);
    } else if (key === "Home") {
      event.preventDefault();
      this._select(0, true);
    } else if (key === "End") {
      event.preventDefault();
      this._select(this._tabs.length - 1, true);
    }
  }

  private get tabType(): string {
    return this.type || this.variant || "recessed";
  }

  /**
   * `defaultindex` and `groupid` only feed one-time initialization, the sync
   * event, and localStorage — they never affect the template. Skip the update
   * cycle for those so external attribute churn stays free. Internal state
   * changes (`_activeIndex`, `_tabs`) request updates with an empty changed
   * map and must always render.
   */
  shouldUpdate(changedProperties: PropertyValues): boolean {
    if (changedProperties.size === 0 || !this.hasUpdated) return true;
    return changedProperties.has("type") || changedProperties.has("variant");
  }

  render() {
    return html`
      <div class="dmd-tabs-wrapper dmd-tabs-${this.tabType}">
        <div
          class="dmd-tabs-header"
          role="tablist"
          aria-label="Content tabs"
          ${ref(this._headerRef)}
        >
          <span class="dmd-tab-indicator" aria-hidden="true"></span>
          ${this._tabs.map((tab, idx) => {
            const active = this._activeIndex === idx;
            const name = tab.value || tab.label || `Tab ${idx + 1}`;
            const hasLabel = !!tab.label;
            const icon = (tab as { icon?: string }).icon ?? "";
            return html`
              <button
                type="button"
                role="tab"
                id="dmd-tab-${this._baseId}-${idx}"
                aria-selected=${active}
                aria-controls="dmd-tabpanel-${this._baseId}-${idx}"
                aria-label=${hasLabel ? undefined : name}
                tabindex=${active ? 0 : -1}
                class="dmd-tab-btn${active ? " active" : ""}${hasLabel ? "" : " dmd-tab-btn-icon"}"
                @click=${() => this._select(idx)}
                @keydown=${(e: KeyboardEvent) => this._onKeyDown(e, idx)}
              >
                ${icon ? html`<span class="dmd-tab-icon" aria-hidden="true">${icon}</span>` : ""}
                ${hasLabel ? html`<span class="dmd-tab-label">${tab.label}</span>` : ""}
              </button>
            `;
          })}
        </div>
        <div
          class="dmd-tab-panel"
          role="tabpanel"
          id="dmd-tabpanel-${this._baseId}-${this._activeIndex}"
          aria-labelledby="dmd-tab-${this._baseId}-${this._activeIndex}"
        >
          <slot @slotchange=${this._onSlotChange}></slot>
        </div>
      </div>
    `;
  }
}

customElements.define("dmd-tabs", DmdTabs);
