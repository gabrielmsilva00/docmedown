import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { ColorMode, ThemeDensity, ThemeFamily } from "../types";

interface ThemeContextType {
  mode: ColorMode;
  resolvedMode: "light" | "dark";
  family: ThemeFamily;
  density: ThemeDensity;
  setMode: (mode: ColorMode) => void;
  setFamily: (family: ThemeFamily) => void;
  setDensity: (density: ThemeDensity) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};

interface ThemeProviderProps {
  defaultMode?: ColorMode;
  defaultFamily?: ThemeFamily;
  defaultDensity?: ThemeDensity;
  /** Optional brand override for --dmd-accent in light mode. */
  defaultAccentColor?: string;
  /** Optional brand override for --dmd-accent in dark mode. */
  defaultAccentColorDark?: string;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  defaultMode = "auto",
  defaultFamily = "atlas",
  defaultDensity = "comfortable",
  defaultAccentColor,
  defaultAccentColorDark,
  children,
}) => {
  const FAMILY_VALUES: ThemeFamily[] = ["atlas", "blueprint", "terminal", "editorial"];
  const DENSITY_VALUES: ThemeDensity[] = ["comfortable", "compact"];

  const readSavedPreference = <T extends string>(key: string, allowed: T[]): T | null => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(key) as T | null;
    // Discard invalid saved values (e.g. from older runtimes) instead of
    // letting them break attribute-driven styling downstream.
    return saved && allowed.includes(saved) ? saved : null;
  };

  const [mode, setModeState] = useState<ColorMode>(
    () => readSavedPreference("dmd-color-mode", ["light", "dark", "auto"]) ?? defaultMode,
  );

  const [family, setFamilyState] = useState<ThemeFamily>(
    () => readSavedPreference("dmd-theme-family", FAMILY_VALUES) ?? defaultFamily ?? "atlas",
  );

  const [density, setDensityState] = useState<ThemeDensity>(
    () => readSavedPreference("dmd-theme-density", DENSITY_VALUES) ?? defaultDensity ?? "comfortable",
  );

  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const resolvedMode: "light" | "dark" = mode === "auto" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-dmd-mode", resolvedMode);
    root.setAttribute("data-dmd-theme", family);
    root.setAttribute("data-dmd-density", density);
    // Keep this attribute through the migration because third-party themes and
    // Mermaid configuration read it directly.
    root.setAttribute("data-theme", resolvedMode);

    // Config-driven brand color: applied as an inline override so it wins over
    // family tokens without mutating the token layer itself. Mode-specific so
    // dark surfaces can pick a lighter variant of the same brand hue.
    const resolvedAccent = resolvedMode === "dark" ? defaultAccentColorDark || defaultAccentColor : defaultAccentColor;
    if (resolvedAccent) {
      root.style.setProperty("--dmd-accent", resolvedAccent);
      root.style.setProperty("--dmd-accent-hover", resolvedAccent);
    } else {
      root.style.removeProperty("--dmd-accent");
      root.style.removeProperty("--dmd-accent-hover");
    }
  }, [resolvedMode, family, density, defaultAccentColor, defaultAccentColorDark]);

  const setMode = (newMode: ColorMode) => {
    setModeState(newMode);
    if (typeof window !== "undefined") {
      localStorage.setItem("dmd-color-mode", newMode);
    }
  };

  const setFamily = (newFamily: ThemeFamily) => {
    setFamilyState(newFamily);
    if (typeof window !== "undefined") {
      localStorage.setItem("dmd-theme-family", newFamily);
    }
  };

  const setDensity = (newDensity: ThemeDensity) => {
    setDensityState(newDensity);
    if (typeof window !== "undefined") {
      localStorage.setItem("dmd-theme-density", newDensity);
    }
  };

  const toggleMode = () => {
    const nextMode: ColorMode = resolvedMode === "dark" ? "light" : "dark";
    setMode(nextMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        resolvedMode,
        family,
        density,
        setMode,
        setFamily,
        setDensity,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
