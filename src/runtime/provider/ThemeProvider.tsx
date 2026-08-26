import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { ColorMode, ThemePreset } from "../types";

interface ThemeContextType {
  mode: ColorMode;
  resolvedMode: "light" | "dark";
  preset: ThemePreset;
  setMode: (mode: ColorMode) => void;
  setPreset: (preset: ThemePreset) => void;
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
  defaultPreset?: ThemePreset;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  defaultMode = "auto",
  defaultPreset = "indigo",
  children,
}) => {
  const [mode, setModeState] = useState<ColorMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dmd-color-mode") as ColorMode;
      if (saved) return saved;
    }
    return defaultMode;
  });

  const [preset, setPresetState] = useState<ThemePreset>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dmd-theme-preset") as ThemePreset;
      if (saved) return saved;
    }
    return defaultPreset;
  });

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
    root.setAttribute("data-theme", resolvedMode);
    root.setAttribute("data-preset", preset);
  }, [resolvedMode, preset]);

  const setMode = (newMode: ColorMode) => {
    setModeState(newMode);
    if (typeof window !== "undefined") {
      localStorage.setItem("dmd-color-mode", newMode);
    }
  };

  const setPreset = (newPreset: ThemePreset) => {
    setPresetState(newPreset);
    if (typeof window !== "undefined") {
      localStorage.setItem("dmd-theme-preset", newPreset);
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
        preset,
        setMode,
        setPreset,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
