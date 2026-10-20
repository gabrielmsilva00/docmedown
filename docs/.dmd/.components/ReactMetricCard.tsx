import React, { useState } from "react";

export interface ReactMetricProps {
  label?: string;
  initial?: number;
  unit?: string;
}

export default function ReactMetricCard({
  label = "Query Throughput",
  initial = 1200,
  unit = "req/s",
}: ReactMetricProps) {
  const [val, setVal] = useState(Number(initial));

  return (
    <div
      className="dmd-custom-panel"
      style={{
        margin: "1.25rem 0",
        padding: "1rem",
        border: "1px solid var(--dmd-border-color)",
        borderRadius: "10px",
        background: "var(--dmd-bg-card)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>{label} (React TSX)</strong>
        <span
          style={{
            fontSize: "0.8rem",
            padding: "0.2rem 0.5rem",
            borderRadius: "4px",
            background: "var(--dmd-accent-subtle)",
            color: "var(--dmd-accent)",
            fontWeight: "700",
          }}
        >
          React Component
        </span>
      </div>
      <p style={{ color: "var(--dmd-text-secondary)", margin: "0.5rem 0 0.75rem", fontSize: "0.9rem" }}>
        Authored in React TSX, automatically converted to native Svelte base Ahead-of-Time!
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          type="button"
          onClick={() => setVal(Number(val) + 50)}
          style={{
            border: "1px solid var(--dmd-accent)",
            borderRadius: "6px",
            padding: "0.45rem 0.75rem",
            background: "var(--dmd-accent-subtle)",
            color: "var(--dmd-text-primary)",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Boost: {val} {unit}
        </button>
        <button
          type="button"
          onClick={() => setVal(Number(initial))}
          style={{
            border: "1px solid var(--dmd-border-color)",
            borderRadius: "6px",
            padding: "0.45rem 0.75rem",
            background: "transparent",
            color: "var(--dmd-text-secondary)",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
