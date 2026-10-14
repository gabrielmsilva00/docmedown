import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { bundleCustomComponents } from "../src/cli/commands/build";
import { generateManifest } from "../src/cli/utils/scanner";
import { DEFAULT_CONFIG } from "../src/runtime/config";

test("multi-framework custom components (.svelte, .tsx, .ts) are discovered and bundled", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-mf-test-"));
  const dmdDir = path.join(tempDir, ".dmd");
  fs.mkdirSync(dmdDir, { recursive: true });

  try {
    // 1. Svelte 5 component
    fs.writeFileSync(
      path.join(dmdDir, "SvelteWidget.svelte"),
      `
<script>
  let { title = "Svelte" } = $props();
  let count = $state(0);
</script>
<button onclick={() => count++}>{title}: {count}</button>
      `.trim(),
      "utf-8",
    );

    // 2. React TSX component (convertible to native Svelte base)
    fs.writeFileSync(
      path.join(dmdDir, "ReactMetric.tsx"),
      `
import React, { useState } from 'react';

interface MetricProps {
  label?: string;
  initial?: number;
}

export default function ReactMetric({ label = "Success Rate", initial = 99 }: MetricProps) {
  const [val, setVal] = useState(initial);
  return (
    <div className="metric-box">
      <strong>{label}</strong>: {val}%
      <button onClick={() => setVal(val + 1)}>Boost</button>
    </div>
  );
}
      `.trim(),
      "utf-8",
    );

    // 3. React TSX component with unconvertible feature (requires ReactBridge)
    fs.writeFileSync(
      path.join(dmdDir, "ComplexReactWidget.tsx"),
      `
import React, { useContext } from 'react';

export default function ComplexReactWidget() {
  // uses useContext which requires React runtime bridge
  const ctx = useContext(React.createContext("default-context"));
  return <div>Context: {ctx}</div>;
}
      `.trim(),
      "utf-8",
    );

    // 4. Web Component / Lit component
    fs.writeFileSync(
      path.join(dmdDir, "LitBadge.ts"),
      `
export class LitBadgeElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = "<span>Lit Badge</span>";
  }
}
if (typeof customElements !== "undefined" && !customElements.get("dmd-lit-badge")) {
  customElements.define("dmd-lit-badge", LitBadgeElement);
}
export default LitBadgeElement;
      `.trim(),
      "utf-8",
    );

    // Scanner discovery
    const manifest = generateManifest(tempDir, DEFAULT_CONFIG);
    assert.ok(manifest.customComponents, "customComponents should be defined");
    assert.ok(manifest.customComponents.includes("SvelteWidget"));
    assert.ok(manifest.customComponents.includes("ReactMetric"));
    assert.ok(manifest.customComponents.includes("ComplexReactWidget"));
    assert.ok(manifest.customComponents.includes("LitBadge"));

    // Build-time bundling
    const bundled = bundleCustomComponents(tempDir);
    assert.ok(bundled, "bundleCustomComponents should return bundled module code");

    // Check custom element tags in output
    assert.ok(bundled.includes("dmd-svelte-widget"));
    assert.ok(bundled.includes("dmd-react-metric"));
    assert.ok(bundled.includes("dmd-complex-react-widget"));
    assert.ok(bundled.includes("dmd-lit-badge"));

    // Check export map keys
    assert.ok(bundled.includes("SvelteWidget"));
    assert.ok(bundled.includes("ReactMetric"));
    assert.ok(bundled.includes("ComplexReactWidget"));
    assert.ok(bundled.includes("LitBadge"));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
