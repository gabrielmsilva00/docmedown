<script lang="ts">
  import { untrack } from "svelte";
  import { doc } from "../doc-context.svelte";
  import { theme } from "../theme.svelte";
  import AppearanceMenu from "./AppearanceMenu.svelte";
  import LanguageMenu from "./LanguageMenu.svelte";
  import BreadcrumbItem from "./BreadcrumbItem.svelte";
  import OfflineDownloadButton from "./OfflineDownloadButton.svelte";

  const homeHref = $derived(
    doc.home ? (doc.home.kind === "href" ? (doc.home.href ?? "#/") : `#/${doc.home.slug}`) : "#/README",
  );
  const homeTitle = $derived(doc.home?.via === "ancestor" ? "Original documentation home" : "Documentation home");
  const config = $derived(doc.viewConfig);
  const isScrolled = $derived(doc.isScrolled);

  const breadcrumbs = $derived.by(() => {
    const slug = doc.currentSlug;
    if (!slug) return [];
    return slug.split("/").filter(Boolean);
  });

  let searchBarEl = $state<HTMLElement | null>(null);
  let routeBarEl = $state<HTMLElement | null>(null);
  // Search bar and route bar both use reversible CSS transitions
  let routeLockTimeout: ReturnType<typeof setTimeout> | null = null;
  let isFirstNavbarAnim = true;
  let lastAnimScrolled: boolean | null = null;

  const checkIsMac = () => {
    if (typeof navigator === "undefined") return false;
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = nav.userAgentData?.platform || nav.platform || "";
    const userAgent = nav.userAgent || "";
    return /^mac/i.test(platform) || /macintosh|mac os x/i.test(userAgent);
  };

  let isMac = $state(checkIsMac());

  $effect(() => {
    isMac = checkIsMac();
  });

  const searchShortcut = $derived(isMac ? "⌘K" : "Ctrl K");

  const resolvedPlaceholder = $derived.by(() => {
    const raw = config?.i18n ? config.i18n.locales.find((item) => item.code === doc.locale)?.overrides?.search?.placeholder || doc.t("search") : config?.search?.placeholder || "Search docs...";
    if (isMac) {
      return raw.replace(/Ctrl\+?K/gi, "⌘K");
    }
    return raw.replace(/⌘K/g, "Ctrl K").replace(/⌘/g, "Ctrl");
  });

  const searchAriaLabel = $derived.by(() => {
    const base = resolvedPlaceholder;
    if (base.includes(searchShortcut)) return base;
    return `${base} (${searchShortcut})`;
  });

  $effect(() => {
    let ticking = false;
    let threshold = 50;

    const measureThreshold = () => {
      const headerEl = document.querySelector(".dmd-content-header") as HTMLElement | null;
      const navEl = document.querySelector(".dmd-navbar") as HTMLElement | null;
      const navHeight = navEl ? navEl.offsetHeight : 56;
      if (headerEl) {
        const docTop = headerEl.getBoundingClientRect().top + window.scrollY;
        threshold = Math.max(30, Math.round(docTop - navHeight + 8));
      } else {
        const mainEl = document.querySelector(".dmd-main-content") as HTMLElement | null;
        if (mainEl) {
          const docTop = mainEl.getBoundingClientRect().top + window.scrollY;
          threshold = Math.max(30, Math.round(docTop - navHeight + 8));
        } else {
          threshold = 50;
        }
      }
    };

    const updateScroll = () => {
      ticking = false;
      const y = window.scrollY;
      const currentlyScrolled = untrack(() => doc.isScrolled);
      const nextScrolled = currentlyScrolled ? y >= threshold - 20 : y >= threshold;
      if (currentlyScrolled !== nextScrolled) {
        doc.isScrolled = nextScrolled;
      }
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateScroll);
    };

    measureThreshold();
    updateScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", measureThreshold, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", measureThreshold);
    };
  });

  $effect(() => {
    // When slug or document loading state changes, re-measure threshold after paint
    doc.currentSlug;
    doc.isLoading;
    requestAnimationFrame(() => {
      const headerEl = document.querySelector(".dmd-content-header") as HTMLElement | null;
      const navEl = document.querySelector(".dmd-navbar") as HTMLElement | null;
      const navHeight = navEl ? navEl.offsetHeight : 56;
      let th = 50;
      if (headerEl) {
        th = Math.max(30, Math.round(headerEl.getBoundingClientRect().top + window.scrollY - navHeight + 8));
      }
      doc.isScrolled = window.scrollY >= th;
    });
  });

  // Smooth cinematic transitions between full search bar and unrolled route bar
  $effect(() => {
    const isNowScrolled = isScrolled && !!doc.currentDoc;
    if (!routeBarEl || !searchBarEl) return;

    if (isFirstNavbarAnim) {
      isFirstNavbarAnim = false;
      lastAnimScrolled = isNowScrolled;
      if (!isNowScrolled) {
        routeBarEl.style.opacity = "0";
        routeBarEl.style.clipPath = "inset(0 100% 0 0)";
        routeBarEl.style.pointerEvents = "none";
        routeBarEl.removeAttribute("data-visible");
        searchBarEl.removeAttribute("data-collapsed");
        searchBarEl.style.removeProperty("max-width");
      } else {
        // Snap to visible with no transition on first render
        routeBarEl.style.transition = "none";
        routeBarEl.setAttribute("data-visible", "true");
        routeBarEl.style.opacity = "1";
        routeBarEl.style.clipPath = "inset(0 0% 0 0)";
        routeBarEl.style.pointerEvents = "auto";
        requestAnimationFrame(() => {
          if (routeBarEl) routeBarEl.style.removeProperty("transition");
        });
        // Snap search bar to collapsed with no transition on first render
        searchBarEl.style.transition = "none";
        searchBarEl.setAttribute("data-collapsed", "true");
        searchBarEl.style.removeProperty("max-width");
        requestAnimationFrame(() => {
          if (searchBarEl) searchBarEl.style.removeProperty("transition");
        });
      }
      return;
    }

    // Skip if state has not genuinely transitioned
    if (isNowScrolled === lastAnimScrolled) {
      return;
    }
    lastAnimScrolled = isNowScrolled;

    // Cancel any in-flight transitions / timeouts
    if (routeLockTimeout !== null) {
      clearTimeout(routeLockTimeout);
      routeLockTimeout = null;
    }

    if (isNowScrolled) {
      // ── Search bar: collapse via CSS transition in main.css ──────────────
      searchBarEl.style.removeProperty("max-width");
      searchBarEl.setAttribute("data-collapsed", "true");

      // ── Route bar: unroll left-to-right via CSS transition ───────────────
      routeBarEl.style.pointerEvents = "auto";
      routeBarEl.removeAttribute("data-visible");
      routeBarEl.style.removeProperty("transition");
      routeBarEl.style.clipPath = "inset(0 0% 0 0)";
      routeBarEl.style.opacity = "1";

      routeLockTimeout = setTimeout(() => {
        routeLockTimeout = null;
        if (routeBarEl && doc.isScrolled && doc.currentDoc) {
          routeBarEl.setAttribute("data-visible", "true");
          routeBarEl.style.removeProperty("clip-path");
          routeBarEl.style.removeProperty("opacity");
        }
      }, 260);
    } else {
      // ── Search bar: expand via CSS transition in main.css ────────────────
      searchBarEl.style.removeProperty("max-width");
      searchBarEl.removeAttribute("data-collapsed");

      // ── Route bar: roll right-to-left via CSS transition ─────────────────
      routeBarEl.style.pointerEvents = "none";
      routeBarEl.removeAttribute("data-visible");
      routeBarEl.style.removeProperty("transition");
      routeBarEl.style.clipPath = "inset(0 100% 0 0)";
      routeBarEl.style.opacity = "0";

      routeLockTimeout = setTimeout(() => {
        routeLockTimeout = null;
        if (routeBarEl && !doc.isScrolled) {
          routeBarEl.style.clipPath = "inset(0 100% 0 0)";
          routeBarEl.style.opacity = "0";
        }
      }, 260);
    }

    return () => {
      if (routeLockTimeout !== null) {
        clearTimeout(routeLockTimeout);
        routeLockTimeout = null;
      }
    };
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

  <div class="dmd-navbar-center" class:has-route={isScrolled && doc.currentDoc}>
    <!-- Search bar: wide when at top, smoothly collapses to the side into the compact search icon.
         data-collapsed is set by JS ONLY after the animation finishes — never toggled reactively. -->
    <div
      bind:this={searchBarEl}
      class="dmd-navbar-search-full"
      aria-hidden={false}
    >
      {#if config?.search?.enabled !== false}
        <button
          type="button"
          class="dmd-search-trigger"
          tabindex={0}
          aria-label={searchAriaLabel}
          title={isScrolled && doc.currentDoc ? searchAriaLabel : undefined}
          onclick={() => (doc.isSearchOpen = true)}
        >
          <svg class="dmd-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span class="dmd-search-placeholder">{resolvedPlaceholder}</span>
          <span class="dmd-search-shortcut"><kbd class="dmd-kbd">{searchShortcut}</kbd></span>
        </button>
      {/if}
    </div>

    <!-- Scrolled route, tags: unrolls left-to-right as search bar collapses.
         data-visible is set by JS ONLY after the WAAPI animation finishes — never toggled reactively. -->
    <div
      bind:this={routeBarEl}
      class="dmd-navbar-route-bar"
      aria-hidden={!isScrolled || !doc.currentDoc}
    >
      <nav class="dmd-nav-breadcrumbs" aria-label="Breadcrumb">
        <BreadcrumbItem label="Docs" index={0} isHome={true} isScrolled={isScrolled} />
        {#each breadcrumbs as crumb, idx (idx)}
          <span class="dmd-nav-crumb-sep">/</span>
          <BreadcrumbItem
            label={crumb}
            index={idx + 1}
            isLast={idx === breadcrumbs.length - 1}
            isScrolled={isScrolled}
          />
        {/each}
      </nav>

      {#if doc.currentDoc}
        <div class="dmd-nav-meta">
          {#if doc.currentDoc.readingTimeMinutes}
            <span class="dmd-nav-meta-item dmd-meta-item" title="Reading time">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{doc.currentDoc.readingTimeMinutes} min read</span>
            </span>
          {/if}
          {#if doc.currentDoc.frontmatter?.category}
            <span class="dmd-nav-meta-item dmd-meta-item dmd-meta-category">{doc.currentDoc.frontmatter.category}</span>
          {/if}
          {#if doc.currentDoc.frontmatter?.tags && doc.currentDoc.frontmatter.tags.length > 0}
            {@const allTags = doc.currentDoc.frontmatter.tags}
            {@const maxNavbarTags = allTags.length > 2 ? 1 : 2}
            {@const visibleTags = allTags.slice(0, maxNavbarTags)}
            {@const remainingCount = allTags.length - visibleTags.length}
            {#each visibleTags as tag (tag)}
              <button
                type="button"
                class="dmd-nav-meta-tag dmd-meta-tag dmd-clickable-tag"
                tabindex={isScrolled ? 0 : -1}
                title="View documents tagged with #{tag}"
                aria-label="View documents tagged with #{tag}"
                onclick={() => doc.openTagModal(tag)}
              >
                #{tag}
              </button>
            {/each}
            {#if remainingCount > 0}
              <button
                type="button"
                class="dmd-nav-meta-tag dmd-meta-tag dmd-clickable-tag dmd-nav-meta-tag-more"
                tabindex={isScrolled ? 0 : -1}
                title={`View all ${allTags.length} tags for this document`}
                aria-label={`View ${remainingCount} more tags`}
                onclick={() => doc.openTagModal(allTags[1] || allTags[0])}
              >
                +{remainingCount}
              </button>
            {/if}
          {/if}
          {#if doc.editorAvailable}
            <button
              type="button"
              class="dmd-meta-edit-btn"
              tabindex={isScrolled ? 0 : -1}
              title="Edit this document (Ctrl+E / ⌘E)"
              aria-label="Edit document in 2-way editor"
              onclick={() => (doc.isEditorOpen = true)}
            >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span>Edit</span>
            </button>
          {/if}
        </div>
      {/if}
    </div>
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

    <button
      type="button"
      class="dmd-social-btn dmd-edit-btn"
      title="Edit markdown (Ctrl+E / ⌘E)"
      aria-label="Edit markdown"
      onclick={() => (doc.isEditorOpen = true)}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    </button>

    <OfflineDownloadButton />
    <AppearanceMenu />
    <LanguageMenu />

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