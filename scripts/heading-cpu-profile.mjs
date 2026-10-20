import assert from "node:assert/strict";
import fs from "node:fs";
import { Session } from "node:inspector/promises";
import path from "node:path";

// Module ownership, not guesses based on anonymous or transpiled function names.
// Dependencies are grouped only where their role is explicit in this renderer.
const stageRules = [
  ["math", /\/(?:src\/runtime\/markdown\/katex\.ts|node_modules\/katex\/.*)$/],
  ["highlighting", /\/(?:src\/runtime\/markdown\/highlighter\.ts|node_modules\/prismjs\/.*)$/],
  ["callouts", /\/src\/runtime\/markdown\/callouts\.ts$/],
  ["components", /\/src\/runtime\/markdown\/component-body\.ts$/],
  ["tables", /\/src\/runtime\/markdown\/tables\.ts$/],
  ["heading-text", /\/src\/runtime\/markdown\/inline-text\.ts$/],
  ["frontmatter", /\/(?:src\/runtime\/markdown\/frontmatter\.ts|node_modules\/(?:gray-matter|js-yaml)\/.*)$/],
  ["markdown-core", /\/node_modules\/marked\/.*$/],
  ["parser-orchestration", /\/src\/runtime\/markdown\/parser\.ts$/],
  ["manifest-scanning", /\/src\/cli\/utils\/scanner\.ts$/],
];

function frameStage(frame) {
  if (!frame.url) {
    if (frame.functionName === "(garbage collector)") return "garbage-collection";
    if (frame.functionName === "(idle)") return "idle";
    return undefined;
  }
  // Inspector source URLs normally retain the original TS module path even when
  // line locations/function names refer to generated code. Unknown layouts stay
  // unclassified; never infer a stage from a function name alone.
  if (!frame.url.startsWith("file:")) return undefined;
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(frame.url).pathname);
  } catch {
    return undefined;
  }
  return stageRules.find(([, rule]) => rule.test(pathname))?.[0];
}

/** Partition sampled stacks by nearest known module; inclusive counts overlap. */
export function summarizeStageSamples(profile) {
  const nodes = new Map();
  const parents = new Map();
  for (const node of profile.nodes) {
    assert.ok(!nodes.has(node.id), `Duplicate CPU profile node: ${node.id}`);
    nodes.set(node.id, node);
    for (const child of node.children ?? []) {
      assert.ok(!parents.has(child), `CPU profile node has multiple parents: ${child}`);
      parents.set(child, node.id);
    }
  }
  for (const child of parents.keys()) assert.ok(nodes.has(child), `Missing CPU profile child: ${child}`);
  const ancestry = new Map();
  const stages = new Map(
    [...stageRules.map(([stage]) => stage), "garbage-collection", "idle", "unattributed"].map((stage) => [
      stage,
      { stage, leafSamples: 0, exclusiveSamples: 0, inclusiveSamples: 0 },
    ]),
  );
  for (const id of profile.samples ?? []) {
    assert.ok(nodes.has(id), `Unknown sampled CPU profile node: ${id}`);
    let stack = ancestry.get(id);
    if (!stack) {
      stack = [];
      const seen = new Set();
      for (let current = id; current !== undefined; current = parents.get(current)) {
        assert.ok(!seen.has(current), `Cyclic CPU profile ancestry: ${current}`);
        seen.add(current);
        const stage = frameStage(nodes.get(current).callFrame);
        if (stage) stack.push(stage);
      }
      ancestry.set(id, stack);
    }
    const leafStage = frameStage(nodes.get(id).callFrame) ?? "unattributed";
    const exclusiveStage = stack[0] ?? "unattributed";
    stages.get(leafStage).leafSamples++;
    stages.get(exclusiveStage).exclusiveSamples++;
    for (const stage of new Set(stack.length ? stack : ["unattributed"])) stages.get(stage).inclusiveSamples++;
  }
  return {
    method: "nearest-known-module-v1",
    stages: [...stages.values()],
  };
}

/** Leaf sample counts, not exact stage durations or inclusive stack costs. */
export function summarizeCpuProfile(profile) {
  const counts = new Map();
  for (const id of profile.samples ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
  return {
    samples: profile.samples?.length ?? 0,
    durationMs: (profile.endTime - profile.startTime) / 1000,
    attribution: summarizeStageSamples(profile),
    topFrames: profile.nodes
      .filter((node) => counts.has(node.id))
      .map((node) => ({
        functionName: node.callFrame.functionName,
        url: node.callFrame.url,
        lineNumber: node.callFrame.lineNumber,
        samples: counts.get(node.id),
      }))
      .sort((a, b) => b.samples - a.samples)
      .slice(0, 20),
  };
}

/** Capture only extra workload passes, never imports, fixture writes, or checks. */
export async function captureCpuProfile(directory, label, rounds, run, verify) {
  if (!directory) return undefined;
  const session = new Session();
  session.connect();
  let result;
  let profile;
  try {
    await session.post("Profiler.enable");
    await session.post("Profiler.setSamplingInterval", { interval: 1000 });
    await session.post("Profiler.start");
    try {
      for (let round = 0; round < rounds; round++) result = run();
    } finally {
      ({ profile } = await session.post("Profiler.stop"));
    }
  } finally {
    session.disconnect();
  }
  verify(result);
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, `${label}-${process.pid}-${Date.now()}.cpuprofile`);
  fs.writeFileSync(file, JSON.stringify(profile), { flag: "wx" });
  return { file, rounds, samplingIntervalUs: 1000, ...summarizeCpuProfile(profile) };
}
