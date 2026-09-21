// DocMeDown 1.0 custom components are custom elements: export a map of
// component name -> HTMLElement subclass, and the runtime registers each one
// as `dmd-<name>` for use directly inside Markdown.

export class OrbitCounter extends HTMLElement {
  connectedCallback() {
    const label = this.getAttribute("label") || "Orbit count";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${label}: 0`;
    button.style.cssText = `padding:0.6rem 0.9rem;border:1px solid var(--dmd-accent);border-radius:6px;background:var(--dmd-accent-subtle);color:var(--dmd-text-primary);cursor:pointer;font-weight:700;`;

    let count = 0;
    button.addEventListener("click", () => {
      count += 1;
      button.textContent = `${label}: ${count}`;
    });

    this.innerHTML = "";
    this.appendChild(button);
  }
}

export default { OrbitCounter };