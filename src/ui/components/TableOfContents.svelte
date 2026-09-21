<script lang="ts">
  import type { DocHeading } from "../../runtime/types";

  let {
    headings,
    currentSlug,
  }: {
    headings: DocHeading[];
    currentSlug: string;
  } = $props();

  let activeId = $state("");
  let isOpen = $state(false);

  // Scroll-spy: highlight the heading currently in view.
  $effect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Skip redundant writes: Svelte state equality already dedupes
          // re-renders, but this avoids touching the state graph on every
          // intersection callback that reports the same heading.
          if (entry.isIntersecting && entry.target.id !== activeId) {
            activeId = entry.target.id;
          }
        }
      },
      {
        rootMargin: "-80px 0% -60% 0%",
        threshold: 0,
      },
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  });

  function jumpTo(heading: DocHeading) {
    const target = document.getElementById(heading.id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", `#/${currentSlug}#${heading.id}`);
      activeId = heading.id;
      isOpen = false;
    }
  }
</script>

<aside class="dmd-toc {isOpen ? "is-open" : ""}">
  <button
    type="button"
    class="dmd-toc-header"
    aria-expanded={isOpen}
    aria-controls="dmd-toc-list"
    onclick={() => (isOpen = !isOpen)}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
    <span>On this page</span>
    <svg
      class="dmd-toc-chevron"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </button>
  <ul class="dmd-toc-list" id="dmd-toc-list">
    {#each headings as h (h.id)}
      <li class="dmd-toc-item dmd-toc-level-{h.level}">
        <a
          href={`#/${currentSlug}#${h.id}`}
          class="dmd-toc-link {activeId === h.id ? "active" : ""}"
          onclick={(event: MouseEvent) => {
            event.preventDefault();
            jumpTo(h);
          }}
        >
          {#if h.html}
            <!-- Anchors cannot nest: a heading that is itself a link renders
                 its label inside the page map's own link. -->
            {@html h.html.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1")}
          {:else}
            {h.text}
          {/if}
        </a>
      </li>
    {/each}
  </ul>
</aside>