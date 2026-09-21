<script lang="ts">
  import { doc } from "../doc-context.svelte";
  import { theme } from "../theme.svelte";
  import AppearanceMenu from "./AppearanceMenu.svelte";
  import OfflineDownloadButton from "./OfflineDownloadButton.svelte";

  const homeHref = $derived(
    doc.home ? (doc.home.kind === "href" ? (doc.home.href ?? "#/") : `#/${doc.home.slug}`) : "#/README",
  );
  const homeTitle = $derived(doc.home?.via === "ancestor" ? "Original documentation home" : "Documentation home");
  const config = $derived(doc.config);
  let isScrolled = $state(false);

  $effect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const scrolled = window.scrollY > 8;
        if (isScrolled !== scrolled) isScrolled = scrolled;
      });
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  });
</script>

<header class="dmd-navbar {isScrolled ? 'dmd-navbar-scrolled' : ''}">
  <div class="dmd-navbar-left">
    <button
      type="button"
      class="dmd-mobile-menu-btn"
      aria-label={doc.isMobileSidebarOpen ? "Close documentation navigation" : "Open documentation navigation"}
      aria-controls="dmd-sidebar"
      aria-expanded={doc.isMobileSidebarOpen}
      onclick={() => (doc.isMobileSidebarOpen = !doc.isMobileSidebarOpen)}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="18" y2="18" />
      </svg>
    </button>

    <a href={homeHref} class="dmd-brand">
      {#if config?.theme?.logo?.light}
        <img
          src={theme.resolvedMode === "dark" && config.theme?.logo?.dark ? config.theme.logo.dark : config.theme.logo.light}
          alt={config.theme?.logo?.alt || config.name}
          class="dmd-brand-logo"
        />
      {/if}
      <span class="dmd-brand-title">{config?.name}</span>
      {#if config?.version}<span class="dmd-brand-version">v{config.version}</span>{/if}
    </a>
  </div>

  <div class="dmd-navbar-center">
    {#if config?.search?.enabled !== false}
      <button
        type="button"
        class="dmd-search-trigger"
        aria-label={config?.search?.placeholder || "Search documentation"}
        onclick={() => (doc.isSearchOpen = true)}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span class="dmd-search-placeholder">{config?.search?.placeholder || "Search docs..."}</span>
        <span class="dmd-search-shortcut"><kbd class="dmd-kbd">⌘K</kbd></span>
      </button>
    {/if}
  </div>

  <div class="dmd-navbar-right">
    {#if doc.home}
      <a href={homeHref} class="dmd-social-btn dmd-home-btn" title={homeTitle}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </a>
    {/if}

    {#if config?.socials && config.socials.length > 0}
      <div class="dmd-social-links">
        {#each config.socials as social (social.url)}
          <a href={social.url} class="dmd-social-btn" title={social.label || social.type} target="_blank" rel="noopener noreferrer">
            {#if social.type === "github"}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
            {:else if social.type === "gitlab"}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m22 13.29-3.33-10a.42.42 0 0 0-.14-.18.38.38 0 0 0-.22-.11.39.39 0 0 0-.23.07.42.42 0 0 0-.14.18l-2.26 6.67H8.32L6.06 3.25a.42.42 0 0 0-.14-.18.38.38 0 0 0-.22-.11.39.39 0 0 0-.23.07.42.42 0 0 0-.14.18L2 13.29a.74.74 0 0 0 .27.83L12 21l9.69-6.88a.71.71 0 0 0 .31-.83Z" />
              </svg>
            {:else if social.type === "discord"}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="12" r="1" />
                <circle cx="15" cy="12" r="1" />
                <path d="M7.5 7.5c3.5-1 5.5-1 9 0 1.5 2 2.5 5 2.5 8.5-2 1.5-4 1.5-5.5 1.5l-.5-1c1-.5 1.5-1 1.5-1-1.5 1-3.5 1-6 1s-4.5 0-6-1c0 0 .5.5 1.5 1l-.5 1c-1.5 0-3.5 0-5.5-1.5 0-3.5 1-6.5 2.5-8.5Z" />
              </svg>
            {:else}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            {/if}
          </a>
        {/each}
      </div>
    {/if}

    <OfflineDownloadButton />
    <AppearanceMenu />

    <!-- Dark / Light Mode Switch -->
    <button
      type="button"
      class="dmd-theme-toggle-btn"
      onclick={() => theme.toggleMode()}
      title={`Switch to ${theme.resolvedMode === "dark" ? "light" : "dark"} mode`}
      aria-label={`Switch to ${theme.resolvedMode === "dark" ? "light" : "dark"} mode`}
    >
      {#if theme.resolvedMode === "dark"}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      {:else}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      {/if}
    </button>
  </div>
</header>