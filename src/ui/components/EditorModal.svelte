<script lang="ts">
  import { tick } from "svelte";
  import { doc } from "../doc-context.svelte";
  import MarkdownBody from "./MarkdownBody.svelte";
  import { parseMarkdown } from "../../runtime/markdown/parser";
  import { isOfflineDocumentation } from "../../runtime/offline-export";

  const isOffline = $derived(isOfflineDocumentation());

  let draftContent = $state("");
  let saveTarget = $state<"source" | "preview">("source");
  let statusMessage = $state("");
  let isSaving = $state(false);
  let showSplitPreview = $state(true);
  let previewHtml = $derived.by(() => {
    if (!draftContent) return "";
    try {
      const parsed = parseMarkdown(draftContent, doc.currentSlug);
      return parsed.html;
    } catch {
      return "<p><em>Rendering preview...</em></p>";
    }
  });

  let lineCount = $derived(draftContent.split("\n").length);

  // Mobile layout state ------------------------------------------------------
  let isMobile = $state(false);
  let mobilePane = $state<"write" | "preview">("write");
  let vvTop = $state(0);
  let vvHeight = $state(0);
  let keyboardOpen = $state(false);
  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  const showTabPane = $derived(!isMobile || mobilePane === "write");
  const showPreviewPane = $derived(isMobile ? mobilePane === "preview" : showSplitPreview);

  $effect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => (isMobile = mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  });

  // While open: lock page scroll and follow the visual viewport so the on-screen
  // keyboard never hides the footer or the caret.
  $effect(() => {
    if (!doc.isEditorOpen || typeof window === "undefined") return;
    const vv = window.visualViewport;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobilePane = "write";

    const update = () => {
      if (!vv) return;
      vvTop = Math.round(vv.offsetTop);
      vvHeight = Math.round(vv.height);
      keyboardOpen = window.innerHeight - vv.height > 140;
    };
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    return () => {
      document.body.style.overflow = prevOverflow;
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      keyboardOpen = false;
    };
  });

  const backdropStyle = $derived(
    isMobile && vvHeight ? `top:${vvTop}px;height:${vvHeight}px;bottom:auto;` : undefined,
  );

  let activeTab = $state<"editor" | "frontmatter" | "table">("editor");

  // Frontmatter Form state
  let fmTitle = $state("");
  let fmDescription = $state("");
  let fmCategory = $state("");
  let fmTags = $state("");
  let fmOrder = $state<number | string>("");
  let fmNoIndex = $state(false);

  function syncFmFromDraft() {
    const match = draftContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
      fmTitle = doc.currentDoc?.title || "";
      fmDescription = "";
      fmCategory = "";
      fmTags = "";
      fmOrder = "";
      fmNoIndex = false;
      return;
    }
    const lines = match[1].split("\n");
    for (const line of lines) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        let val = line.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (key === "title") fmTitle = val;
        else if (key === "description") fmDescription = val;
        else if (key === "category") fmCategory = val;
        else if (key === "tags") {
          fmTags = val.replace(/^\[|\]$/g, "").replace(/["']/g, "").trim();
        } else if (key === "order") fmOrder = val;
        else if (key === "noindex") fmNoIndex = val === "true";
      }
    }
  }

  function applyFrontmatterToDraft() {
    const match = draftContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const body = match ? draftContent.slice(match[0].length).replace(/^\r?\n/, "") : draftContent;

    const fmLines: string[] = ["---"];
    if (fmTitle.trim()) fmLines.push(`title: "${fmTitle.trim()}"`);
    if (fmDescription.trim()) fmLines.push(`description: "${fmDescription.trim()}"`);
    if (fmCategory.trim()) fmLines.push(`category: "${fmCategory.trim()}"`);
    if (fmTags.trim()) {
      const tagList = fmTags.split(",").map((t) => t.trim()).filter(Boolean);
      fmLines.push(`tags: [${tagList.map((t) => `"${t}"`).join(", ")}]`);
    }
    if (fmOrder !== "" && !isNaN(Number(fmOrder))) fmLines.push(`order: ${Number(fmOrder)}`);
    if (fmNoIndex) fmLines.push(`noindex: true`);
    fmLines.push("---");

    const header = fmLines.length > 2 ? fmLines.join("\n") + "\n\n" : "";
    draftContent = `${header}${body}`;
    doc.updateDocContent(draftContent, doc.currentSlug, false);
    statusMessage = "Frontmatter updated in document";
  }

  // Table Assistant state
  let tableHeaders = $state(["Header 1", "Header 2", "Header 3"]);
  let tableAlignments = $state<("left" | "center" | "right")[]>(["left", "left", "left"]);
  let tableRows = $state([
    ["Row 1 Col 1", "Row 1 Col 2", "Row 1 Col 3"],
    ["Row 2 Col 1", "Row 2 Col 2", "Row 2 Col 3"],
  ]);

  function addTableColumn() {
    const colNum = tableHeaders.length + 1;
    tableHeaders = [...tableHeaders, `Header ${colNum}`];
    tableAlignments = [...tableAlignments, "left"];
    tableRows = tableRows.map((r) => [...r, `Cell ${colNum}`]);
  }

  function removeTableColumn(colIdx: number) {
    if (tableHeaders.length <= 1) return;
    tableHeaders = tableHeaders.filter((_, i) => i !== colIdx);
    tableAlignments = tableAlignments.filter((_, i) => i !== colIdx);
    tableRows = tableRows.map((r) => r.filter((_, i) => i !== colIdx));
  }

  function addTableRow() {
    const rowNum = tableRows.length + 1;
    const newRow = tableHeaders.map((_, i) => `Row ${rowNum} Col ${i + 1}`);
    tableRows = [...tableRows, newRow];
  }

  function removeTableRow(rowIdx: number) {
    if (tableRows.length <= 1) return;
    tableRows = tableRows.filter((_, i) => i !== rowIdx);
  }

  function insertTableIntoDraft() {
    const alignMap = {
      left: ":---",
      center: ":---:",
      right: "---:",
    };
    const headerLine = `| ${tableHeaders.join(" | ")} |`;
    const dividerLine = `| ${tableAlignments.map((a) => alignMap[a] || ":---").join(" | ")} |`;
    const rowLines = tableRows.map((r) => `| ${r.join(" | ")} |`);
    const tableMd = `\n\n${headerLine}\n${dividerLine}\n${rowLines.join("\n")}\n\n`;

    draftContent = `${draftContent.trimEnd()}${tableMd}`;
    doc.updateDocContent(draftContent, doc.currentSlug, false);
    statusMessage = "✔ Markdown table inserted at end of document";
    activeTab = "editor";
  }

  // Initialize draft content when editor opens or current document changes
  $effect(() => {
    if (doc.isEditorOpen && doc.currentDoc) {
      if (doc.currentDoc.rawContent) {
        draftContent = doc.currentDoc.rawContent;
      } else if (isOffline) {
        const w = typeof window !== "undefined" ? (window as any) : null;
        draftContent =
          w?.__DOCMEDOWN_DATA__?.docs?.[doc.currentSlug] ||
          w?.__DOCMEDOWN_DOCS__?.[doc.currentSlug] ||
          "";
      } else {
        // Try fetching raw content from dev server
        fetch(`/__dmd_api__/raw?slug=${encodeURIComponent(doc.currentSlug)}`)
          .then((res) => (res.ok ? res.text() : ""))
          .then((text) => {
            if (text) draftContent = text;
          })
          .catch(() => {});
      }
      syncFmFromDraft();
      statusMessage = isOffline ? "Ready to edit (Offline Mode)" : "Ready to edit";
    }
  });

  // Handle keyboard shortcuts (Ctrl+S / Cmd+S to save, Esc to close)
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      doc.isEditorOpen = false;
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveChanges(isOffline ? "source" : saveTarget);
    }
  }

  // Handle Tab key inside textarea for indenting
  function handleTextareaKeyDown(e: KeyboardEvent) {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      draftContent = `${draftContent.substring(0, start)}  ${draftContent.substring(end)}`;
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }

  // Markdown toolbar helpers (touch-friendly formatting) ---------------------
  function commitDraft(next: string, selStart: number, selEnd: number) {
    draftContent = next;
    doc.updateDocContent(draftContent, doc.currentSlug, false);
    statusMessage = "Unsaved changes (live preview active)";
    tick().then(() => {
      if (!textareaEl) return;
      textareaEl.focus({ preventScroll: true });
      textareaEl.setSelectionRange(selStart, selEnd);
    });
  }

  function wrapSelection(before: string, after = before, placeholder = "text") {
    if (!textareaEl) return;
    const s = textareaEl.selectionStart;
    const e = textareaEl.selectionEnd;
    const selected = draftContent.slice(s, e) || placeholder;
    const next = draftContent.slice(0, s) + before + selected + after + draftContent.slice(e);
    commitDraft(next, s + before.length, s + before.length + selected.length);
  }

  function transformLines(fn: (line: string, index: number) => string) {
    if (!textareaEl) return;
    const s = textareaEl.selectionStart;
    const e = textareaEl.selectionEnd;
    const lineStart = draftContent.lastIndexOf("\n", s - 1) + 1;
    let lineEnd = draftContent.indexOf("\n", e);
    if (lineEnd === -1) lineEnd = draftContent.length;
    const block = draftContent.slice(lineStart, lineEnd);
    const out = block.split("\n").map(fn).join("\n");
    commitDraft(draftContent.slice(0, lineStart) + out + draftContent.slice(lineEnd), lineStart, lineStart + out.length);
  }

  const toolbarActions: Array<{ id: string; label: string; title: string; run: () => void; mono?: boolean }> = [
    { id: "h2", label: "H", title: "Heading", run: () => transformLines((l) => (l.startsWith("## ") ? l.slice(3) : `## ${l.replace(/^#+\s*/, "")}`)) },
    { id: "bold", label: "B", title: "Bold", run: () => wrapSelection("**") },
    { id: "italic", label: "I", title: "Italic", run: () => wrapSelection("*") },
    { id: "code", label: "`", title: "Inline code", mono: true, run: () => wrapSelection("`", "`", "code") },
    { id: "codeblock", label: "{ }", title: "Code block", mono: true, run: () => wrapSelection("```\n", "\n```", "code") },
    { id: "link", label: "Link", title: "Link", run: () => wrapSelection("[", "](https://)", "link text") },
    { id: "ul", label: "• List", title: "Bullet list", run: () => transformLines((l) => (l.startsWith("- ") ? l.slice(2) : `- ${l}`)) },
    { id: "ol", label: "1. List", title: "Numbered list", run: () => transformLines((l, i) => `${i + 1}. ${l.replace(/^\d+\.\s+/, "")}`) },
    { id: "task", label: "☑", title: "Checklist", run: () => transformLines((l) => (l.startsWith("- [ ] ") ? l.slice(6) : `- [ ] ${l.replace(/^- (\[[ x]\] )?/, "")}`)) },
    { id: "quote", label: "❝", title: "Quote", run: () => transformLines((l) => (l.startsWith("> ") ? l.slice(2) : `> ${l}`)) },
    { id: "indent", label: "⇥", title: "Indent", run: () => transformLines((l) => `  ${l}`) },
    { id: "outdent", label: "⇤", title: "Outdent", run: () => transformLines((l) => l.replace(/^ {1,2}/, "")) },
  ];

  function keepEditorFocus(e: Event) {
    e.preventDefault();
  }

  // Live in-page preview update as author types
  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    draftContent = target.value;
    doc.updateDocContent(draftContent, doc.currentSlug, false);
    statusMessage = "Unsaved changes (live preview active)";
  }

  async function saveChanges(target: "source" | "preview") {
    if (isSaving) return;
    isSaving = true;

    if (isOffline) {
      try {
        doc.updateDocContent(draftContent, doc.currentSlug, false);
        if (typeof window !== "undefined") {
          const w = window as any;
          if (w.__DOCMEDOWN_DATA__?.docs) {
            w.__DOCMEDOWN_DATA__.docs[doc.currentSlug] = draftContent;
          }
          try {
            localStorage.setItem(`dmd-offline-doc-${doc.currentSlug}`, draftContent);
          } catch {}
        }
        statusMessage = `✔ Saved to offline local session & browser storage at ${new Date().toLocaleTimeString()}`;
      } catch (err: any) {
        statusMessage = `✖ Save error: ${err.message || "Failed to update offline document"}`;
      } finally {
        isSaving = false;
      }
      return;
    }

    statusMessage = `Saving to ${target}...`;

    const fileName = doc.currentDoc?.path || `${doc.currentSlug === "README" ? "README" : doc.currentSlug}.md`;

    try {
      const res = await fetch("/__dmd_api__/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: fileName,
          slug: doc.currentSlug,
          content: draftContent,
          target,
        }),
      });

      if (res.ok) {
        await res.json();
        doc.updateDocContent(draftContent, doc.currentSlug, false);
        statusMessage = `✔ Saved to ${target} (${fileName}) at ${new Date().toLocaleTimeString()}`;
        if (target === "preview") {
          doc.hasPreviewChanges = true;
        }
      } else {
        const err = await res.json().catch(() => ({}));
        statusMessage = `✖ Save failed: ${err.error || res.statusText}`;
      }
    } catch (err: any) {
      statusMessage = `✖ Save error: ${err.message || "Dev server not reachable"}`;
    } finally {
      isSaving = false;
    }
  }

  function downloadMarkdownFile() {
    const fileName = doc.currentDoc?.path || `${doc.currentSlug === "README" ? "README" : doc.currentSlug}.md`;
    const cleanFileName = fileName.split("/").pop() || "document.md";
    const blob = new Blob([draftContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = cleanFileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    statusMessage = `✔ Downloaded ${cleanFileName}`;
  }

  async function toggleServerMode(newMode: "preview" | "production") {
    if (isOffline) return;
    try {
      const res = await fetch("/__dmd_api__/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });
      if (res.ok) {
        doc.serverMode = newMode;
        statusMessage = `Switched server to ${newMode} mode`;
      }
    } catch {}
  }

  async function publishPreview() {
    if (isOffline) return;
    if (!confirm("Publish all staged .preview changes directly to production source files?")) return;
    try {
      const res = await fetch("/__dmd_api__/publish-preview", { method: "POST" });
      if (res.ok) {
        doc.hasPreviewChanges = false;
        statusMessage = "✔ Preview changes published to source!";
      }
    } catch (err: any) {
      statusMessage = `✖ Error: ${err.message}`;
    }
  }

  async function discardPreview() {
    if (isOffline) return;
    if (!confirm("Discard all staged .preview changes? This cannot be undone.")) return;
    try {
      const res = await fetch("/__dmd_api__/discard-preview", { method: "POST" });
      if (res.ok) {
        doc.hasPreviewChanges = false;
        statusMessage = "Preview staging discarded.";
      }
    } catch (err: any) {
      statusMessage = `✖ Error: ${err.message}`;
    }
  }

  function handlePreviewNavigate(slug: string, anchor: string) {
    if (slug === doc.currentSlug && anchor) {
      const cleanId = decodeURIComponent(anchor).toLowerCase().replace(/^[#]/, "");
      const previewEl = document.querySelector(`.dmd-editor-preview-content #${cleanId}`);
      if (previewEl) {
        previewEl.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    doc.navigate(slug, anchor);
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if doc.isEditorOpen}
  <div
    class="dmd-editor-backdrop"
    class:keyboard-open={keyboardOpen}
    style={backdropStyle}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    aria-label="2-Way Markdown Editor"
    onclick={(e) => { if (e.target === e.currentTarget) doc.isEditorOpen = false; }}
    onkeydown={handleKeyDown}
  >
    <div class="dmd-editor-window">
      <!-- Window Header -->
      <div class="dmd-editor-header">
        <div class="dmd-editor-title-group">
          <span class="dmd-editor-icon">✏️</span>
          <span class="dmd-editor-title">2-Way Markdown Editor</span>
          <span class="dmd-editor-file-badge">{doc.currentSlug}.md</span>
        </div>

        <div class="dmd-editor-tab-group" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'editor'}
            class="dmd-editor-tab-btn {activeTab === 'editor' ? 'active' : ''}"
            onclick={() => { activeTab = 'editor'; mobilePane = 'write'; }}
          >
            Markdown
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'frontmatter'}
            class="dmd-editor-tab-btn {activeTab === 'frontmatter' ? 'active' : ''}"
            onclick={() => { syncFmFromDraft(); activeTab = 'frontmatter'; mobilePane = 'write'; }}
          >
            Frontmatter<span class="dmd-hide-sm"> Form</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'table'}
            class="dmd-editor-tab-btn {activeTab === 'table' ? 'active' : ''}"
            onclick={() => { activeTab = 'table'; mobilePane = 'write'; }}
          >
            Table<span class="dmd-hide-sm"> Assistant</span>
          </button>
        </div>

        <div class="dmd-editor-header-controls">
          <div class="dmd-editor-options">
            <!-- Mobile-only Write / Preview switch (replaces side-by-side split) -->
            <div class="dmd-editor-mobile-switch" role="group" aria-label="Editor view">
              <button
                type="button"
                class="dmd-editor-pill-btn {mobilePane === 'write' ? 'active' : ''}"
                aria-pressed={mobilePane === 'write'}
                onclick={() => (mobilePane = 'write')}
              >
                Write
              </button>
              <button
                type="button"
                class="dmd-editor-pill-btn {mobilePane === 'preview' ? 'active' : ''}"
                aria-pressed={mobilePane === 'preview'}
                onclick={() => (mobilePane = 'preview')}
              >
                Preview
              </button>
            </div>

            <!-- Target selector -->
            {#if !isOffline}
              <div class="dmd-editor-target-pill">
                <span class="dmd-editor-target-label">Target:</span>
                <button
                  type="button"
                  class="dmd-editor-pill-btn {saveTarget === 'source' ? 'active' : ''}"
                  onclick={() => (saveTarget = 'source')}
                >
                  Source
                </button>
                <button
                  type="button"
                  class="dmd-editor-pill-btn {saveTarget === 'preview' ? 'active' : ''}"
                  onclick={() => (saveTarget = 'preview')}
                >
                  .preview
                </button>
              </div>
            {/if}

            <!-- Split preview toggle (desktop) -->
            <button
              type="button"
              class="dmd-editor-btn-secondary dmd-editor-split-btn {showSplitPreview ? 'active' : ''}"
              onclick={() => (showSplitPreview = !showSplitPreview)}
              title="Toggle Split Preview"
            >
              {showSplitPreview ? "Split: ON" : "Split: OFF"}
            </button>

            <!-- Server mode badge & toggle OR Offline Mode badge -->
            <div class="dmd-editor-mode-toggle">
              {#if isOffline}
                <span class="dmd-badge-offline" title="Running in self-contained offline mode. Edits save to in-browser session & storage.">
                  Offline Mode
                </span>
              {:else}
                <span class="dmd-mode-label">Server:</span>
                {#if doc.serverMode === "preview"}
                  <button type="button" class="dmd-badge-preview" onclick={() => toggleServerMode("production")} title="Click to switch to Production mode">
                    Preview Mode
                  </button>
                {:else}
                  <button type="button" class="dmd-badge-prod" onclick={() => toggleServerMode("preview")} title="Click to switch to Preview mode">
                    Production Mode
                  </button>
                {/if}
              {/if}
            </div>
          </div>

          <!-- Close button -->
          <button
            type="button"
            class="dmd-editor-close-btn"
            onclick={() => (doc.isEditorOpen = false)}
            aria-label="Close Editor"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Editor Main Panes -->
      <div class="dmd-editor-body {showPreviewPane && showTabPane ? 'split' : 'full'}">
        {#if !showTabPane}
          <!-- Mobile preview-only view: tab pane hidden -->
        {:else if activeTab === 'editor'}
          <!-- Editor Input Pane -->
          <div class="dmd-editor-pane editor">
            {#if isMobile}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="dmd-editor-toolbar"
                role="group"
                aria-label="Markdown formatting"
                onpointerdown={keepEditorFocus}
                onmousedown={keepEditorFocus}
              >
                {#each toolbarActions as action (action.id)}
                  <button
                    type="button"
                    class="dmd-editor-toolbar-btn {action.mono ? 'mono' : ''} {action.id}"
                    title={action.title}
                    aria-label={action.title}
                    onclick={action.run}
                  >
                    {action.label}
                  </button>
                {/each}
              </div>
            {/if}
            <div class="dmd-editor-textarea-wrapper">
              <textarea
                bind:this={textareaEl}
                class="dmd-editor-textarea"
                value={draftContent}
                oninput={handleInput}
                onkeydown={handleTextareaKeyDown}
                placeholder="Type markdown here..."
                spellcheck="false"
                autocapitalize="off"
                autocomplete="off"
                {...{ autocorrect: "off" }}
                enterkeyhint="enter"
                aria-label="Markdown source"
              ></textarea>
            </div>
          </div>
        {:else if activeTab === 'frontmatter'}
          <!-- Frontmatter Visual Form Pane -->
          <div class="dmd-editor-pane frontmatter-pane">
            <div class="dmd-fm-form">
              <h3 class="dmd-pane-title">Frontmatter Metadata Form</h3>
              <p class="dmd-pane-subtitle">Directly edit document header metadata with live two-way synchronization.</p>

              <div class="dmd-fm-grid">
                <div class="dmd-fm-field">
                  <label for="fm-title">Document Title</label>
                  <input id="fm-title" type="text" bind:value={fmTitle} oninput={applyFrontmatterToDraft} placeholder="e.g. Getting Started" />
                </div>

                <div class="dmd-fm-field">
                  <label for="fm-category">Category / Section</label>
                  <input id="fm-category" type="text" bind:value={fmCategory} oninput={applyFrontmatterToDraft} placeholder="e.g. Guides" />
                </div>

                <div class="dmd-fm-field full">
                  <label for="fm-desc">Description (SEO / Social)</label>
                  <input id="fm-desc" type="text" bind:value={fmDescription} oninput={applyFrontmatterToDraft} placeholder="Summary of this document..." />
                </div>

                <div class="dmd-fm-field">
                  <label for="fm-tags">Tags (comma-separated)</label>
                  <input id="fm-tags" type="text" bind:value={fmTags} oninput={applyFrontmatterToDraft} placeholder="cli, svelte, hmr" />
                </div>

                <div class="dmd-fm-field">
                  <label for="fm-order">Navigation Order</label>
                  <input id="fm-order" type="number" bind:value={fmOrder} oninput={applyFrontmatterToDraft} placeholder="e.g. 1" />
                </div>

                <div class="dmd-fm-field checkbox-field full">
                  <label class="dmd-checkbox-label">
                    <input type="checkbox" bind:checked={fmNoIndex} onchange={applyFrontmatterToDraft} />
                    <span>NoIndex (Exclude from Search & LLM indexing)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        {:else if activeTab === 'table'}
          <!-- Table Visual Assistant Pane -->
          <div class="dmd-editor-pane table-pane">
            <div class="dmd-table-builder">
              <div class="dmd-table-toolbar">
                <div class="dmd-table-toolbar-left">
                  <h3 class="dmd-pane-title">Table Assistant</h3>
                  <span class="dmd-pane-subtitle">{tableHeaders.length} cols × {tableRows.length} rows</span>
                </div>
                <div class="dmd-table-toolbar-actions">
                  <button type="button" class="dmd-btn-xs" onclick={addTableColumn}>+ Add Column</button>
                  <button type="button" class="dmd-btn-xs" onclick={addTableRow}>+ Add Row</button>
                  <button type="button" class="dmd-btn-primary dmd-btn-xs" onclick={insertTableIntoDraft}>Insert into Doc</button>
                </div>
              </div>

              <div class="dmd-table-scroll-wrapper">
                <table class="dmd-builder-table">
                  <thead>
                    <tr>
                      {#each tableHeaders as header, cIdx (cIdx)}
                        <th>
                          <div class="dmd-th-cell">
                            <input type="text" class="dmd-th-input" bind:value={tableHeaders[cIdx]} />
                            <select class="dmd-th-align" bind:value={tableAlignments[cIdx]}>
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                            <button type="button" class="dmd-cell-del" onclick={() => removeTableColumn(cIdx)} title="Delete column">✕</button>
                          </div>
                        </th>
                      {/each}
                      <th class="dmd-th-actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each tableRows as row, rIdx (rIdx)}
                      <tr>
                        {#each row as cell, cIdx (cIdx)}
                          <td>
                            <input type="text" class="dmd-td-input" bind:value={tableRows[rIdx][cIdx]} />
                          </td>
                        {/each}
                        <td class="dmd-td-actions">
                          <button type="button" class="dmd-cell-del" onclick={() => removeTableRow(rIdx)} title="Delete row">✕</button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        {/if}

        <!-- Live Preview Pane -->
        {#if showPreviewPane}
          <div class="dmd-editor-pane preview">
            <div class="dmd-editor-preview-header">
              <span>Live Render</span>
            </div>
            <div class="dmd-editor-preview-content">
              <MarkdownBody html={previewHtml} onNavigate={handlePreviewNavigate} />
            </div>
          </div>
        {/if}
      </div>

      <!-- Window Footer / Status Bar -->
      <div class="dmd-editor-footer">
        <div class="dmd-editor-status">
          <span class="dmd-status-text">{statusMessage}</span>
          <span class="dmd-status-lines">{lineCount} lines</span>
        </div>

        <div class="dmd-editor-actions">
          {#if !isOffline}
            {#if doc.hasPreviewChanges}
              <button type="button" class="dmd-btn-warning" onclick={publishPreview} title="Copy all .preview files to production source">
                Publish Preview
              </button>
              <button type="button" class="dmd-btn-danger" onclick={discardPreview} title="Delete all staged preview files">
                Discard Preview
              </button>
            {/if}

            <button
              type="button"
              class="dmd-btn-secondary"
              onclick={() => saveChanges("preview")}
              disabled={isSaving}
            >
              Save to .preview
            </button>

            <button
              type="button"
              class="dmd-btn-primary"
              onclick={() => saveChanges("source")}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save to Source"}
            </button>
          {:else}
            <button
              type="button"
              class="dmd-btn-secondary"
              onclick={downloadMarkdownFile}
              title="Download edited markdown file (.md) to your computer"
            >
              Download .md
            </button>

            <button
              type="button"
              class="dmd-btn-primary"
              onclick={() => saveChanges("source")}
              disabled={isSaving}
              title="Save changes to in-memory session and browser storage"
            >
              {isSaving ? "Saving..." : "Save to Session"}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .dmd-editor-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: dmdFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes dmdFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .dmd-editor-window {
    width: 94vw;
    max-width: 1440px;
    height: 88vh;
    background: var(--dmd-bg-card, #181825);
    border: 1px solid var(--dmd-border-color, #313244);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6);
    animation: dmdEditorModalEnter 0.24s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes dmdEditorModalEnter {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(:root:not([data-dmd-motion="full"]):not([data-dmd-motion="on"])) .dmd-editor-backdrop {
      animation: none !important;
    }
    :global(:root:not([data-dmd-motion="full"]):not([data-dmd-motion="on"])) .dmd-editor-window {
      animation: none !important;
      transform: none !important;
    }
  }
  :global(:root[data-dmd-motion="reduced"]) .dmd-editor-backdrop,
  :global(:root[data-dmd-motion="off"]) .dmd-editor-backdrop {
    animation: none !important;
  }
  :global(:root[data-dmd-motion="reduced"]) .dmd-editor-window,
  :global(:root[data-dmd-motion="off"]) .dmd-editor-window {
    animation: none !important;
    transform: none !important;
  }

  .dmd-editor-header {
    height: 52px;
    padding: 0 16px;
    border-bottom: 1px solid var(--dmd-border-color, #313244);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--dmd-bg-surface, #1e1e2e);
    gap: 12px;
  }

  .dmd-editor-title-group {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--dmd-text-primary, #cdd6f4);
  }

  .dmd-editor-file-badge {
    padding: 2px 8px;
    border-radius: 6px;
    background: var(--dmd-bg-code, #11111b);
    border: 1px solid var(--dmd-border-color, #313244);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    color: var(--dmd-accent, #89b4fa);
  }

  .dmd-editor-header-controls {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dmd-editor-target-pill {
    display: flex;
    align-items: center;
    background: var(--dmd-bg-card, #181825);
    border: 1px solid var(--dmd-border-color, #313244);
    border-radius: 6px;
    padding: 2px;
    gap: 2px;
    font-size: 12px;
  }

  .dmd-editor-target-label {
    padding: 0 6px;
    color: var(--dmd-text-muted, #a6adc8);
    font-size: 11px;
  }

  .dmd-editor-pill-btn {
    border: none;
    background: transparent;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    color: var(--dmd-text-muted, #a6adc8);
    transition: all 0.15s ease;
  }

  .dmd-editor-pill-btn.active {
    background: var(--dmd-accent, #89b4fa);
    color: #11111b;
    font-weight: 600;
  }

  .dmd-editor-btn-secondary {
    padding: 4px 10px;
    border-radius: 6px;
    background: var(--dmd-bg-card, #181825);
    border: 1px solid var(--dmd-border-color, #313244);
    color: var(--dmd-text-secondary, #bac2de);
    font-size: 12px;
    cursor: pointer;
  }

  .dmd-editor-btn-secondary.active {
    border-color: var(--dmd-accent, #89b4fa);
    color: var(--dmd-accent, #89b4fa);
  }

  .dmd-editor-mode-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .dmd-mode-label {
    font-size: 11px;
    color: var(--dmd-text-muted, #a6adc8);
  }

  .dmd-badge-preview {
    background: #f9e2af;
    color: #1e1e2e;
    border: none;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
  }

  .dmd-badge-prod {
    background: #a6e3a1;
    color: #1e1e2e;
    border: none;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
  }

  .dmd-badge-offline {
    background: var(--dmd-accent-subtle, rgba(49, 92, 245, 0.15));
    color: var(--dmd-accent, #5b8cff);
    border: 1px solid var(--dmd-accent, #5b8cff);
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
  }

  .dmd-editor-close-btn {
    background: transparent;
    border: none;
    color: var(--dmd-text-muted, #a6adc8);
    font-size: 16px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .dmd-editor-close-btn:hover {
    color: var(--dmd-text-primary, #cdd6f4);
    background: rgba(255, 255, 255, 0.1);
  }

  .dmd-editor-body {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  .dmd-editor-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    height: 100%;
    overflow: hidden;
  }

  .dmd-editor-pane.preview {
    border-left: 1px solid var(--dmd-border-color, #313244);
    background: var(--dmd-bg-canvas, #11111b);
  }

  .dmd-editor-preview-header {
    height: 36px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--dmd-text-muted, #a6adc8);
    border-bottom: 1px solid var(--dmd-border-color, #313244);
    background: var(--dmd-bg-surface, #1e1e2e);
  }

  .dmd-editor-preview-content {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
  }

  .dmd-editor-textarea-wrapper {
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
    background: var(--dmd-bg-card, #181825);
  }

  .dmd-editor-textarea {
    width: 100%;
    height: 100%;
    padding: 16px;
    border: none;
    outline: none;
    resize: none;
    background: transparent;
    color: var(--dmd-text-primary, #cdd6f4);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 14px;
    line-height: 1.6;
    tab-size: 2;
    overflow-y: auto;
  }

  .dmd-editor-footer {
    height: 48px;
    padding: 0 16px;
    border-top: 1px solid var(--dmd-border-color, #313244);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--dmd-bg-surface, #1e1e2e);
    gap: 12px;
  }

  .dmd-editor-status {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--dmd-text-muted, #a6adc8);
  }

  .dmd-status-text {
    color: var(--dmd-accent, #89b4fa);
  }

  .dmd-editor-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dmd-btn-primary {
    padding: 6px 14px;
    border-radius: 6px;
    background: var(--dmd-accent, #89b4fa);
    color: #11111b;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .dmd-btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .dmd-btn-secondary {
    padding: 6px 14px;
    border-radius: 6px;
    background: var(--dmd-bg-card, #181825);
    color: var(--dmd-text-primary, #cdd6f4);
    border: 1px solid var(--dmd-border-color, #313244);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }

  .dmd-btn-warning {
    padding: 6px 12px;
    border-radius: 6px;
    background: #f9e2af;
    color: #1e1e2e;
    border: none;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .dmd-btn-danger {
    padding: 6px 12px;
    border-radius: 6px;
    background: #f38ba8;
    color: #1e1e2e;
    border: none;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .dmd-btn-xs {
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    background: var(--dmd-bg-surface, #1e1e2e);
    border: 1px solid var(--dmd-border-color, #313244);
    color: var(--dmd-text-primary, #cdd6f4);
  }

  .dmd-btn-xs:hover {
    border-color: var(--dmd-accent, #89b4fa);
    color: var(--dmd-accent, #89b4fa);
  }

  /* Header Tab Switcher ---------------------------------------------------- */
  .dmd-editor-tab-group {
    display: flex;
    align-items: center;
    background: var(--dmd-bg-card, #181825);
    border: 1px solid var(--dmd-border-color, #313244);
    border-radius: 6px;
    padding: 2px;
    gap: 2px;
  }

  .dmd-editor-tab-btn {
    border: none;
    background: transparent;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    color: var(--dmd-text-muted, #a6adc8);
    transition: all 0.15s ease;
  }

  .dmd-editor-tab-btn.active {
    background: var(--dmd-accent, #89b4fa);
    color: #11111b;
    font-weight: 600;
  }

  /* Frontmatter Form Styles ------------------------------------------------ */
  .frontmatter-pane {
    background: var(--dmd-bg-card, #181825);
    padding: 24px;
    overflow-y: auto;
  }

  .dmd-fm-form {
    max-width: 640px;
  }

  .dmd-pane-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--dmd-text-primary, #cdd6f4);
    margin: 0 0 4px 0;
  }

  .dmd-pane-subtitle {
    font-size: 12px;
    color: var(--dmd-text-muted, #a6adc8);
    margin: 0 0 20px 0;
  }

  .dmd-fm-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .dmd-fm-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .dmd-fm-field.full {
    grid-column: 1 / -1;
  }

  .dmd-fm-field label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--dmd-text-muted, #a6adc8);
  }

  .dmd-fm-field input[type="text"],
  .dmd-fm-field input[type="number"] {
    background: var(--dmd-bg-surface, #1e1e2e);
    border: 1px solid var(--dmd-border-color, #313244);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 13px;
    color: var(--dmd-text-primary, #cdd6f4);
    outline: none;
    transition: border-color 0.15s ease;
  }

  .dmd-fm-field input:focus {
    border-color: var(--dmd-accent, #89b4fa);
  }

  .dmd-checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px !important;
    text-transform: none !important;
    color: var(--dmd-text-primary, #cdd6f4) !important;
    cursor: pointer;
    margin-top: 8px;
  }

  /* Table Assistant Styles ------------------------------------------------- */
  .table-pane {
    background: var(--dmd-bg-card, #181825);
    padding: 24px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .dmd-table-builder {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .dmd-table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    gap: 12px;
    flex-shrink: 0;
  }

  .dmd-table-toolbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dmd-table-scroll-wrapper {
    flex: 1;
    overflow: auto;
    border: 1px solid var(--dmd-border-color, #313244);
    border-radius: 8px;
    background: var(--dmd-bg-surface, #1e1e2e);
  }

  .dmd-builder-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .dmd-builder-table th,
  .dmd-builder-table td {
    border: 1px solid var(--dmd-border-color, #313244);
    padding: 6px;
  }

  .dmd-th-cell {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .dmd-th-input {
    flex: 1;
    min-width: 80px;
    background: var(--dmd-bg-card, #181825);
    border: 1px solid var(--dmd-border-color, #313244);
    color: var(--dmd-accent, #89b4fa);
    font-weight: 600;
    font-size: 12px;
    padding: 4px 6px;
    border-radius: 4px;
    outline: none;
  }

  .dmd-td-input {
    width: 100%;
    background: transparent;
    border: 1px solid transparent;
    color: var(--dmd-text-primary, #cdd6f4);
    font-size: 12px;
    padding: 4px 6px;
    border-radius: 4px;
    outline: none;
  }

  .dmd-td-input:focus {
    background: var(--dmd-bg-card, #181825);
    border-color: var(--dmd-accent, #89b4fa);
  }

  .dmd-th-align {
    background: var(--dmd-bg-surface, #1e1e2e);
    border: 1px solid var(--dmd-border-color, #313244);
    color: var(--dmd-text-muted, #a6adc8);
    font-size: 11px;
    padding: 2px 4px;
    border-radius: 4px;
    outline: none;
  }

  .dmd-cell-del {
    background: transparent;
    border: none;
    color: var(--dmd-text-muted, #a6adc8);
    font-size: 11px;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .dmd-cell-del:hover {
    color: #f38ba8;
    background: rgba(243, 139, 168, 0.15);
  }

  .dmd-th-actions,
  .dmd-td-actions {
    width: 32px;
    text-align: center;
  }

  /* New header wrappers (desktop defaults) --------------------------------- */
  .dmd-editor-options {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dmd-editor-mobile-switch,
  .dmd-editor-toolbar {
    display: none;
  }

  .dmd-editor-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Mobile editor ---------------------------------------------------------- */
  @keyframes dmdEditorSheetEnter {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    .dmd-editor-backdrop {
      padding: 0;
      align-items: stretch;
      justify-content: stretch;
      background: var(--dmd-bg-card, #181825);
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      overscroll-behavior: contain;
    }

    .dmd-editor-window {
      width: 100%;
      max-width: none;
      height: 100%;
      border: none;
      border-radius: 0;
      box-shadow: none;
      animation: dmdEditorSheetEnter 0.26s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    /* Header: row 1 = title + close, row 2 = tabs, row 3 = scrolling options */
    .dmd-editor-header {
      height: auto;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
      padding: max(8px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 8px max(12px, env(safe-area-inset-left));
    }

    .dmd-editor-title-group {
      order: 1;
      flex: 1 1 0;
      min-width: 0;
    }

    .dmd-editor-file-badge {
      min-width: 0;
      max-width: 42vw;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dmd-editor-header-controls {
      display: contents;
    }

    .dmd-editor-close-btn {
      order: 2;
      width: 40px;
      height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      font-size: 18px;
      border-radius: 10px;
      background: var(--dmd-bg-card, #181825);
      border: 1px solid var(--dmd-border-color, #313244);
    }

    .dmd-editor-tab-group {
      order: 3;
      width: 100%;
      overflow-x: auto;
      scrollbar-width: none;
      padding: 3px;
      border-radius: 10px;
    }

    .dmd-editor-tab-group::-webkit-scrollbar,
    .dmd-editor-options::-webkit-scrollbar,
    .dmd-editor-toolbar::-webkit-scrollbar {
      display: none;
    }

    .dmd-editor-tab-btn {
      flex: 1 0 auto;
      min-height: 38px;
      padding: 0 14px;
      border-radius: 8px;
      font-size: 13px;
      white-space: nowrap;
    }

    .dmd-editor-options {
      order: 4;
      width: 100%;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      gap: 8px;
      padding-bottom: 1px;
    }

    .dmd-editor-options > * {
      flex-shrink: 0;
    }

    .dmd-editor-mobile-switch {
      display: flex;
      align-items: center;
      background: var(--dmd-bg-card, #181825);
      border: 1px solid var(--dmd-border-color, #313244);
      border-radius: 8px;
      padding: 2px;
      gap: 2px;
    }

    .dmd-editor-pill-btn {
      min-height: 32px;
      padding: 0 12px;
      font-size: 13px;
    }

    .dmd-editor-split-btn {
      display: none;
    }

    .dmd-editor-target-pill,
    .dmd-editor-mode-toggle {
      white-space: nowrap;
    }

    .dmd-badge-preview,
    .dmd-badge-prod,
    .dmd-badge-offline {
      min-height: 32px;
      padding: 0 10px;
      display: inline-flex;
      align-items: center;
    }

    .dmd-hide-sm {
      display: none;
    }

    /* Formatting toolbar */
    .dmd-editor-toolbar {
      display: flex;
      gap: 6px;
      padding: 6px max(8px, env(safe-area-inset-left));
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      background: var(--dmd-bg-surface, #1e1e2e);
      border-bottom: 1px solid var(--dmd-border-color, #313244);
      flex-shrink: 0;
    }

    .dmd-editor-toolbar-btn {
      flex: 0 0 auto;
      min-width: 42px;
      height: 38px;
      padding: 0 12px;
      border-radius: 8px;
      border: 1px solid var(--dmd-border-color, #313244);
      background: var(--dmd-bg-card, #181825);
      color: var(--dmd-text-primary, #cdd6f4);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.12s ease, border-color 0.12s ease, transform 0.12s ease;
    }

    .dmd-editor-toolbar-btn:active {
      transform: scale(0.94);
      background: var(--dmd-accent, #89b4fa);
      border-color: var(--dmd-accent, #89b4fa);
      color: #11111b;
    }

    .dmd-editor-toolbar-btn.mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .dmd-editor-toolbar-btn.bold {
      font-weight: 800;
    }

    .dmd-editor-toolbar-btn.italic {
      font-style: italic;
      font-family: Georgia, serif;
    }

    /* Panes */
    .dmd-editor-pane.preview {
      border-left: none;
    }

    .dmd-editor-preview-header {
      display: none;
    }

    .dmd-editor-preview-content {
      padding: 16px max(16px, env(safe-area-inset-left));
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }

    .dmd-editor-textarea {
      /* 16px prevents iOS Safari from zooming on focus */
      font-size: 16px;
      line-height: 1.55;
      padding: 14px max(14px, env(safe-area-inset-left)) 32px;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }

    .frontmatter-pane,
    .table-pane {
      padding: 16px max(14px, env(safe-area-inset-left));
    }

    .dmd-fm-grid {
      grid-template-columns: 1fr;
    }

    .dmd-fm-field input[type="text"],
    .dmd-fm-field input[type="number"] {
      min-height: 44px;
      font-size: 16px;
    }

    .dmd-checkbox-label {
      min-height: 44px;
    }

    .dmd-checkbox-label input {
      width: 20px;
      height: 20px;
    }

    .dmd-table-toolbar {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }

    .dmd-table-toolbar-actions {
      flex-wrap: wrap;
    }

    .dmd-table-toolbar-actions .dmd-btn-xs {
      flex: 1 1 auto;
      min-height: 40px;
      font-size: 12px;
    }

    .dmd-th-input,
    .dmd-td-input,
    .dmd-th-align {
      font-size: 16px;
      min-height: 38px;
    }

    .dmd-th-input,
    .dmd-td-input {
      min-width: 120px;
    }

    .dmd-cell-del {
      min-width: 32px;
      min-height: 32px;
    }

    /* Footer: status row above full-width action buttons */
    .dmd-editor-footer {
      height: auto;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      padding: 8px max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
    }

    .dmd-editor-status {
      justify-content: space-between;
      min-width: 0;
      font-size: 12px;
    }

    .dmd-status-text {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dmd-status-lines {
      flex-shrink: 0;
    }

    .dmd-editor-actions {
      flex-wrap: wrap;
      gap: 8px;
    }

    .dmd-editor-actions > button {
      flex: 1 1 40%;
      min-height: 44px;
      font-size: 14px;
      border-radius: 10px;
    }

    .dmd-editor-actions > .dmd-btn-warning,
    .dmd-editor-actions > .dmd-btn-danger {
      font-size: 13px;
    }

    /* On-screen keyboard open: reclaim vertical space for writing */
    .keyboard-open .dmd-editor-options,
    .keyboard-open .dmd-editor-status {
      display: none;
    }

    .keyboard-open .dmd-editor-header {
      padding-top: 6px;
      padding-bottom: 6px;
    }

    .keyboard-open .dmd-editor-footer {
      padding-bottom: 8px;
    }
  }

  @media (max-width: 420px) {
    .dmd-editor-title {
      display: none;
    }

    .dmd-editor-file-badge {
      max-width: 60vw;
    }
  }

  /* Landscape phones: very little height, so drop the heading entirely. */
  @media (max-width: 900px) and (max-height: 500px) {
    .dmd-editor-title,
    .dmd-editor-icon {
      display: none;
    }
  }
</style>

