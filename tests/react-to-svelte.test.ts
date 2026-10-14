import assert from "node:assert/strict";
import { test } from "node:test";
import { convertReactToSvelte } from "../src/cli/utils/react-to-svelte";

test("converts standard React TSX component to native Svelte 5 custom element", () => {
  const reactSource = `
import React, { useState, useEffect } from 'react';

interface CounterProps {
  label?: string;
  initial?: number;
}

export default function MetricCounter({ label = "Count", initial = 0 }: CounterProps) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    console.log("Updated count to:", count);
  }, [count]);

  return (
    <div className="metric-box" style={{ padding: "10px", margin: "5px" }}>
      <h4>{label}</h4>
      <button onClick={() => setCount(count + 1)}>
        Clicks: {count}
      </button>
    </div>
  );
}
  `.trim();

  const res = convertReactToSvelte(reactSource, { name: "MetricCounter" });
  assert.equal(res.success, true);
  assert.ok(res.svelteSource);

  assert.ok(res.svelteSource.includes('<svelte:options customElement={{ tag: "dmd-metric-counter" }} />'));
  assert.ok(res.svelteSource.includes('let { label = "Count", initial = 0 } = $props();'));
  assert.ok(res.svelteSource.includes("let count = $state(initial);"));
  assert.ok(res.svelteSource.includes("$effect(() => {"));
  assert.ok(res.svelteSource.includes('class="metric-box"'));
  assert.ok(res.svelteSource.includes("onclick={() => count = count + 1}"));
  assert.ok(res.svelteSource.includes('style="padding:10px;margin:5px"'));
});

test("detects unconvertible React features and gracefully signals fallback", () => {
  const contextSource = `
import React, { useContext } from 'react';
import { ThemeContext } from './theme';

export default function ThemeWidget() {
  const theme = useContext(ThemeContext);
  return <div>{theme}</div>;
}
  `.trim();

  const res = convertReactToSvelte(contextSource, { name: "ThemeWidget" });
  assert.equal(res.success, false);
  assert.ok(res.reason?.includes("useContext"));
});

test("handles nested expressions and functional updaters in useState and setters", () => {
  const tsxSource = `
import React, { useState } from 'react';

export default function NumberCard({ initial = 1200 }: { initial?: number }) {
  const [val, setVal] = useState(Number(initial));
  return (
    <div>
      <button onClick={() => setVal(Number(val) + 50)}>Add</button>
      <button onClick={() => setVal((prev) => Number(prev) + 10)}>Arrow</button>
      <button onClick={() => setVal(Number(initial))}>Reset</button>
    </div>
  );
}
  `.trim();

  const res = convertReactToSvelte(tsxSource, { name: "NumberCard" });
  assert.equal(res.success, true);
  assert.ok(res.svelteSource);
  assert.ok(res.svelteSource.includes("let val = $state(Number(initial));"));
  assert.ok(res.svelteSource.includes("onclick={() => val = Number(val) + 50}"));
  assert.ok(res.svelteSource.includes("onclick={() => val = Number(val) + 10}"));
  assert.ok(res.svelteSource.includes("onclick={() => val = Number(initial)}"));
});
