/**
 * DocMeDown Configuration and Runtime Type Definitions
 */

export type ThemePreset =
  | 'indigo'
  | 'emerald'
  | 'sunset'
  | 'violet'
  | 'rose'
  | 'slate'
  | 'cyberpunk';

export type ColorMode = 'light' | 'dark' | 'auto';

export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
  icon?: string;
}

export interface SocialLink {
  type: 'github' | 'gitlab' | 'twitter' | 'x' | 'discord' | 'custom';
  url: string;
  label?: string;
  icon?: string;
}

export interface RemoteSourceConfig {
  type: 'github' | 'gitlab' | 'raw';
  /** e.g. "facebook/react" or "owner/repo" */
  repo?: string;
  /** e.g. "main" or "master" */
  branch?: string;
  /** Subdirectory where markdown files live, e.g. "docs" or "" */
  docsDir?: string;
  /** Optional personal access token or auth for private repos */
  token?: string;
  /** Raw base URL override */
  baseUrl?: string;
}

export interface SidebarItemConfig {
  title?: string;
  path?: string;
  slug?: string;
  icon?: string;
  badge?: string;
  badgeType?: 'info' | 'success' | 'warning' | 'new';
  collapsed?: boolean;
  children?: SidebarItemConfig[];
}

export interface DocThemeConfig {
  preset?: ThemePreset;
  defaultMode?: ColorMode;
  accentColor?: string;
  accentColorDark?: string;
  fontFamily?: string;
  codeTheme?: 'github' | 'dracula' | 'one-dark' | 'synthwave';
  logo?: {
    light?: string;
    dark?: string;
    alt?: string;
    text?: string;
  };
  favicon?: string;
}

export interface DocSearchConfig {
  enabled?: boolean;
  placeholder?: string;
  maxResults?: number;
}

export interface DocConfig {
  name: string;
  tagline?: string;
  description?: string;
  version?: string;
  rootDoc?: string; // Default doc, e.g. "README.md" or "index.md"
  
  /** Source configuration: local filesystem or remote GitHub/GitLab */
  source?: RemoteSourceConfig;

  /** Visual and theme configurations */
  theme?: DocThemeConfig;

  /** Navigation bar links */
  nav?: NavLink[];

  /** Social and repository links */
  socials?: SocialLink[];

  /** Manual sidebar configuration (optional; auto-indexed if omitted) */
  sidebar?: SidebarItemConfig[];

  /** Auto-indexing options */
  autoIndex?: {
    enabled?: boolean;
    exclude?: string[]; // Glob patterns or file names
    sort?: 'alphabetical' | 'frontmatter' | 'natural';
    defaultCollapsed?: boolean;
  };

  /** Search options */
  search?: DocSearchConfig;

  /** Footer config */
  footer?: {
    copyright?: string;
    links?: NavLink[];
    showBuiltWith?: boolean;
  };

  /** Custom component directory or URL */
  componentsUrl?: string;

  /** Edit page link (e.g. "https://github.com/owner/repo/edit/main/docs/") */
  editUrl?: string;
}

/** Options accepted by the browser integration entry point. */
export interface DocMeDownInitOptions {
  el?: string | HTMLElement;
  config?: Partial<DocConfig>;
  basePath?: string;
}

/** Handle returned after mounting DocMeDown into a page. */
export interface DocMeDownInstance {
  element: HTMLElement;
  destroy: () => void;
}

export interface DocHeading {
  level: number;
  text: string;
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
  badge_type?: 'info' | 'success' | 'warning' | 'new';
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
  badgeType?: 'info' | 'success' | 'warning' | 'new';
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
