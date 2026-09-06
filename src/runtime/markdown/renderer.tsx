import React, { useEffect, useRef } from "react";
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

const INLINE_TAGS = new Set(["badge", "button", "kbd"]);

function parseDomAttributes(el: Element): Record<string, any> {
  const props: Record<string, any> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    let name = attr.name;
    if (name === "class") name = "className";
    else if (name === "for") name = "htmlFor";

    let val: any = attr.value;
    // JSX-style attribute values ({2}, {"text"}) arrive as literal braces
    if (val.startsWith("{") && val.endsWith("}") && val.length >= 2) {
      val = val
        .slice(1, -1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }

    // Boolean attributes without values (e.g. <Badge dot>, <Button loading>) or "true"
    if (val === "" || val === "true" || val.toLowerCase() === attr.name.toLowerCase()) {
      val = true;
    } else if (val === "false") {
      val = false;
    } else if (!Number.isNaN(Number(val)) && val !== "") {
      val = Number(val);
    }

    if (name === "style" && typeof val === "string") {
      const styleObj: Record<string, string> = {};
      val.split(";").forEach((pair) => {
        const colon = pair.indexOf(":");
        if (colon !== -1) {
          const k = pair
            .slice(0, colon)
            .trim()
            .replace(/-([a-z])/g, (_, l) => l.toUpperCase());
          const v = pair.slice(colon + 1).trim();
          if (k && v) styleObj[k] = v;
        }
      });
      props.style = styleObj;
      continue;
    }

    if (/^on[a-z]/i.test(name)) {
      continue;
    }

    props[name] = val;
  }
  return props;
}

function domNodeToReact(
  node: Node,
  compMap: Map<string, React.ComponentType<any>>,
  key: string | number,
): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as Element;
  const tagLower = el.tagName.toLowerCase();

  // Filter child nodes: skip empty whitespace text nodes that contain newlines between element siblings
  const hasElementChildren = Array.from(el.childNodes).some((n) => n.nodeType === Node.ELEMENT_NODE);
  const childNodes = Array.from(el.childNodes).filter((child) => {
    if (hasElementChildren && child.nodeType === Node.TEXT_NODE) {
      return !/^\s*[\r\n]+\s*$/.test(child.textContent || "");
    }
    return true;
  });

  const children = childNodes
    .map((child, i) => domNodeToReact(child, compMap, i))
    .filter((child) => child !== null && child !== undefined);

  const Comp = compMap.get(tagLower);
  const { key: _k, ...props } = parseDomAttributes(el);

  // Copy buttons: the raw-HTML code blocks carry an inline `onclick` that
  // survives innerHTML, but card bodies are re-rendered as React. Re-attach
  // the same behavior so copy still works inside custom components.
  if (el.hasAttribute("data-clipboard-target") && typeof window !== "undefined") {
    props.onClick = () => {
      const copy = (window as any).__dmdCopyCode;
      if (typeof copy === "function") copy(el);
    };
  }

  if (Comp) {
    return React.createElement(
      Comp,
      { key, ...props },
      children.length > 0 ? (children.length === 1 ? children[0] : children) : undefined,
    );
  }

  // Standard HTML element
  return React.createElement(
    tagLower,
    { key, ...props },
    children.length > 0 ? (children.length === 1 ? children[0] : children) : undefined,
  );
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
    const compMap = new Map<string, React.ComponentType<any>>();
    for (const [k, comp] of Object.entries(registered)) {
      compMap.set(k.toLowerCase(), comp);
    }

    const isCustomComponent = (el: Element) => compMap.has(el.tagName.toLowerCase());

    const hasCustomComponentAncestor = (el: Element, container: Element) => {
      let parent = el.parentElement;
      while (parent && parent !== container) {
        if (isCustomComponent(parent)) return true;
        parent = parent.parentElement;
      }
      return false;
    };

    // Find root custom components only (outermost in DOM hierarchy)
    const allElements = containerRef.current.querySelectorAll("*");
    const rootCustomElements: Element[] = [];
    allElements.forEach((el) => {
      if (isCustomComponent(el) && !hasCustomComponentAncestor(el, containerRef.current!)) {
        rootCustomElements.push(el);
      }
    });

    for (const el of rootCustomElements) {
      const tagLower = el.tagName.toLowerCase();
      const isInline = INLINE_TAGS.has(tagLower);
      const mountPoint = document.createElement(isInline ? "span" : "div");
      mountPoint.className = "dmd-custom-component-wrapper";

      const reactEl = domNodeToReact(el, compMap, "root");
      el.replaceWith(mountPoint);

      const root = ReactDOM.createRoot(mountPoint);
      root.render(reactEl);
      rootsRef.current.push(root);
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
