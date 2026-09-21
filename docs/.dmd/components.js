// DocMeDown 1.0 custom components are custom elements: export a map of
// component name -> HTMLElement subclass, and the runtime registers each one
// as `dmd-<name>` for use directly inside Markdown.

const panelStyle =
  "margin:1.25rem 0;padding:1rem;border:1px solid var(--dmd-border-color);border-radius:10px;background:var(--dmd-bg-card);";

class InteractiveThemeDemo extends HTMLElement {
  connectedCallback() {
    const render = () => {
      const family = document.documentElement.getAttribute("data-dmd-theme") || "atlas";
      const mode = document.documentElement.getAttribute("data-dmd-mode") || "light";
      const density = document.documentElement.getAttribute("data-dmd-density") || "comfortable";

      this.innerHTML = `
        <div style="${panelStyle}">
          <strong>Live appearance state</strong>
          <p style="color:var(--dmd-text-secondary);">Use the Appearance menu above. This custom component observes the runtime theme contract directly.</p>
          <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:0.6rem;">
            ${Object.entries({ family, mode, density })
              .map(
                ([label, value]) => `
              <div style="border:1px solid var(--dmd-border-color);border-radius:var(--dmd-radius-md);padding:0.65rem;background:var(--dmd-bg-secondary);">
                <div style="color:var(--dmd-text-muted);font-family:var(--dmd-font-mono);font-size:0.68rem;text-transform:uppercase;">${label}</div>
                <div style="margin-top:0.25rem;font-weight:700;">${value}</div>
              </div>`,
              )
              .join("")}
          </div>
        </div>`;
    };

    render();
    this.__observer = new MutationObserver(render);
    this.__observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-dmd-theme", "data-dmd-mode", "data-dmd-density"],
    });
  }

  disconnectedCallback() {
    this.__observer?.disconnect();
  }
}

class CounterWidget extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div style="${panelStyle}">
        <strong>${this.getAttribute("title") || "Live state demo"}</strong>
        <p style="color:var(--dmd-text-secondary);">A component-local state value.</p>
        <button type="button" style="border:1px solid var(--dmd-accent);border-radius:6px;padding:0.45rem 0.7rem;background:var(--dmd-accent-subtle);color:var(--dmd-text-primary);cursor:pointer;">Count: 0</button>
      </div>`;

    let count = 0;
    const button = this.querySelector("button");
    button.addEventListener("click", () => {
      count += 1;
      button.textContent = `Count: ${count}`;
    });
  }
}

export default { InteractiveThemeDemo, CounterWidget };