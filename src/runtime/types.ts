/** DocMeDown runtime type definitions. Configuration types are derived from Zod schemas. */

import type { z } from "zod";
import type {
  colorModeSchema,
  docConfigSchema,
  docSearchConfigSchema,
  docThemeConfigSchema,
  navLinkSchema,
  normalizedDocConfigSchema,
  remoteSourceSchema,
  SidebarItemConfigShape,
  socialLinkSchema,
  themeDensitySchema,
  themeFamilySchema,
  themePresetSchema,
} from "./config-schema";

export type ThemeFamily = z.infer<typeof themeFamilySchema>;
export type ThemeDensity = z.infer<typeof themeDensitySchema>;
/** @deprecated Use ThemeFamily. */
export type ThemePreset = z.infer<typeof themePresetSchema>;
export type ColorMode = z.infer<typeof colorModeSchema>;
export type NavLink = z.infer<typeof navLinkSchema>;
export type SocialLink = z.infer<typeof socialLinkSchema>;
export type RemoteSourceConfig = z.infer<typeof remoteSourceSchema>;
export type GithubSourceConfig = Extract<RemoteSourceConfig, { type: "github" }>;
export type GitlabSourceConfig = Extract<RemoteSourceConfig, { type: "gitlab" }>;
export type RawSourceConfig = Extract<RemoteSourceConfig, { type: "raw" }>;
export type SidebarItemConfig = SidebarItemConfigShape;
export type DocThemeConfig = z.infer<typeof docThemeConfigSchema>;
export type DocSearchConfig = z.infer<typeof docSearchConfigSchema>;
export type PartialDocConfig = z.input<typeof docConfigSchema>;
export type DocConfig = z.output<typeof normalizedDocConfigSchema>;

/** Options accepted by the browser integration entry point. */
export interface DocMeDownInitOptions {
  el?: string | HTMLElement;
  config?: PartialDocConfig;
  basePath?: string;
}

/** Handle returned after mounting DocMeDown into a page. */
export interface DocMeDownInstance {
  element: HTMLElement;
  destroy: () => void;
}

export interface DocHeading {
  level: number;
  /** Readable plain text (badges become alt text; entities decoded) for search and titles. */
  text: string;
  /** Inline-rendered Markdown for display; omitted in manifest-only heading sets. */
  html?: string;
  id: string;
}

export interface DocFrontmatter {
  title?: string;
  sidebar_label?: string;
  sidebar_position?: number;
  order?: number;
  description?: string;
  icon?: string;
  badge?: string;
  badge_type?: "info" | "success" | "warning" | "new";
  tags?: string[];
  hidden?: boolean;
  [key: string]: any;
}

export interface DocFileItem {
  slug: string;
  path: string;
  title: string;
  category?: string;
  frontmatter: DocFrontmatter;
  headings: DocHeading[];
  content?: string;
  readingTimeMinutes?: number;
  lastModified?: string;
}

export interface DocManifest {
  version: string;
  generatedAt: string;
  config: DocConfig;
  docs: DocFileItem[];
  tree: SidebarTreeNode[];
}

export interface SidebarTreeNode {
  id: string;
  title: string;
  slug?: string;
  path?: string;
  icon?: string;
  badge?: string;
  badgeType?: "info" | "success" | "warning" | "new";
  order: number;
  isCategory: boolean;
  collapsed?: boolean;
  children?: SidebarTreeNode[];
}

export interface SearchResultItem {
  id: string;
  slug: string;
  title: string;
  category?: string;
  snippet?: string;
  heading?: string;
  score?: number;
}
