import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../provider/ThemeProvider";
import type { ThemeDensity, ThemeFamily } from "../types";

const families: Array<{ family: ThemeFamily; label: string; description: string }> = [
  { family: "atlas", label: "Atlas", description: "Editorial technical reference" },
  { family: "blueprint", label: "Blueprint", description: "Structured and schematic" },
  { family: "terminal", label: "Terminal", description: "Compact operational console" },
  { family: "editorial", label: "Editorial", description: "Spacious publication reading" },
];

export const AppearanceMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { family, density, mode, resolvedMode, setFamily, setDensity, setMode, toggleMode } = useTheme();

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="dmd-appearance" ref={menuRef}>
      <button
        type="button"
        className="dmd-appearance-trigger"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={`dmd-theme-mark dmd-theme-mark-${family}`} aria-hidden="true" />
        <span className="dmd-appearance-trigger-label">Appearance</span>
      </button>

      {isOpen && (
        <section className="dmd-appearance-panel" role="dialog" aria-label="Documentation appearance">
          <div className="dmd-appearance-heading">
            <span>Appearance</span>
            <button
              type="button"
              className="dmd-appearance-close"
              aria-label="Close appearance menu"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="dmd-appearance-section">
            <div className="dmd-appearance-label">Theme family</div>
            <div className="dmd-theme-family-grid">
              {families.map((item) => (
                <button
                  type="button"
                  key={item.family}
                  className={`dmd-theme-family-card ${family === item.family ? "active" : ""}`}
                  aria-pressed={family === item.family}
                  onClick={() => setFamily(item.family)}
                >
                  <span className={`dmd-theme-preview dmd-theme-preview-${item.family}`} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="dmd-theme-family-name">{item.label}</span>
                  <span className="dmd-theme-family-description">{item.description}</span>
                </button>
              ))}
            </div>
          </div>

          <fieldset className="dmd-appearance-section">
            <legend className="dmd-appearance-label">Mode</legend>
            <div className="dmd-segmented-control">
              {(["auto", "light", "dark"] as const).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={mode === item ? "active" : ""}
                  onClick={() => setMode(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <button type="button" className="dmd-appearance-quick-mode" onClick={toggleMode}>
              Use {resolvedMode === "dark" ? "light" : "dark"} now
            </button>
          </fieldset>

          <fieldset className="dmd-appearance-section">
            <legend className="dmd-appearance-label">Reading density</legend>
            <div className="dmd-segmented-control">
              {(["comfortable", "compact"] as ThemeDensity[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={density === item ? "active" : ""}
                  onClick={() => setDensity(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </fieldset>
        </section>
      )}
    </div>
  );
};
