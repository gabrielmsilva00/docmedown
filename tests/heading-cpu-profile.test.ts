import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeStageSamples } from "../scripts/heading-cpu-profile.mjs";

function node(id: number, url: string, children: number[] = [], functionName = "") {
  return { id, children, callFrame: { functionName, url, lineNumber: 0 } };
}

test("CPU stage attribution distinguishes leaf, nearest module, and overlapping ancestors", () => {
  const profile = {
    nodes: [
      node(1, "", [2, 8, 9, 10]),
      node(2, "file:///C:/repo/src/cli/utils/scanner.ts", [3]),
      node(3, "file:///C:/repo/src/runtime/markdown/parser.ts", [4, 7]),
      node(4, "file:///C:/repo/src/runtime/markdown/katex.ts", [5]),
      node(5, "file:///C:/repo/node_modules/katex/dist/katex.js", [6]),
      node(6, "node:internal/native-regexp"),
      node(7, "file:///C:/repo/node_modules/marked/lib/marked.cjs"),
      node(8, "", [], "(garbage collector)"),
      node(9, "", [], "(idle)"),
      node(10, "file:///unknown/anonymous.js"),
    ],
    samples: [6, 6, 7, 8, 9, 10, 3],
  };
  const { method, stages } = summarizeStageSamples(profile);
  assert.equal(method, "nearest-known-module-v1");
  const stage = (name: string) => stages.find((entry) => entry.stage === name);
  assert.deepEqual(stage("math"), { stage: "math", leafSamples: 0, exclusiveSamples: 2, inclusiveSamples: 2 });
  assert.deepEqual(stage("parser-orchestration"), {
    stage: "parser-orchestration",
    leafSamples: 1,
    exclusiveSamples: 1,
    inclusiveSamples: 4,
  });
  assert.equal(stage("manifest-scanning").inclusiveSamples, 4);
  assert.equal(stage("unattributed").leafSamples, 3);
  assert.equal(stage("unattributed").exclusiveSamples, 1);
  assert.equal(stage("garbage-collection").exclusiveSamples, 1);
  assert.equal(stage("idle").exclusiveSamples, 1);
  for (const field of ["leafSamples", "exclusiveSamples"]) {
    assert.equal(
      stages.reduce((sum, entry) => sum + entry[field], 0),
      profile.samples.length,
    );
  }
  assert.ok(stages.reduce((sum, entry) => sum + entry.inclusiveSamples, 0) > profile.samples.length);
});

test("CPU stage ownership uses decoded source module URLs, not names", () => {
  const urls = [
    ["math", "file:///repo%20space/src/runtime/markdown/katex.ts"],
    ["highlighting", "file:///repo/node_modules/prismjs/prism.js"],
    ["components", "file:///repo/src/runtime/markdown/component-body.ts"],
    ["frontmatter", "file:///repo/node_modules/js-yaml/lib/js-yaml/loader.js"],
    ["unattributed", "file:///repo/dist/parser.js"],
    ["unattributed", "file:///repo/%invalid"],
    ["unattributed", "https://host/src/runtime/markdown/katex.ts"],
  ];
  for (const [expected, url] of urls) {
    const { stages } = summarizeStageSamples({ nodes: [node(1, url, [], "renderMath")], samples: [1] });
    assert.equal(stages.find((entry) => entry.stage === expected).exclusiveSamples, 1, url);
  }
  assert.ok(summarizeStageSamples({ nodes: [node(1, "")] }).stages.every((entry) => !entry.exclusiveSamples));
});

test("CPU stage attribution rejects inconsistent sampled trees", () => {
  for (const profile of [
    { nodes: [node(1, ""), node(1, "")], samples: [] },
    { nodes: [node(1, "", [2])], samples: [1] },
    { nodes: [node(1, "")], samples: [99] },
    { nodes: [node(1, "", [2]), node(2, "", [1])], samples: [1] },
    { nodes: [node(1, "", [3]), node(2, "", [3]), node(3, "")], samples: [3] },
  ])
    assert.throws(() => summarizeStageSamples(profile));
});
