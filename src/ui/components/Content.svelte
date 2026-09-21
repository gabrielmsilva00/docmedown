<script lang="ts">
  import { doc } from "../doc-context.svelte";
  import MarkdownBody from "./MarkdownBody.svelte";

  let scrollProgress = $state(0);

  // Track scroll progress for the reading progress bar.
  // Performance: the scroll event fires far more often than frames, and
  // `scrollHeight` is a forced layout read — both are avoided by scheduling
  // one update per animation frame and measuring the scrollable height only
  // on resize (batched reads, no per-event layout work).
  $effect(() => {
    let scrollTicking = false;
    let resizeTicking = false;
    let maxScroll = 0;

    const updateProgress = () => {
      scrollTicking = false;
      if (maxScroll <= 0) {
        scrollProgress = 0;
        return;
      }
      scrollProgress = Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100));
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
  const config = $derived(doc.config);

  const editUrl = $derived.by(() => {
    const slug = doc.currentSlug;
    let url = config?.editUrl;
    if (!url && config?.source?.type === "github" && config.source.repo) {
      const branch = config.source.branch || "main";
      const docsDir = config.source.docsDir ? `${config.source.docsDir.replace(/^\/+|\/+$/g, "")}/` : "";
      url = `https://github.com/${config.source.repo}/edit/${branch}/${docsDir}${slug}.md`;
    }
    return url;
  });
</script>

{#if doc.isLoading}
  <main class="dmd-main-content">
    <div class="dmd-loading-skeleton">
      <div class="dmd-skeleton-title"></div>
      <div class="dmd-skeleton-line"></div>
      <div class="dmd-skeleton-line"></div>
      <div class="dmd-skeleton-line short"></div>
    </div>
  </main>
{:else if doc.error || !currentDoc}
  <main class="dmd-main-content">
    <div class="dmd-error-container">
      <div class="dmd-error-code">!</div>
      <h2 class="dmd-error-title">{doc.error || "This page is unavailable."}</h2>
      <p class="dmd-error-desc">
        Return to the overview, then choose another page from the documentation index.
      </p>
      <button type="button" class="dmd-btn-primary" onclick={() => doc.navigate("README")}>
        Return to Overview
      </button>
    </div>
  </main>
{:else}
  <!-- Reading progress bar -->
  {#if doc.isNavigating}
    <div class="dmd-nav-progress" role="progressbar" aria-label="Loading page"></div>
  {/if}
  <div class="dmd-progress-bar" style="--dmd-scroll-progress: {scrollProgress / 100}" aria-hidden="true"></div>

  <main class="dmd-main-content">
    <!-- Breadcrumbs & Metadata Bar -->
    <div class="dmd-content-header">
      <nav class="dmd-breadcrumbs" aria-label="Breadcrumb">
        <button
          type="button"
          class="dmd-crumb"
          onclick={() => doc.navigate(doc.home?.kind === "route" && doc.home.slug ? doc.home.slug : "README")}
        >
          Docs
        </button>
        {#each breadcrumbs as crumb, idx (idx)}
          <span class="dmd-crumb-sep">/</span>
          <span class="dmd-crumb {idx === breadcrumbs.length - 1 ? "current" : ""}">
            {crumb.replace(/[-_]/g, " ")}
          </span>
        {/each}
      </nav>

      <div class="dmd-content-meta">
        {#if currentDoc.readingTimeMinutes}
          <span class="dmd-meta-item">☕ {currentDoc.readingTimeMinutes} min read</span>
        {/if}
        {#if currentDoc.frontmatter?.category}
          <span class="dmd-meta-item">{currentDoc.frontmatter.category}</span>
        {/if}
        {#if currentDoc.frontmatter?.tags && currentDoc.frontmatter.tags.length > 0}
          {#each currentDoc.frontmatter.tags as tag (tag)}
            <span class="dmd-meta-tag">#{tag}</span>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Markdown Rendered Content -->
    <article class="dmd-article">
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
          <a href="https://github.com" target="_blank" rel="noreferrer">DocMeDown</a>
          ⚡
        </p>
      {/if}
    </footer>
  </main>
{/if}