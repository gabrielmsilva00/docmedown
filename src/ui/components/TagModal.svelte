<script lang="ts">
  import { doc } from "../doc-context.svelte";

  let searchQuery = $state("");
  let modalElement = $state<HTMLElement | null>(null);

  const activeTag = $derived(doc.activeTagModal || "");
  const matchingDocs = $derived.by(() => {
    if (!activeTag) return [];
    const list = doc.getDocsWithTag(activeTag);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.slug.toLowerCase().includes(q) ||
      d.frontmatter?.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const allTags = $derived(doc.getAllTags());

  function handleClose() {
    doc.closeTagModal();
    searchQuery = "";
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      handleClose();
    }
  }

  function selectDoc(slug: string) {
    handleClose();
    doc.navigate(slug);
  }

  function selectTag(newTag: string) {
    searchQuery = "";
    doc.openTagModal(newTag);
  }

  $effect(() => {
    if (!doc.activeTagModal) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalElement && !modalElement.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  });
</script>

{#if doc.activeTagModal}
  <div
    class="dmd-modal-backdrop dmd-tag-modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-label="Documents tagged with #{activeTag}"
    tabindex="-1"
    onkeydown={handleKeyDown}
  >
    <div class="dmd-tag-modal" bind:this={modalElement}>
      <div class="dmd-tag-modal-header">
        <div class="dmd-tag-modal-title-wrap">
          <div class="dmd-tag-pill-large">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span>#{activeTag}</span>
          </div>
          <div>
            <h2 class="dmd-tag-modal-title">Documents tagged with #{activeTag}</h2>
            <p class="dmd-tag-modal-sub">
              {matchingDocs.length} {matchingDocs.length === 1 ? 'matching document' : 'matching documents'} found
            </p>
          </div>
        </div>
        <button
          type="button"
          class="dmd-tag-modal-close"
          aria-label="Close tag modal"
          onclick={handleClose}
        >
          ×
        </button>
      </div>

      {#if doc.getDocsWithTag(activeTag).length > 3}
        <div class="dmd-tag-filter-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            class="dmd-tag-filter-input"
            placeholder="Filter tagged documents..."
            bind:value={searchQuery}
          />
        </div>
      {/if}

      <div class="dmd-tag-modal-body">
        {#if matchingDocs.length > 0}
          <div class="dmd-tag-doc-grid">
            {#each matchingDocs as item (item.slug)}
              <div
                class="dmd-tag-doc-card"
                class:is-current={item.slug === doc.currentSlug}
                role="button"
                tabindex="0"
                onclick={() => selectDoc(item.slug)}
                onkeydown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectDoc(item.slug);
                  }
                }}
              >
                <div class="dmd-tag-card-head">
                  <span class="dmd-tag-card-title">{item.title}</span>
                  {#if item.slug === doc.currentSlug}
                    <span class="dmd-tag-current-badge">Current Page</span>
                  {/if}
                </div>
                <div class="dmd-tag-card-route">{item.slug}</div>
                <div class="dmd-tag-card-meta">
                  {#if item.readingTimeMinutes}
                    <span class="dmd-tag-card-time">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {item.readingTimeMinutes} min read
                    </span>
                  {/if}
                  {#if item.category || item.frontmatter?.category}
                    <span class="dmd-tag-card-cat">{item.category || item.frontmatter?.category}</span>
                  {/if}
                </div>
                {#if item.frontmatter?.tags && item.frontmatter.tags.length > 0}
                  <div class="dmd-tag-card-tags">
                    {#each item.frontmatter.tags as t (t)}
                      <button
                        type="button"
                        class="dmd-tag-card-chip"
                        class:highlight={t.toLowerCase() === activeTag.toLowerCase()}
                        title="Explore documents tagged with #{t}"
                        onclick={(e) => {
                          e.stopPropagation();
                          selectTag(t);
                        }}
                      >
                        #{t}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <div class="dmd-tag-empty">
            <p>No documents found matching "{searchQuery}" under #{activeTag}.</p>
          </div>
        {/if}
      </div>

      {#if allTags.length > 1}
        <div class="dmd-tag-modal-footer">
          <span class="dmd-tag-footer-label">Explore related tags:</span>
          <div class="dmd-tag-chips-scroll">
            {#each allTags.slice(0, 12) as tagItem (tagItem.tag)}
              <button
                type="button"
                class="dmd-tag-footer-chip"
                class:active={tagItem.tag.toLowerCase() === activeTag.toLowerCase()}
                onclick={() => selectTag(tagItem.tag)}
              >
                #{tagItem.tag} <span class="dmd-tag-count">({tagItem.count})</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
