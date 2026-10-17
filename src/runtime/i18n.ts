import type { DocConfig, DocFileItem, SidebarTreeNode } from "./types";

export interface LocaleConfig {
  code: string;
  label?: string;
}

/** Curated presets, not an assertion about language popularity rankings. */
export const BUILTIN_LOCALES: readonly LocaleConfig[] = [
  { code: "en", label: "English" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "zh-CN", label: "简体中文" },
];

export function localeConfig(config: DocConfig, locale: string): DocConfig {
  const overrides = config.i18n?.locales.find((item) => item.code === locale)?.overrides;
  return {
    ...config,
    ...overrides,
    search: { ...config.search, ...overrides?.search },
    footer: { ...config.footer, ...overrides?.footer },
  };
}

/** Canonical tags for metadata; lowercase tags are used in filenames and URLs. */
export function canonicalLocale(value: string): string {
  const locales = Intl.getCanonicalLocales(value.trim());
  if (locales.length !== 1) throw new Error(`Invalid locale: ${value}`);
  return locales[0];
}

export function defaultLocale(config?: Pick<DocConfig, "i18n"> | null): string {
  return config?.i18n?.defaultLocale ?? "en";
}

export function projectLocales(config?: Pick<DocConfig, "i18n"> | null): LocaleConfig[] {
  const primary = defaultLocale(config);
  const configured = config?.i18n?.locales ?? [];
  return configured.some((item) => item.code === primary) ? configured : [{ code: primary }, ...configured];
}

export function localeLabel(code: string, config?: Pick<DocConfig, "i18n"> | null): string {
  const label =
    projectLocales(config).find((item) => item.code === code)?.label ??
    BUILTIN_LOCALES.find((item) => item.code === code)?.label;
  if (label) return label;
  try {
    return new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export interface DocumentVariant {
  docId: string;
  locale: string;
  explicit: boolean;
  slug: string;
  path: string;
}

export function documentVariant(file: string, config?: Pick<DocConfig, "i18n"> | null): DocumentVariant {
  const path = file.replace(/\\/g, "/").replace(/^\.?\//, "");
  let docId = path.replace(/\.(md|mdx|html)$/i, "");
  const suffix = docId.match(/\.([^./]+)$/)?.[1];
  const isBuiltinGuide = /^(?:DMD|DMD\/for-developers)(?:\.[^./]+)?$/.test(docId);
  const available = isBuiltinGuide ? [...projectLocales(config), ...BUILTIN_LOCALES] : projectLocales(config);
  const locale = available.find((item) => item.code.toLowerCase() === suffix?.toLowerCase())?.code;
  if (locale) docId = docId.slice(0, -(suffix!.length + 1));
  if (/^(readme|index)$/i.test(docId)) docId = "README";
  const resolvedLocale = locale ?? defaultLocale(config);
  return {
    docId,
    locale: resolvedLocale,
    explicit: Boolean(locale),
    slug: localizedSlug(docId, resolvedLocale, config),
    path,
  };
}

export function localizedSlug(docId: string, locale: string, config?: Pick<DocConfig, "i18n"> | null): string {
  return locale === defaultLocale(config) ? docId : `${docId}.${locale.toLowerCase()}`;
}

/** Explicit default variants win; equivalent physical variants are an error, never order-dependent. */
export function collectVariants(files: string[], config?: Pick<DocConfig, "i18n"> | null): DocumentVariant[] {
  const variants = new Map<string, DocumentVariant>();
  for (const file of [...files].sort()) {
    const item = documentVariant(file, config);
    const key = `${item.docId}\0${item.locale}`;
    const previous = variants.get(key);
    if (previous && previous.explicit === item.explicit) {
      throw new Error(`Conflicting document variants: ${previous.path} and ${item.path}`);
    }
    if (!previous || item.explicit) variants.set(key, item);
  }
  return [...variants.values()];
}

export function resolveVariant(files: string[], slug: string, config?: Pick<DocConfig, "i18n"> | null) {
  const requested = documentVariant(slug, config);
  const variants = collectVariants(files, config);
  const exact = variants.find((item) => item.docId === requested.docId && item.locale === requested.locale);
  return (
    exact ??
    (config?.i18n?.fallbackToDefault === false
      ? undefined
      : variants.find((item) => item.docId === requested.docId && item.locale === defaultLocale(config)))
  );
}

/** The active view has one result per logical document; fallback retains the requested route. */
export function localizedDocs(
  docs: DocFileItem[],
  locale: string,
  config?: Pick<DocConfig, "i18n"> | null,
): DocFileItem[] {
  const files = docs.map((doc) => doc.path);
  const variants = collectVariants(files, config);
  const byPath = new Map(docs.map((doc) => [doc.path, doc]));
  const byVariant = new Map(variants.map((item) => [`${item.docId}\0${item.locale}`, item]));
  const ids = [...new Set(variants.map((item) => item.docId))];
  return ids.flatMap((id) => {
    const slug = localizedSlug(id, locale, config);
    const variant =
      byVariant.get(`${id}\0${locale}`) ??
      (config?.i18n?.fallbackToDefault === false ? undefined : byVariant.get(`${id}\0${defaultLocale(config)}`));
    const doc = variant && byPath.get(variant.path);
    return doc ? [{ ...doc, slug }] : [];
  });
}

export function localizeTree(
  tree: SidebarTreeNode[],
  docs: DocFileItem[],
  locale: string,
  config: DocConfig,
): SidebarTreeNode[] {
  return tree.flatMap<SidebarTreeNode>((node) => {
    if (node.isCategory) {
      const children = localizeTree(node.children ?? [], docs, locale, config);
      return children.length ? [{ ...node, children }] : [];
    }
    const id = documentVariant(node.slug ?? node.path ?? node.id, config).docId;
    const doc = docs.find((item) => documentVariant(item.slug, config).docId === id);
    return doc
      ? [
          {
            ...node,
            slug: localizedSlug(id, locale, config),
            path: doc.path,
            title: doc.frontmatter.sidebar_label || doc.frontmatter.title || node.title,
          },
        ]
      : [];
  });
}

const english = {
  language: "Language",
  original: "Original",
  unavailable: "Translation unavailable",
  fallback: "Showing the original in",
  skip: "Skip to content",
  search: "Search documentation…",
  loading: "Loading document",
  previous: "Previous",
  next: "Next",
};
type MessageKey = keyof typeof english;
const messages: Record<string, Partial<Record<MessageKey, string>>> = {
  es: {
    language: "Idioma",
    original: "Original",
    unavailable: "Traducción no disponible",
    fallback: "Mostrando el original en",
    skip: "Saltar al contenido",
    search: "Buscar en la documentación…",
    loading: "Cargando documento",
    previous: "Anterior",
    next: "Siguiente",
  },
  de: {
    language: "Sprache",
    original: "Original",
    unavailable: "Übersetzung nicht verfügbar",
    fallback: "Original angezeigt auf",
    skip: "Zum Inhalt springen",
    search: "Dokumentation durchsuchen…",
    loading: "Dokument wird geladen",
    previous: "Zurück",
    next: "Weiter",
  },
  zh: {
    language: "语言",
    original: "原文",
    unavailable: "暂无译文",
    fallback: "当前显示原文，语言为",
    skip: "跳转到正文",
    search: "搜索文档…",
    loading: "正在加载文档",
    previous: "上一页",
    next: "下一页",
  },
  pt: {
    language: "Idioma",
    original: "Original",
    unavailable: "Tradução indisponível",
    fallback: "Exibindo o original em",
    skip: "Pular para o conteúdo",
    search: "Buscar na documentação…",
    loading: "Carregando documento",
    previous: "Anterior",
    next: "Próximo",
  },
  fr: {
    language: "Langue",
    original: "Original",
    unavailable: "Traduction indisponible",
    fallback: "Version originale en",
    skip: "Aller au contenu",
    search: "Rechercher dans la documentation…",
    loading: "Chargement du document",
    previous: "Précédent",
    next: "Suivant",
  },
};
export function translate(locale: string, key: MessageKey): string {
  return messages[locale.split("-")[0]]?.[key] ?? english[key];
}
