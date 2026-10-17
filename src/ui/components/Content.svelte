<script lang="ts">
  import { doc } from "../doc-context.svelte";
  import BreadcrumbItem from "./BreadcrumbItem.svelte";
  import MarkdownBody from "./MarkdownBody.svelte";
  import { localeLabel } from "../../runtime/i18n";

  let progressBarEl = $state<HTMLElement | null>(null);

  // Track scroll progress for the reading progress bar.
  // Performance: directly mutate CSS variable on progressBarEl rather than
  // triggering Svelte 5 component re-renders on every scroll tick.
  $effect(() => {
    let scrollTicking = false;
    let resizeTicking = false;
    let maxScroll = 0;

    const updateProgress = () => {
      scrollTicking = false;
      if (!progressBarEl) return;
      if (maxScroll <= 0) {
        progressBarEl.style.setProperty("--dmd-scroll-progress", "0");
        return;
      }
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      progressBarEl.style.setProperty("--dmd-scroll-progress", String(progress));
    };

    const measureHeight = () => {
      resizeTicking = false;
      maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      updateProgress();
    };

    const handleScroll = () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(updateProgress);
    };

    const handleResize = () => {
      if (resizeTicking) return;
      resizeTicking = true;
      requestAnimationFrame(measureHeight);
    };

    measureHeight();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  });

  const breadcrumbs = $derived(doc.currentSlug.split("/").filter(Boolean));
  const currentDoc = $derived(doc.currentDoc);
  const config = $derived(doc.viewConfig);

  const editUrl = $derived.by(() => {
    const slug = doc.currentSlug;
    let url = config?.editUrl;
    if (!url && config?.source?.type === "github" && config.source.repo) {
      const branch = config.source.branch || "main";
      const docsDir = config.source.docsDir ? `${config.source.docsDir.replace(/^\/+|\/+$/g, "")}/` : "";
      url = `https://github.com/${config.source.repo}/edit/${branch}/${docsDir}${doc.sourcePath || `${slug}.md`}`;
    }
    return url;
  });
</script>

{#if doc.isLoading}
  <main class="dmd-main-content" id="dmd-main-content" tabindex="-1">
    <div class="dmd-loading-skeleton" aria-label={doc.t("loading")} aria-busy="true">
      <!-- Breadcrumb shimmer -->
      <div class="dmd-skeleton-shimmer dmd-skeleton-header"></div>
      <!-- Article title shimmer -->
      <div class="dmd-skeleton-shimmer dmd-skeleton-title"></div>
      <!-- Meta badges shimmer -->
      <div class="dmd-skeleton-meta">
        <div class="dmd-skeleton-shimmer dmd-skeleton-badge"></div>
        <div class="dmd-skeleton-shimmer dmd-skeleton-badge"></div>
      </div>
      <!-- Lead paragraph shimmer -->
      <div class="dmd-skeleton-paragraph">
        <div class="dmd-skeleton-shimmer dmd-skeleton-line"></div>
        <div class="dmd-skeleton-shimmer dmd-skeleton-line w-90"></div>
        <div class="dmd-skeleton-shimmer dmd-skeleton-line w-80"></div>
        <div class="dmd-skeleton-shimmer dmd-skeleton-line w-60"></div>
      </div>
      <!-- Callout card shimmer -->
      <div class="dmd-skeleton-shimmer dmd-skeleton-card"></div>
      <!-- Code block shimmer -->
      <div class="dmd-skeleton-shimmer dmd-skeleton-code"></div>
      <!-- Follow-up paragraph shimmer -->
      <div class="dmd-skeleton-paragraph">
        <div class="dmd-skeleton-shimmer dmd-skeleton-line"></div>
        <div class="dmd-skeleton-shimmer dmd-skeleton-line w-90"></div>
        <div class="dmd-skeleton-shimmer dmd-skeleton-line w-40"></div>
      </div>
    </div>
  </main>
{:else if doc.error || !currentDoc}
  <main class="dmd-main-content" id="dmd-main-content" tabindex="-1">
    <div class="dmd-error-container">
      <div class="dmd-error-code">!</div>
      <h2 class="dmd-error-title">{doc.error || "This page is unavailable."}</h2>
      <p class="dmd-error-desc">
        Return to the overview, then choose another page from the documentation index.
      </p>
      <button type="button" class="dmd-btn-primary" onclick={() => doc.navigate("README")}>
        Return to Overview
      </button>
      {#if doc.error === doc.t("unavailable")}
        <button type="button" class="dmd-btn-primary" onclick={() => doc.selectLocale(config?.i18n?.defaultLocale ?? "en")}>
          {doc.t("original")}
        </button>
      {/if}
    </div>
  </main>
{:else}
  <!-- Reading progress bar -->
  {#if doc.isNavigating}
    <div class="dmd-nav-progress" role="progressbar" aria-label="Loading page"></div>
  {/if}
  <div class="dmd-progress-bar" bind:this={progressBarEl} aria-hidden="true"></div>

  <main class="dmd-main-content" id="dmd-main-content" tabindex="-1">
    <!-- Breadcrumbs & Metadata Bar -->
    <div
      class="dmd-content-header"
      class:dmd-header-scrolled={doc.isScrolled}
    >
      <nav class="dmd-breadcrumbs" aria-label="Breadcrumb">
        <BreadcrumbItem label="Docs" index={0} isHome={true} isScrolled={!doc.isScrolled} />
        {#each breadcrumbs as crumb, idx (idx)}
          <span class="dmd-crumb-sep">/</span>
          <BreadcrumbItem
            label={crumb}
            index={idx + 1}
            isLast={idx === breadcrumbs.length - 1}
            isScrolled={!doc.isScrolled}
          />
        {/each}
      </nav>

      <div class="dmd-content-meta">
        {#if currentDoc.readingTimeMinutes}
          <span class="dmd-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{currentDoc.readingTimeMinutes} min read</span>
          </span>
        {/if}
        {#if currentDoc.frontmatter?.category}
          <span class="dmd-meta-item dmd-meta-category">{currentDoc.frontmatter.category}</span>
        {/if}
        {#if currentDoc.frontmatter?.tags && currentDoc.frontmatter.tags.length > 0}
          {#each currentDoc.frontmatter.tags as tag (tag)}
            <button
              type="button"
              class="dmd-meta-tag dmd-clickable-tag"
              title="View documents tagged with #{tag}"
              aria-label="View documents tagged with #{tag}"
              onclick={() => doc.openTagModal(tag)}
            >
              #{tag}
            </button>
          {/each}
        {/if}
        {#if doc.editorAvailable}
          <button
            type="button"
            class="dmd-meta-edit-btn"
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
    </div>

    <!-- Markdown Rendered Content -->
    {#if doc.contentLocale !== doc.locale}
      <p role="status" lang={doc.locale}>{doc.t("unavailable")}. {doc.t("fallback")} {localeLabel(doc.contentLocale, config)}.</p>
    {/if}
    <article class="dmd-article" lang={doc.contentLocale}>
      <!-- A route change replaces generated Markdown placeholders. The keyed
           block remounts the body so custom elements mount against that DOM. -->
      {#key currentDoc.slug}
        <MarkdownBody html={currentDoc.html} onNavigate={(slug: string, anchor?: string) => doc.navigate(slug, anchor ?? "")} />
      {/key}
    </article>

    <!-- Edit on GitHub Link -->
    {#if editUrl}
      <div class="dmd-edit-page-container">
        <a href={editUrl} target="_blank" rel="noopener noreferrer" class="dmd-edit-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
          <span>Edit this page on GitHub</span>
        </a>
      </div>
    {/if}

    <!-- Next / Prev Navigation Cards -->
    <div class="dmd-page-nav">
      {#if doc.prevDoc}
        <button type="button" class="dmd-page-nav-card prev" onclick={() => doc.navigate(doc.prevDoc!.slug)}>
          <span class="dmd-page-nav-sub">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Previous
          </span>
          <span class="dmd-page-nav-title">{doc.prevDoc.title}</span>
        </button>
      {:else}
        <div></div>
      {/if}

      {#if doc.nextDoc}
        <button type="button" class="dmd-page-nav-card next" onclick={() => doc.navigate(doc.nextDoc!.slug)}>
          <span class="dmd-page-nav-sub">
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
          <span class="dmd-page-nav-title">{doc.nextDoc.title}</span>
        </button>
      {:else}
        <div></div>
      {/if}
    </div>

    <!-- Footer -->
    <footer class="dmd-footer">
      {#if config?.footer?.copyright}
        <p class="dmd-footer-copy">{config.footer.copyright}</p>
      {/if}
      {#if config?.footer?.showBuiltWith !== false}
        <p class="dmd-footer-builtwith">
          Documented with
          <a
            href={doc.router ? doc.router.resolveLink("DMD", doc.currentSlug) : "#/DMD"}
            onclick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey) return;
              e.preventDefault();
              doc.navigate("DMD");
            }}
          >DocMeDown</a>
          ⚡
        </p>
      {/if}
    </footer>
  </main>
{/if}