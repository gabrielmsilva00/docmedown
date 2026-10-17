<script lang="ts">
  import { localeLabel, projectLocales } from "../../runtime/i18n";
  import { doc } from "../doc-context.svelte";

  const locales = $derived(projectLocales(doc.config));
</script>

{#if locales.length > 1}
  <label class="dmd-language-control">
    <span aria-hidden="true">文/A</span>
    <select aria-label={doc.t("language")} value={doc.locale}
      onchange={(event) => doc.selectLocale(event.currentTarget.value)}>
      {#each locales as locale}
        <option value={locale.code} lang={locale.code}>
          {localeLabel(locale.code, doc.config)}{doc.hasTranslation(locale.code) ? "" : ` · ${doc.t("original")}`}
        </option>
      {/each}
    </select>
  </label>
{/if}

<style>
  .dmd-language-control {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
    color: var(--dmd-text-secondary);
    font-size: 0.75rem;
  }
  select {
    font: inherit;
    color: var(--dmd-text-primary);
    background: var(--dmd-bg-primary);
    border: 1px solid var(--dmd-border);
    border-radius: 0.4rem;
    padding: 0.4rem;
    max-width: 10rem;
    cursor: pointer;
  }
  select:focus-visible { outline: 2px solid var(--dmd-accent); outline-offset: 2px; }
  @media (max-width: 640px) {
    .dmd-language-control > span { display: none; }
    select { max-width: 7rem; }
  }
</style>