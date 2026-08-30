import type React from "react";
import { useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { ComponentRegistry } from "../components/DmdRegistry";
import { MermaidDiagram } from "../components/MermaidDiagram";
import {
  getEmbeddedNestedSites,
  isRelativeHtmlLink,
  isSelfContainedOffline,
  matchEmbeddedNestedSite,
  notifyUnavailableOfflineLink,
  openEmbeddedNestedSite,
} from "../offline-export";
import { decodeDiagramSource } from "./mermaid";

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

    // Diagram viewers mount before any registry work so documents WITHOUT
    // custom components still render their mermaid fences (this used to sit
    // behind an early return, which silently skipped plain-HTML docs).
    const diagramHosts = containerRef.current.querySelectorAll<HTMLDivElement>(".dmd-diagram-host[data-dmd-diagram]");
    diagramHosts.forEach((host) => {
      if (host.hasAttribute("data-dmd-mounted")) return;
      host.setAttribute("data-dmd-mounted", "true");

      let source = "";
      try {
        source = decodeDiagramSource(host.getAttribute("data-dmd-diagram") || "");
      } catch {
        return;
      }

      const root = ReactDOM.createRoot(host);
      root.render(<MermaidDiagram source={source} />);
      rootsRef.current.push(root);
    });

    const registry = ComponentRegistry.getInstance();
    const registered = registry.getAll();
    const componentNames = Object.keys(registered);

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

  // Self-contained offline copies mark the file links they cannot fulfill so
  // they read as disabled instead of failing with a browser navigation error.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !html || !isSelfContainedOffline()) return;
    const sites = getEmbeddedNestedSites();

    container.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
      const href = anchor.getAttribute("href") || "";
      if (!isRelativeHtmlLink(href)) return;
      if (matchEmbeddedNestedSite(href, sites)) {
        anchor.setAttribute("data-dmd-embedded-link", "true");
        return;
      }
      anchor.classList.add("dmd-link-disabled");
      anchor.setAttribute("aria-disabled", "true");
      anchor.setAttribute("title", "Unavailable in offline documentation");
    });
  }, [html]);

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

    // Self-contained offline copies never navigate to external files: embedded
    // nested documentation opens from inside this file, everything else is
    // reported as unavailable instead of failing with ERR_FILE_NOT_FOUND.
    if (isSelfContainedOffline() && isRelativeHtmlLink(href)) {
      e.preventDefault();
      const nestedKey = matchEmbeddedNestedSite(href, getEmbeddedNestedSites());
      if (nestedKey) {
        openEmbeddedNestedSite(nestedKey, href).catch(() =>
          notifyUnavailableOfflineLink("This nested documentation site could not be opened from the offline copy."),
        );
        return;
      }
      notifyUnavailableOfflineLink();
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
