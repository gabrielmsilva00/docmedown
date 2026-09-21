// DocMeDown 1.0 custom components are custom elements: export a map of
// component name -> HTMLElement subclass, and the runtime registers each one
// as `dmd-<name>` for use directly inside Markdown.

export class CounterWidget extends HTMLElement {
  connectedCallback() {
    const button = document.createElement("button");
    let count = Number(this.getAttribute("initial")) || 0;
    button.type = "button";
    button.textContent = `Interactive counter: ${count}`;
    button.style.cssText = `padding:0.55rem 0.85rem;border:1px solid var(--dmd-accent);border-radius:6px;background:var(--dmd-accent-subtle);color:var(--dmd-text-primary);cursor:pointer;font-weight:700;`;

    button.addEventListener("click", () => {
      count += 1;
      button.textContent = `Interactive counter: ${count}`;
    });

    this.innerHTML = "";
    this.appendChild(button);
  }
}

export default { CounterWidget };