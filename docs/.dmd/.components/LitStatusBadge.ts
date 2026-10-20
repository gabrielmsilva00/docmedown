export class LitStatusBadgeElement extends HTMLElement {
  connectedCallback() {
    const status = this.getAttribute("status") || "operational";
    const label = this.getAttribute("label") || "All Systems";
    const color =
      status === "operational"
        ? "var(--dmd-success, #10b981)"
        : "var(--dmd-warning, #f59e0b)";

    this.innerHTML = `
      <div style="display:inline-flex;align-items:center;gap:0.45rem;padding:0.3rem 0.7rem;border-radius:9999px;border:1px solid ${color};background:var(--dmd-bg-card);font-size:0.85rem;font-weight:600;color:var(--dmd-text-primary);margin:0.5rem 0;">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;"></span>
        <span>${label}:</span>
        <span style="color:${color};text-transform:capitalize;">${status}</span>
        <span style="font-size:0.75rem;opacity:0.75;margin-left:0.25rem;border-left:1px solid var(--dmd-border-color);padding-left:0.4rem;">Web Component</span>
      </div>
    `;
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("dmd-lit-status-badge")
) {
  customElements.define("dmd-lit-status-badge", LitStatusBadgeElement);
}

export default LitStatusBadgeElement;
