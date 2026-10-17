# Internationalization

DocMeDown groups translations by filename suffix, not by language directories.
For an English original, `guide.md` and `guide.en.md` represent the same document;
`guide.pt-br.md` and `guide.fr.md` are its translations. Categories retain their
existing directory structure. Both Markdown and MDX extensions are supported.

## Configuration

```json
{
  "i18n": {
    "defaultLocale": "en",
    "locales": [
      { "code": "en", "label": "English" },
      { "code": "pt-BR", "label": "Português (Brasil)" },
      { "code": "fr", "label": "Français" }
    ],
    "fallbackToDefault": true
  }
}
```

Only registered suffixes are interpreted as languages. Ordinary dotted names
such as `guide.api.md` remain ordinary document names. Language tags are
case-insensitive in suffixes; public translated slugs use lowercase suffixes.
The explicit original (`guide.en.md`) wins over the unsuffixed file, with a
validation warning. Equivalent explicit variants are rejected as conflicts.

## Initialization

```sh
npx docmedown init --yes --default-locale en --locales pt-BR,fr
```

The same options are available during quickstart. Interactive setup asks for
the project languages using a multi-select menu, followed by the original language.
The six curated presets are English (`en`), Brazilian Portuguese (`pt-BR`),
Spanish (`es`), French (`fr`), German (`de`), and Simplified Chinese (`zh-CN`).
All six are selected initially; this is a project-oriented selection, not a global
popularity ranking. With `--yes` and no language flags, these six are enabled and
English is the original. Explicit `--locales` replaces that selection; the original
is always included. To add another language, choose the manual-add prompt and
enter its display name and language tag (for example, `日本語`, then `ja`). Enter
the tag, not `.ja.md`. Tags are canonicalized and selected duplicates rejected.
Cancelling any language prompt aborts creation without saving a partial config.

`docmedown config` edits these settings, retains existing per-language overrides,
and confirms changes that reinterpret unsuffixed documents. Setting a language
does not translate source text or sample files.

## Reading and fallback

The navbar language selector appears for multilingual projects. It keeps the
same logical page when switching languages. Missing translations show the
original with a notice, or an unavailable state if fallback is disabled.
The selected language is preserved in the suffixed route, even during fallback.
Search and navigation show one variant per logical document.

An explicit URL takes precedence over a saved language choice. Without a
previous choice, the original language is used; browser language is not inferred.
Relative Markdown links inherit the page language, while explicit language
suffixes are respected. Editing a fallback page edits its original physical file.

## Localized site labels

Each language entry can define `overrides` for `nav`, `sidebar`, `tagline`,
`description`, `search`, and `footer`. These inherit the base configuration.
For example, add `"overrides": { "search": { "placeholder": "Buscar…" } }`
to the Portuguese entry. Built-in reader messages currently include English,
Portuguese, Spanish, French, German and Simplified Chinese; other languages fall
back to English for those messages.

Static pages declare their content language and reference published translations.
Offline exports retain the corpus and selector. MCP listing and search accept
an optional `locale`; translated documents can also be read by their suffixed slug.

AI context output defaults to the original language. Additional languages produce
`llms.<locale>.txt`, `llms-full.<locale>.txt` and `okf.<locale>.json` alongside the
original artifacts, without introducing language directories.

## Built-in DMD guides

The footer opens `DMD` and its `DMD/for-developers` subpage. Both are bundled with
authored content in the six preset languages, including zero-config and remote
sources. Project exports include the configured languages plus unconditional English.
For example, `DMD.pt-br` and `DMD/for-developers.pt-br` are Portuguese routes.
These guides remain hidden from sidebar/search and carry `noindex` metadata.
Static exports prerender configured guide variants; offline copies need no network.

For a custom language without a built-in translation, DMD uses **English**, even
if the project's original language is not English or project fallback is disabled.
The requested route is retained and the notice identifies the effective language.
This exception applies only to engine-provided DMD guides. Ordinary documents
continue to follow `defaultLocale` and `fallbackToDefault`.

## Documentation maintenance and boundaries

All existing documentation can use the same filename-suffix mechanism, including
nested example sites with their own `docs.json`. Enabling a language is **not** a
claim that every page is translated. Never copy English text into a suffixed file
to make a coverage check pass. Preserve commands, configuration keys, component
tags and link targets when translating; check localized headings and anchors.
See `ROADMAP.md` for the outstanding full-corpus translation and UI extraction work.

The built-in message catalog currently covers the language selector, fallback
notice, skip link, search placeholder, previous/next links and document loading label. Editor actions,
some reader controls and built-in component messages still use English.
Switching languages starts at the top of the destination document; automatic
mapping between translated heading anchors is not provided.