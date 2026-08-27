import type React from "react";
import { useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { ComponentRegistry } from "../components/DmdRegistry";
import { renderMermaidDiagrams } from "./mermaid";

interface MarkdownRendererProps {
  html: string;
  onNavigate?: (slug: string, anchor: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ html, onNavigate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootsRef = useRef<ReactDOM.Root[]>([]);

  // Setup global copy code handler
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__dmdCopyCode = (btn: HTMLElement) => {
        const targetSelector = btn.getAttribute("data-clipboard-target");
        if (!targetSelector) return;
        const codeEl = document.querySelector(targetSelector);
        if (!codeEl) return;

        const text = codeEl.textContent || "";
        navigator.clipboard.writeText(text).then(() => {
          const copyIcon = btn.querySelector(".copy-icon") as HTMLElement;
          const checkIcon = btn.querySelector(".check-icon") as HTMLElement;
          const label = btn.querySelector("span");

          if (copyIcon && checkIcon) {
            copyIcon.style.display = "none";
            checkIcon.style.display = "inline-block";
            if (label) label.textContent = "Copied!";
            btn.classList.add("copied");

            setTimeout(() => {
              copyIcon.style.display = "inline-block";
              checkIcon.style.display = "none";
              if (label) label.textContent = "Copy";
              btn.classList.remove("copied");
            }, 2000);
          }
        });
      };
    }
  }, []);

  // Mount custom React components (.dmd and builtins) once per document route.
  // Content keys this renderer by slug so its HTML placeholders are fresh on navigation.
  useEffect(() => {
    // Unmount previous component roots
    rootsRef.current.forEach((root) => {
      try {
        root.unmount();
      } catch {
        // ignore
      }
    });
    rootsRef.current = [];

    if (!containerRef.current) return;

    const registry = ComponentRegistry.getInstance();
    const registered = registry.getAll();
    const componentNames = Object.keys(registered);

    if (componentNames.length === 0) return;

    // Scan for tags matching registered components
    for (const name of componentNames) {
      // Find all custom tags (case-insensitive)
      const elements = containerRef.current.querySelectorAll(name);
      elements.forEach((el) => {
        const Comp = registered[name];
        if (!Comp) return;

        // Parse attributes as props
        const props: Record<string, any> = {};
        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          let val: any = attr.value;
          if (val === "true") val = true;
          else if (val === "false") val = false;
          else if (!Number.isNaN(Number(val)) && val !== "") val = Number(val);
          props[attr.name] = val;
        }

        const mountPoint = document.createElement("div");
        mountPoint.className = "dmd-custom-component-wrapper";
        el.replaceWith(mountPoint);

        const root = ReactDOM.createRoot(mountPoint);
        root.render(
          <Comp {...props}>
            {el.innerHTML ? <span dangerouslySetInnerHTML={{ __html: el.innerHTML }} /> : undefined}
          </Comp>,
        );
        rootsRef.current.push(root);
      });
    }

    // Render Mermaid diagrams whenever HTML changes
    renderMermaidDiagrams();

    return () => {
      rootsRef.current.forEach((root) => {
        try {
          root.unmount();
        } catch {
          // ignore
        }
      });
      rootsRef.current = [];
    };
  }, []);

  // Handle internal markdown link clicks smoothly
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest("a");
    if (!target) return;

    const href = target.getAttribute("href");
    if (!href) return;

    // External link or protocol
    if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) {
      return;
    }

    // Handle hash route
    if (href.startsWith("#/")) {
      e.preventDefault();
      const raw = href.substring(2);
      const hashIdx = raw.indexOf("#");
      const slug = hashIdx !== -1 ? raw.substring(0, hashIdx) : raw;
      const anchor = hashIdx !== -1 ? raw.substring(hashIdx + 1) : "";

      if (onNavigate) {
        onNavigate(slug, anchor);
      } else {
        window.location.hash = href;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="dmd-markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleContainerClick}
    />
  );
};
