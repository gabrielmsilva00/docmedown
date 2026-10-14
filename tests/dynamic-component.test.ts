import assert from "node:assert/strict";
import { test } from "node:test";
import { detectComponentKind } from "../src/runtime/bridges/dynamic-component";
import { kebabToCamelCase, normalizeAttributeValue } from "../src/runtime/bridges/react-bridge";
import { computeSourceHash } from "../src/runtime/compiler-cache";
import { compileTsx, lightweightTransformTsx } from "../src/runtime/ts-compiler";

test("framework detector identifies Svelte, React, and Web Elements", () => {
  assert.equal(detectComponentKind("", "Widget.svelte"), "svelte");
  assert.equal(detectComponentKind("", "MetricCard.tsx"), "react");
  assert.equal(detectComponentKind("", "Button.jsx"), "react");
  assert.equal(detectComponentKind("", "UserBadge.lit.ts"), "element");
  assert.equal(detectComponentKind("", "CustomTag.wc.js"), "element");

  // Source-based detection
  assert.equal(detectComponentKind("<script>let count = $state(0);</script><button>{count}</button>"), "svelte");
  assert.equal(
    detectComponentKind("import React, { useState } from 'react'; export default function App() {}"),
    "react",
  );
  assert.equal(
    detectComponentKind("import { LitElement, html } from 'lit'; export class Badge extends LitElement {}"),
    "element",
  );

  // Function/class detection
  function ReactSample() {
    return null;
  }
  assert.equal(detectComponentKind(ReactSample), "react");

  class MockElement {
    static properties = {};
    connectedCallback() {}
  }
  assert.equal(detectComponentKind(MockElement), "element");
});

test("attribute normalizer transforms primitives, booleans, numbers, and JSON", () => {
  assert.equal(normalizeAttributeValue(null), undefined);
  assert.equal(normalizeAttributeValue(""), true);
  assert.equal(normalizeAttributeValue("true"), true);
  assert.equal(normalizeAttributeValue("false"), false);
  assert.equal(normalizeAttributeValue("null"), null);
  assert.equal(normalizeAttributeValue("undefined"), undefined);
  assert.equal(normalizeAttributeValue("100"), 100);
  assert.equal(normalizeAttributeValue("-42.5"), -42.5);
  assert.deepEqual(normalizeAttributeValue('{"theme": "dark", "level": 3}'), { theme: "dark", level: 3 });
  assert.deepEqual(normalizeAttributeValue('[1, 2, "three"]'), [1, 2, "three"]);
  assert.equal(normalizeAttributeValue("Hello World"), "Hello World");

  assert.equal(kebabToCamelCase("user-name"), "userName");
  assert.equal(kebabToCamelCase("default-count-val"), "defaultCountVal");
  assert.equal(kebabToCamelCase("plain"), "plain");
});

test("dynamic TSX compiler transforms JSX, fragments, and strips types", async () => {
  const tsxSource = `
import type { ReactNode } from "react";
interface MyProps {
  label: string;
  count: number;
}
export default function Widget({ label, count }: MyProps) {
  return <><h4>{label}</h4><span>{count as any}</span></>;
}
  `.trim();

  const transformed = lightweightTransformTsx(tsxSource);
  assert.ok(!transformed.includes("interface MyProps"));
  assert.ok(!transformed.includes("import type"));
  assert.ok(transformed.includes("React.createElement(React.Fragment, null,"));

  const compiled = await compileTsx(tsxSource, { filename: "Widget.tsx" });
  assert.ok(compiled.length > 0);
  assert.ok(!compiled.includes("interface MyProps"));
});

test("SHA-256 hash generator produces deterministic hashes", async () => {
  const hash1 = await computeSourceHash("function hello() {}", "component.tsx");
  const hash2 = await computeSourceHash("function hello() {}", "component.tsx");
  const hash3 = await computeSourceHash("function hello2() {}", "component.tsx");

  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hash3);
  assert.equal(hash1.length, 64);
});
