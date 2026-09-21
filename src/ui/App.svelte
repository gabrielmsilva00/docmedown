<script lang="ts">
  // KaTeX base styles load before project styles so DocMeDown's math overrides
  // (in main.css) win on equal specificity. Imported as a module (rather than
  // @import inside main.css) so vite.config.mts can prune the legacy woff/ttf
  // font sources KaTeX ships alongside woff2 — see pruneLegacyKatexFonts.
  import "katex/dist/katex.min.css";
  import "../runtime/styles/main.css";
  import Content from "./components/Content.svelte";
  import Navbar from "./components/Navbar.svelte";
  import OfflineNotice from "./components/OfflineNotice.svelte";
  import SearchModal from "./components/SearchModal.svelte";
  import Sidebar from "./components/Sidebar.svelte";
  import TableOfContents from "./components/TableOfContents.svelte";
  import { doc } from "./doc-context.svelte";
  import { theme } from "./theme.svelte";
  import { dismissSplash } from "../runtime/splash";

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  $effect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        doc.isSearchOpen = !doc.isSearchOpen;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Mirrors the resolved theme onto <html> so global tokens, Mermaid palettes,
  // and third-party styles can react to family/mode/density switches.
  //
  // Every write is diffed against the live DOM first. A no-op setAttribute or
  // setProperty still dirties style and wakes <html> observers (the Mermaid
  // viewer re-renders on these attributes), so a density-only switch must not
  // rewrite the theme attributes or the inline accent — only the true token
  // swap should invalidate the document. A color-affecting switch also flags
  // <html> for the duration so the change stays a single canvas crossfade
  // instead of a per-element transition storm (see main.css).
  let themeSwitchTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const root = document.documentElement;
    const setAttribute = (name: string, value: string) => {
      if (root.getAttribute(name) !== value) root.setAttribute(name, value);
    };
    const setStyleProperty = (name: string, value: string | undefined) => {
      if (value) {
        if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
      } else if (root.style.getPropertyValue(name)) {
        root.style.removeProperty(name);
      }
    };

    const modeChanged = root.getAttribute("data-dmd-mode") !== theme.resolvedMode;
    const familyChanged = root.getAttribute("data-dmd-theme") !== theme.family;
    // Keep this attribute through the migration because third-party themes and
    // Mermaid configuration read it directly.
    const resolvedAccent =
      theme.resolvedMode === "dark" ? theme.accentColorDark || theme.accentColor : theme.accentColor;
    const accentChanged = (root.style.getPropertyValue("--dmd-accent") || undefined) !== resolvedAccent;

    if (modeChanged || familyChanged || accentChanged) {
      root.classList.add("dmd-theme-switching");
      clearTimeout(themeSwitchTimer);
      themeSwitchTimer = setTimeout(() => root.classList.remove("dmd-theme-switching"), 220);
    }

    setAttribute("data-dmd-mode", theme.resolvedMode);
    setAttribute("data-dmd-theme", theme.family);
    setAttribute("data-dmd-density", theme.density);
    setAttribute("data-theme", theme.resolvedMode);
    // Config-driven brand color: applied as an inline override so it wins over
    // family tokens without mutating the token layer itself.
    setStyleProperty("--dmd-accent", resolvedAccent);
    setStyleProperty("--dmd-accent-hover", resolvedAccent);
  });

  // The generated shells ship an inline splash so the first paint is branded
  // rather than blank. Retire it once the first document (or an error state) is
  // on screen, so the reader never sees the in-app loading skeleton first.
  $effect(() => {
    if (doc.currentDoc || doc.error) dismissSplash();
  });
</script>

<div class="dmd-root">
  <Navbar />

  <div class="dmd-layout-body">
    <Sidebar />

    <div class="dmd-main-wrapper">
      <Content />
      {#if doc.currentDoc && doc.currentDoc.headings.length > 0}
        {#key doc.currentSlug}
          <TableOfContents headings={doc.currentDoc.headings} currentSlug={doc.currentSlug} />
        {/key}
      {/if}
    </div>
  </div>

  <SearchModal
    isOpen={doc.isSearchOpen}
    onClose={() => (doc.isSearchOpen = false)}
    searchIndex={doc.searchIndex}
    onSelect={(slug: string) => doc.navigate(slug)}
    placeholder={doc.config?.search?.placeholder}
  />

  <OfflineNotice />
</div>