import type { ColorMode, ThemeDensity, ThemeFamily } from "../runtime/types";

const FAMILY_VALUES: ThemeFamily[] = ["atlas", "blueprint", "terminal", "editorial"];
const DENSITY_VALUES: ThemeDensity[] = ["comfortable", "compact"];

// localStorage is unavailable under opaque origins (blob: URLs produced by
// openEmbeddedNestedSite, sandboxed iframes, or privacy modes). Reading
// window.localStorage itself throws a SecurityError there, so every access
// is guarded — a crash here took down the entire nested offline document.
function safeGet(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    const storage: Storage | undefined = (window as unknown as { localStorage?: Storage }).localStorage;
    if (!storage) return null;
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return;
    const storage: Storage | undefined = (window as unknown as { localStorage?: Storage }).localStorage;
    storage?.setItem(key, value);
  } catch {
    // storage blocked (opaque origin / quota) — persist is best-effort only.
  }
}

function readSavedPreference<T extends string>(key: string, allowed: T[]): T | null {
  const saved = safeGet(key) as T | null;
  // Discard invalid saved values (e.g. from older runtimes) instead of
  // letting them break attribute-driven styling downstream.
  return saved && allowed.includes(saved) ? saved : null;
}

export interface ThemeInitOptions {
  defaultMode?: ColorMode;
  defaultFamily?: ThemeFamily;
  defaultDensity?: ThemeDensity;
  /** Optional brand override for --dmd-accent in light mode. */
  accentColor?: string;
  /** Optional brand override for --dmd-accent in dark mode. */
  accentColorDark?: string;
}

/** Runes-based theme store: family, color mode, and density with persisted preferences. */
export class ThemeStore {
  mode = $state<ColorMode>("auto");
  family = $state<ThemeFamily>("atlas");
  density = $state<ThemeDensity>("comfortable");
  systemDark = $state(false);

  /** Brand overrides applied by the app as inline `--dmd-accent` tokens. */
  accentColor: string | undefined;
  accentColorDark: string | undefined;

  resolvedMode = $derived<"light" | "dark">(this.mode === "auto" ? (this.systemDark ? "dark" : "light") : this.mode);

  private mediaQuery: MediaQueryList | null = null;
  private mediaHandler: ((event: MediaQueryListEvent) => void) | null = null;

  public init(options: ThemeInitOptions = {}) {
    this.mode = readSavedPreference("dmd-color-mode", ["light", "dark", "auto"]) ?? options.defaultMode ?? "auto";
    this.family = readSavedPreference("dmd-theme-family", FAMILY_VALUES) ?? options.defaultFamily ?? "atlas";
    this.density = readSavedPreference("dmd-theme-density", DENSITY_VALUES) ?? options.defaultDensity ?? "comfortable";
    this.accentColor = options.accentColor;
    this.accentColorDark = options.accentColorDark;

    try {
      if (typeof window !== "undefined") {
        this.systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
    } catch {
      // matchMedia may also be restricted in opaque origins
    }

    try {
      if (typeof window !== "undefined" && window.matchMedia) {
        this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        this.mediaHandler = (event: MediaQueryListEvent) => {
          this.systemDark = event.matches;
        };
        this.mediaQuery.addEventListener("change", this.mediaHandler);
      }
    } catch {
      // ignore opaque-origin listeners
    }
  }

  public setMode(newMode: ColorMode) {
    this.mode = newMode;
    safeSet("dmd-color-mode", newMode);
  }

  public setFamily(newFamily: ThemeFamily) {
    this.family = newFamily;
    safeSet("dmd-theme-family", newFamily);
  }

  public setDensity(newDensity: ThemeDensity) {
    this.density = newDensity;
    safeSet("dmd-theme-density", newDensity);
  }

  public toggleMode() {
    this.setMode(this.resolvedMode === "dark" ? "light" : "dark");
  }

  public destroy() {
    try {
      if (this.mediaQuery && this.mediaHandler) {
        this.mediaQuery.removeEventListener("change", this.mediaHandler);
      }
    } catch {
      // ignore opaque-origin cleanup
    }
    this.mediaQuery = null;
    this.mediaHandler = null;
  }
}

export const theme = new ThemeStore();
