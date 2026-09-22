<script lang="ts">
  import {
    getEmbeddedNestedSites,
    isRelativeHtmlLink,
    isSelfContainedOffline,
    matchEmbeddedNestedSite,
    notifyUnavailableOfflineLink,
    openEmbeddedNestedSite,
  } from "../../runtime/offline-export";
  import { ComponentRegistry } from "../registry";

  let {
    html,
    onNavigate,
  }: {
    html: string;
    onNavigate?: (slug: string, anchor: string) => void;
  } = $props();

  let container: HTMLDivElement;

  /**
   * Renames PascalCase markdown component tags onto registered custom
   * element names so the browser upgrades them natively (nested component
   * trees included), and mounts the Mermaid viewer onto diagram placeholders.
   *
   * Processes elements in reverse document order (children before parents)
   * so that when a container CE initializes (e.g. <dmd-tabs> fires
   * slotchange), its children are already upgraded to their registered
   * custom element tags (e.g. <dmd-tab>).
   */
  function upgradeCustomComponents(root: HTMLElement) {
    const registry = ComponentRegistry.getInstance();

    // Collect only elements that resolve to a registered component. A
    // TreeWalker walks the tree lazily instead of snapshotting every node the
    // way querySelectorAll("*") does, so a large article that is mostly plain
    // markup pays for its components, not for every element. Candidates keep
    // document order; the reverse pass below then upgrades children before
    // their parents (so a container custom element observes already-upgraded
    // child slots when it initializes).
    const candidates: Array<{ el: HTMLElement; tag: string }> = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const el = node as HTMLElement;
      // Never upgrade internal elements inside code blocks, pre tags, or diagrams
      if (el.closest?.(".dmd-code-block-wrapper, pre, .dmd-diagram-host")) continue;
      if (el.classList?.contains("dmd-copy-btn") || el.classList?.contains("dmd-copy-selected-btn")) continue;
      if (el.hasAttribute?.("data-dmd-copy") || el.hasAttribute?.("data-dmd-copy-selected")) continue;

      const tag = registry.resolveTag(el.tagName.toLowerCase());
      if (tag) candidates.push({ el, tag });
    }

    for (let i = candidates.length - 1; i >= 0; i--) {
      const { el, tag } = candidates[i];
      if (el.tagName.toLowerCase() === tag) continue;

      const replacement = document.createElement(tag);
      for (const attr of Array.from(el.attributes)) {
        // React-style literals (`cols={3}`, `defaultOpen={true}`) reach the DOM
        // as literal `{3}` attribute values (unquoted HTML attribute parsing).
        // Normalize them onto plain HTML strings/booleans so custom element
        // property converters read real values instead of NaN/true-by-accident.
        const brace = /^\{([^{}]*)\}$/.exec(attr.value);
        if (brace) {
          const literal = brace[1].trim();
          if (/^(false|null|undefined)$/i.test(literal)) continue; // omit → property false
          replacement.setAttribute(attr.name, literal.toLowerCase() === "true" ? "" : literal);
          continue;
        }
        replacement.setAttribute(attr.name, attr.value);
      }
      while (el.firstChild) {
        replacement.appendChild(el.firstChild);
      }
      el.replaceWith(replacement);
    }

    // Mermaid fences arrive as encoded placeholder hosts; the diagram viewer
    // is itself a custom element, so mounting is a tag rename.
    for (const host of Array.from(root.querySelectorAll<HTMLElement>(".dmd-diagram-host"))) {
      const encoded = host.getAttribute("data-dmd-diagram");
      if (!encoded) continue;
      const viewer = document.createElement("dmd-mermaid");
      viewer.setAttribute("source", encoded);
      host.replaceWith(viewer);
    }
  }

  // Self-contained offline copies mark the file links they cannot fulfill so
  // they read as disabled instead of failing with a browser navigation error.
  function markOfflineLinks() {
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
  }

  const copyResetTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

  /**
   * Copies a code block to the clipboard and flips the button into a success
   * (or failure) state for two seconds. Falls back to a hidden textarea +
   * execCommand for non-secure contexts (offline `file://` copies) where the
   * async Clipboard API is unavailable.
   *
   * Reconstructs the source text by joining each `.dmd-code-line` element's
   * textContent with "\n" — this is necessary because line spans no longer
   * contain trailing "\n" characters (CSS `display: block` provides visual
   * separation instead).
   */
  async function copyCodeBlock(button: HTMLElement, selectedOnly = false) {
    const wrapper = button.closest(".dmd-code-block-wrapper");
    if (!wrapper) return;

    const selector = selectedOnly ? ".dmd-code-line-active" : ".dmd-code-line";
    const lineEls = wrapper.querySelectorAll<HTMLElement>(selector);
    if (!lineEls.length) return;
    const text = Array.from(lineEls)
      .map((el) => el.textContent ?? "")
      .join("\n");

    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        copied = document.execCommand("copy");
      } finally {
        textarea.remove();
      }
    }

    clearTimeout(copyResetTimers.get(button));
    button.classList.toggle("copied", copied);
    button.title = copied ? "Copied!" : "Failed";
    copyResetTimers.set(
      button,
      setTimeout(() => {
        button.classList.remove("copied");
        button.title = selectedOnly ? "Copy highlighted lines" : "Copy code";
      }, 2000),
    );
  }

  $effect(() => {
    // Track html so the effect re-runs when the route replaces the article.
    void html;
    if (!container) return;
    upgradeCustomComponents(container);
    markOfflineLinks();
  });

  // Handle internal markdown link clicks smoothly
  function handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // Code block copy buttons (delegated: rendered markdown is static HTML)
    const copySelected = target.closest?.("[data-dmd-copy-selected]");
    if (copySelected) {
      event.preventDefault();
      void copyCodeBlock(copySelected, true);
      return;
    }
    const copyButton = target.closest?.("[data-dmd-copy]");
    if (copyButton) {
      event.preventDefault();
      void copyCodeBlock(copyButton, false);
      return;
    }

    const anchor = target.closest("a");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    // External link or protocol
    if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) {
      return;
    }

    // Self-contained offline copies never navigate to external files: embedded
    // nested documentation opens from inside this file, everything else is
    // reported as unavailable instead of failing with ERR_FILE_NOT_FOUND.
    if (isSelfContainedOffline() && isRelativeHtmlLink(href)) {
      event.preventDefault();
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

    // Handle hash routes (the markdown pipeline emits `#/slug#anchor` links)
    if (href.startsWith("#/")) {
      event.preventDefault();
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
  }
</script>

<!-- A route change replaces generated Markdown placeholders; the keyed parent
     in App.svelte remounts this component so custom elements mount fresh. -->
<div
  class="dmd-markdown-body"
  role="none"
  bind:this={container}
  onclick={handleClick}
  onkeydown={(event: KeyboardEvent) => {
    // Enter key on links navigates them
    if (event.key === "Enter") handleClick(event as unknown as MouseEvent);
  }}
>
  {@html html}
</div>