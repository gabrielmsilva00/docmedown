import { z } from "zod";
import { canonicalLocale } from "./i18n";

const nonEmptyString = z.string().trim().min(1, "Must not be empty.");

/** Legacy accent presets accepted for one compatibility cycle. */
export const themePresetSchema = z.enum(["indigo", "emerald", "sunset", "violet", "rose", "slate", "cyberpunk"]);

/** Complete visual systems, not merely accent-color variations. */
export const themeFamilySchema = z.enum(["atlas", "blueprint", "terminal", "editorial"]);
export const themeDensitySchema = z.enum(["comfortable", "compact"]);

export const colorModeSchema = z.enum(["light", "dark", "auto"]);
export const socialTypeSchema = z.enum(["github", "gitlab", "twitter", "x", "discord", "custom"]);
export const badgeTypeSchema = z.enum(["info", "success", "warning", "new"]);

export const navLinkSchema = z
  .object({
    label: nonEmptyString,
    href: nonEmptyString,
    external: z.boolean().optional(),
    icon: z.string().optional(),
  })
  .strict();

export const socialLinkSchema = z
  .object({
    type: socialTypeSchema,
    url: z.string().url("Must be an absolute URL."),
    label: z.string().optional(),
    icon: z.string().optional(),
  })
  .strict();

export const remoteSourceSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("github"),
      repo: nonEmptyString.regex(/^[^/\s]+\/[^/\s]+$/, "Use the owner/repository format."),
      branch: nonEmptyString.optional(),
      docsDir: z.string().optional(),
      token: z.string().optional(),
      baseUrl: z.string().url("Must be an absolute URL.").optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("gitlab"),
      repo: nonEmptyString.regex(/^[^/\s]+\/[^/\s]+$/, "Use the namespace/repository format."),
      branch: nonEmptyString.optional(),
      docsDir: z.string().optional(),
      token: z.string().optional(),
      baseUrl: z.string().url("Must be an absolute URL.").optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("raw"),
      baseUrl: z.string().url("Must be an absolute URL."),
      branch: nonEmptyString.optional(),
      docsDir: z.string().optional(),
      token: z.string().optional(),
    })
    .strict(),
]);

export interface SidebarItemConfigShape {
  title?: string;
  path?: string;
  slug?: string;
  icon?: string;
  badge?: string;
  badgeType?: z.infer<typeof badgeTypeSchema>;
  collapsed?: boolean;
  children?: SidebarItemConfigShape[];
}

export const sidebarItemSchema: z.ZodType<SidebarItemConfigShape> = z.lazy(() =>
  z
    .object({
      title: z.string().optional(),
      path: z.string().optional(),
      slug: z.string().optional(),
      icon: z.string().optional(),
      badge: z.string().optional(),
      badgeType: badgeTypeSchema.optional(),
      collapsed: z.boolean().optional(),
      children: z.array(sidebarItemSchema).optional(),
    })
    .strict(),
);

export const docThemeConfigSchema = z
  .object({
    family: themeFamilySchema.optional(),
    density: themeDensitySchema.optional(),
    /** @deprecated Use `family`. Preserved to migrate existing docs.json files. */
    preset: themePresetSchema.optional(),
    defaultMode: colorModeSchema.optional(),
    accentColor: z.string().optional(),
    accentColorDark: z.string().optional(),
    fontFamily: z.string().optional(),
    codeTheme: z.enum(["github", "dracula", "one-dark", "synthwave"]).optional(),
    logo: z
      .object({
        light: z.string().optional(),
        dark: z.string().optional(),
        alt: z.string().optional(),
        text: z.string().optional(),
      })
      .strict()
      .optional(),
    favicon: z.string().optional(),
  })
  .strict();

export const docSearchConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    placeholder: z.string().optional(),
    maxResults: z.number().int().positive().max(100).optional(),
  })
  .strict();

export const docOfflineConfigSchema = z
  .object({
    embedNestedDocs: z.boolean().optional(),
  })
  .strict();

const localeCodeSchema = z
  .string()
  .trim()
  .refine((value) => {
    try {
      canonicalLocale(value);
      return true;
    } catch {
      return false;
    }
  }, "Use a valid language tag, e.g. en or pt-BR.")
  .transform(canonicalLocale);

export const docI18nConfigSchema = z
  .object({
    defaultLocale: localeCodeSchema.default("en"),
    locales: z
      .array(
        z
          .object({
            code: localeCodeSchema,
            label: nonEmptyString.optional(),
            overrides: z
              .object({
                tagline: z.string().optional(),
                description: z.string().optional(),
                nav: z.array(navLinkSchema).optional(),
                sidebar: z.array(sidebarItemSchema).optional(),
                search: docSearchConfigSchema.optional(),
                footer: z
                  .object({
                    copyright: z.string().optional(),
                    links: z.array(navLinkSchema).optional(),
                    showBuiltWith: z.boolean().optional(),
                  })
                  .strict()
                  .optional(),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .default([]),
    fallbackToDefault: z.boolean().default(true),
  })
  .strict()
  .superRefine((value, context) => {
    const codes = value.locales.map((item) => item.code);
    if (new Set(codes).size !== codes.length)
      context.addIssue({ code: "custom", path: ["locales"], message: "Duplicate locales." });
  });

/**
 * Schema for unmerged user configuration. It intentionally keeps `name` optional
 * because callers may provide a partial override that inherits the default name.
 */
export const docConfigSchema = z
  .object({
    $schema: z.string().url("Must be an absolute URL.").optional(),
    name: nonEmptyString.optional(),
    tagline: z.string().optional(),
    description: z.string().optional(),
    /** Canonical site origin, e.g. https://docs.example.com — enables canonical URLs, sitemap.xml, and robots.txt. */
    url: z.string().url("Must be an absolute URL.").optional(),
    version: z.string().optional(),
    rootDoc: nonEmptyString.optional(),
    i18n: docI18nConfigSchema.optional(),
    home: nonEmptyString.optional(),
    source: remoteSourceSchema.optional(),
    theme: docThemeConfigSchema.optional(),
    nav: z.array(navLinkSchema).optional(),
    socials: z.array(socialLinkSchema).optional(),
    sidebar: z.array(sidebarItemSchema).optional(),
    autoIndex: z
      .object({
        enabled: z.boolean().optional(),
        exclude: z.array(nonEmptyString).optional(),
        sort: z.enum(["alphabetical", "frontmatter", "natural"]).optional(),
        defaultCollapsed: z.boolean().optional(),
      })
      .strict()
      .optional(),
    search: docSearchConfigSchema.optional(),
    offline: docOfflineConfigSchema.optional(),
    footer: z
      .object({
        copyright: z.string().optional(),
        links: z.array(navLinkSchema).optional(),
        showBuiltWith: z.boolean().optional(),
      })
      .strict()
      .optional(),
    editor: z
      .object({
        enabled: z.boolean().optional(),
      })
      .strict()
      .optional(),
    componentsUrl: z.string().optional(),
    editUrl: z.string().optional(),
  })
  .strict();

/** Schema for a final configuration after defaults have been applied. */
export const normalizedDocConfigSchema = docConfigSchema.extend({
  name: nonEmptyString,
});

export type DocConfigInput = z.input<typeof docConfigSchema>;
export type DocConfigOutput = z.output<typeof normalizedDocConfigSchema>;

/** Formats Zod issues as stable dotted paths suitable for CLI and browser diagnostics. */
export function formatConfigIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "config"}: ${issue.message}`)
    .join("\n");
}

/** Validates an unknown configuration value before it enters the runtime. */
export function parseDocConfig(input: unknown): DocConfigInput {
  const result = docConfigSchema.safeParse(input);
  if (result.success) return result.data;

  throw new Error(`Invalid DocMeDown configuration:\n${formatConfigIssues(result.error)}`);
}
