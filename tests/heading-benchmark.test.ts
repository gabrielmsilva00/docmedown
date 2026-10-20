import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { createDocument, parseOptions, summarize } from "../scripts/benchmark-headings.mjs";
import { captureCpuProfile, summarizeCpuProfile, summarizeStageSamples } from "../scripts/heading-cpu-profile.mjs";
import { extractHeadings } from "../src/cli/utils/scanner";
import { makeTempDir, writeFiles } from "./helpers/temp";

test("benchmark fixtures have predictable rendered heading counts in both profiles", () => {
  for (const profile of ["prose", "rich"]) {
    const fixture = createDocument(7, profile, 2);
    const headings = extractHeadings(fixture.body);
    assert.equal(headings.length, fixture.expectedHeadings);
    assert.equal(headings.length, 16);
    assert.equal(new Set(headings.map((heading) => heading.id)).size, 16);
    assert.ok(!headings.some((heading) => /example/i.test(heading.text)));
  }
});

test("benchmark options reject malformed and invalid measurements", () => {
  assert.deepEqual(parseOptions([]), { sizes: [100, 1000], rounds: 3, warmups: 1, sections: 4 });
  assert.deepEqual(parseOptions(["--sizes", "1,5,5", "--warmups", "0"]), {
    sizes: [1, 5],
    rounds: 3,
    warmups: 0,
    sections: 4,
  });
  for (const args of [
    ["--rounds", "0"],
    ["--sizes", "-1"],
    ["--other", "1"],
    ["--rounds"],
    ["--rounds", "1,2"],
    ["--sizes", "1.2"],
    ["sizes", "1"],
    ["--sizes", "9007199254740992"],
    ["--corpus"],
    ["--cpu-profile"],
    ["--cpu-profile", path.resolve(__dirname, "..")],
    ["--cpu-profile", makeTempDir("dmd-cpu-options"), "--cpuProfile", "1"],
    ["--corpus", "--rounds", "1"],
    ["--corpus", ".", "--sizes", "1"],
    ["--sections", "2", "--corpus", "."],
  ])
    assert.throws(() => parseOptions(args));
  assert.deepEqual(summarize([3, 1, 2]), { minMs: 1, medianMs: 2, maxMs: 3 });
  assert.deepEqual(summarize([4, 2]), { minMs: 2, medianMs: 3, maxMs: 4 });
});

test("real-corpus benchmark honors locale and nested-root isolation without writing sources", () => {
  const root = makeTempDir("dmd-real-corpus-benchmark");
  const profileDir = makeTempDir("dmd-real-corpus-cpu");
  const files = {
    "docs.json": JSON.stringify({
      name: "Real corpus",
      i18n: {
        defaultLocale: "en",
        locales: [
          { code: "en", label: "English" },
          { code: "fr", label: "French" },
        ],
      },
    }),
    "README.md": "# Home\n\n## Details\n",
    "README.fr.md": "# Accueil\n\n## Détails\n",
    "guide.md": "# Guide\n\n```md\n# Example\n```\n",
    "AGENTS.md": "# Not indexed",
    ".dmd/generated.md": "# Not indexed",
    "nested/docs.json": "{}",
    "nested/private.md": "# Nested root",
  };
  writeFiles(root, files);
  const run = () =>
    spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        path.resolve(__dirname, "../scripts/benchmark-headings.mjs"),
        "--corpus",
        root,
        "--rounds",
        "1",
        "--warmups",
        "0",
        "--cpu-profile",
        profileDir,
      ],
      { encoding: "utf8" },
    );
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  const report = JSON.parse(first.stdout);
  assert.equal(parseOptions(["--corpus", root]).corpus, root);
  assert.equal(report.results.length, 2);
  for (const measurement of report.results) {
    assert.equal(measurement.documents, 3);
    assert.equal(measurement.headings, 5);
    assert.deepEqual(measurement.locales, ["en", "fr"]);
    assert.match(measurement.sourceSha256, /^[a-f0-9]{64}$/);
    assert.ok(fs.existsSync(measurement.cpuProfile.file));
  }
  assert.equal(report.results[0].slowestDocuments.length, 3);
  assert.equal(report.results[0].sourceSha256, report.results[1].sourceSha256);
  for (const [relative, contents] of Object.entries(files)) {
    assert.equal(fs.readFileSync(path.join(root, relative), "utf8"), contents);
  }
  assert.deepEqual(
    fs.readdirSync(root).sort(),
    [".dmd", "AGENTS.md", "README.fr.md", "README.md", "docs.json", "guide.md", "nested"].sort(),
  );
  fs.appendFileSync(path.join(root, "guide.md"), "\n## New section\n");
  const second = run();
  assert.equal(second.status, 0, second.stderr);
  assert.notEqual(JSON.parse(second.stdout).results[0].sourceSha256, report.results[0].sourceSha256);
});

test("real-corpus benchmark rejects missing or empty roots", () => {
  const root = makeTempDir("dmd-empty-corpus-benchmark");
  for (const directory of [root, path.join(root, "missing")]) {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        path.resolve(__dirname, "../scripts/benchmark-headings.mjs"),
        "--corpus",
        directory,
        "--rounds",
        "1",
        "--warmups",
        "0",
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /no indexed Markdown documents/);
  }
});

test("real-corpus benchmark reports invalid configuration instead of using defaults", () => {
  const root = makeTempDir("dmd-invalid-corpus-benchmark");
  for (const config of ["{broken", ""]) {
    writeFiles(root, { "docs.json": config, "README.md": "# Home" });
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", path.resolve(__dirname, "../scripts/benchmark-headings.mjs"), "--corpus", root],
      { encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /docs\.json/);
  }
});

test("benchmark CLI runs extraction and manifest workers and emits a complete report", () => {
  const profileDir = makeTempDir("dmd-cpu-profile");
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      path.resolve(__dirname, "../scripts/benchmark-headings.mjs"),
      "--sizes",
      "2",
      "--rounds",
      "1",
      "--warmups",
      "0",
      "--sections",
      "1",
      "--cpu-profile",
      profileDir,
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.results.length, 4);
  for (const measurement of report.results) {
    assert.equal(measurement.documents, 2);
    assert.equal(measurement.headings, 20);
    assert.equal(measurement.samplesMs.length, 1);
    assert.ok(measurement.medianMs > 0);
    assert.ok(measurement.workerPeakRssMiB > 0);
    assert.equal(measurement.cpuProfile.rounds, 1);
    assert.equal(measurement.cpuProfile.samplingIntervalUs, 1000);
    const profile = JSON.parse(fs.readFileSync(measurement.cpuProfile.file, "utf8"));
    assert.ok(profile.nodes.length > 0);
    assert.ok(profile.endTime >= profile.startTime);
    assert.deepEqual(summarizeCpuProfile(profile).topFrames, measurement.cpuProfile.topFrames);
    assert.deepEqual(summarizeStageSamples(profile), measurement.cpuProfile.attribution);
    assert.equal(
      measurement.cpuProfile.attribution.stages.reduce((sum, stage) => sum + stage.exclusiveSamples, 0),
      measurement.cpuProfile.samples,
    );
  }
  assert.equal(fs.readdirSync(profileDir).length, 4);
});

test("CPU profile summary counts leaf samples without claiming inclusive stage costs", () => {
  const profile = {
    startTime: 1000,
    endTime: 5000,
    samples: [2, 2, 1],
    nodes: [
      { id: 1, callFrame: { functionName: "caller", url: "file:///caller.js", lineNumber: 0 } },
      { id: 2, callFrame: { functionName: "callee", url: "file:///callee.js", lineNumber: 8 } },
    ],
  };
  const summary = summarizeCpuProfile(profile);
  assert.equal(summary.durationMs, 4);
  assert.equal(summary.samples, 3);
  assert.deepEqual(
    summary.topFrames.map((frame) => frame.samples),
    [2, 1],
  );
});

test("CPU capture is opt-in and failed workloads leave no artifacts", async () => {
  const directory = makeTempDir("dmd-cpu-failure");
  const fail = () => {
    throw new Error("workload failed");
  };
  assert.equal(await captureCpuProfile(undefined, "disabled", 1, fail, fail), undefined);
  await assert.rejects(
    captureCpuProfile(directory, "failed", 1, fail, () => {}),
    /workload failed/,
  );
  assert.deepEqual(fs.readdirSync(directory), []);
  const result = await captureCpuProfile(
    directory,
    "recovered",
    1,
    () => 42,
    (value) => assert.equal(value, 42),
  );
  assert.ok(fs.existsSync(result.file));
});

test("CPU profiles cannot be written inside a corpus or through symlinked source ancestors", () => {
  const root = makeTempDir("dmd-cpu-source");
  const aliasRoot = makeTempDir("dmd-cpu-alias");
  assert.throws(() => parseOptions(["--corpus", root, "--cpu-profile", path.join(root, "profiles")]), /outside/);
  const alias = path.join(aliasRoot, "source");
  fs.symlinkSync(root, alias, process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => parseOptions(["--corpus", root, "--cpu-profile", path.join(alias, "profiles")]), /outside/);
  assert.deepEqual(fs.readdirSync(root), []);
});
