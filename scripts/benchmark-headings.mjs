import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { captureCpuProfile } from "./heading-cpu-profile.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function fingerprintCorpus(root, configPath, documents) {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : ""));
  let sourceBytes = 0;
  for (const document of documents) {
    const raw = fs.readFileSync(path.join(root, document.path), "utf8");
    hash.update(JSON.stringify([document.path, raw]));
    sourceBytes += Buffer.byteLength(raw);
  }
  return { sourceBytes, sourceSha256: hash.digest("hex") };
}

export function parseOptions(args) {
  const options = { sizes: [100, 1000], rounds: 3, warmups: 1, sections: 4 };
  for (let index = 0; index < args.length; index += 2) {
    if (!args[index].startsWith("--")) throw new Error(`Expected option flag: ${args[index]}`);
    const name = args[index].replace(/^--/, "");
    if (name === "corpus" || name === "cpu-profile") {
      const directory = args[index + 1];
      if (!directory || directory.startsWith("--")) throw new Error(`--${name} expects a directory`);
      options[name === "corpus" ? "corpus" : "cpuProfile"] = path.resolve(directory);
      continue;
    }
    if (!["sizes", "rounds", "warmups", "sections"].includes(name)) throw new Error(`Unknown option: ${args[index]}`);
    const raw = args[index + 1];
    if (!raw || !/^\d+(,\d+)*$/.test(raw)) throw new Error(`Expected integer value for --${name}`);
    const values = raw.split(",").map(Number);
    if (values.some((value) => !Number.isSafeInteger(value) || value < (name === "warmups" ? 0 : 1))) {
      throw new Error(`Out-of-range value for --${name}`);
    }
    if (name !== "sizes" && values.length !== 1) throw new Error(`--${name} expects one integer`);
    options[name] = name === "sizes" ? [...new Set(values)] : values[0];
  }
  if (options.corpus && args.some((arg) => arg === "--sizes" || arg === "--sections")) {
    throw new Error("--sizes and --sections apply only to synthetic corpora");
  }
  if (options.cpuProfile) {
    // Resolve symlinked ancestors too: profiles must never enter a source tree.
    const canonical = (directory) => {
      if (fs.existsSync(directory)) return fs.realpathSync(directory);
      return path.join(canonical(path.dirname(directory)), path.basename(directory));
    };
    for (const root of [path.resolve(path.dirname(scriptPath), ".."), options.corpus].filter(Boolean)) {
      const relative = path.relative(canonical(root), canonical(options.cpuProfile));
      if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
        throw new Error("--cpu-profile must be outside the repository and corpus source trees");
      }
    }
  }
  return options;
}

export function createDocument(index, profile, sections) {
  const blocks = [`# Document ${index}`, "## Setup", "## Setup-2", "## Setup"];
  for (let section = 0; section < sections; section++) {
    blocks.push(
      `## Section ${section}`,
      "### **Details** &amp; `usage`",
      "#### Fourth",
      "##### Fifth",
      "###### Sixth",
      `Setext ${section}\n----------`,
      "A documentation paragraph with [a guide](../guide.md), **emphasis**, and `inline code`. ".repeat(5),
    );
    if (profile === "rich") {
      blocks.push(
        '```typescript\nconst example = { title: "# Not a heading", count: 42 };\n```',
        "```markdown\n# Fenced example\n```",
        "    # Indented example",
        "<!--\n# Comment example\n-->",
        "> [!NOTE]\n> A callout with **formatting**.",
        "| Name | Value |\n| --- | --- |\n| Mode | Offline |",
        "Inline math $a^2+b^2=c^2$ and display math:\n\n$$E=mc^2$$",
        "<Callout>\n\nA component body with **Markdown**, but no extra headings.\n\n</Callout>",
      );
    }
  }
  const body = `${blocks.join("\n\n")}\n`;
  return {
    body,
    raw: `---\ntitle: Document ${index}\norder: ${index}\ntags: [benchmark, ${profile}]\n---\n${body}`,
    expectedHeadings: 4 + sections * 6,
  };
}

export function summarize(samples) {
  assert.ok(samples.length > 0);
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    minMs: sorted[0],
    medianMs: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    maxMs: sorted.at(-1),
  };
}

function verify(headings, expected) {
  assert.equal(headings.length, expected);
  assert.equal(new Set(headings.map((heading) => heading.id)).size, expected);
  assert.deepEqual(
    headings.slice(1, 4).map((heading) => heading.id),
    ["setup", "setup-2", "setup-3"],
  );
  assert.ok(!headings.some((heading) => /example/i.test(heading.text)));
}

async function worker(mode, size, profile, options) {
  const { extractHeadings, generateManifest } = await import("../src/cli/utils/scanner.ts");
  const { normalizeConfig } = await import("../src/runtime/config.ts");
  const documents = Array.from({ length: size }, (_, index) => createDocument(index, profile, options.sections));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dmd-heading-benchmark-"));
  try {
    if (mode === "manifest") {
      for (const [index, document] of documents.entries()) {
        const dir = path.join(root, `category-${Math.floor(index / 100)}`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `doc-${index}.md`), document.raw);
      }
    }
    const config = normalizeConfig();
    const samples = [];
    let firstPassMs;
    for (let round = 0; round < options.warmups + options.rounds; round++) {
      const start = performance.now();
      const result =
        mode === "manifest"
          ? generateManifest(root, config).docs.map((document) => document.headings)
          : documents.map((document) => extractHeadings(document.body));
      const elapsed = performance.now() - start;
      firstPassMs ??= elapsed;
      // Correctness checks and fixture construction are outside the timed region.
      assert.equal(result.length, size);
      for (const headings of result) verify(headings, documents[0].expectedHeadings);
      if (round >= options.warmups) samples.push(elapsed);
    }
    const cpuProfile = await captureCpuProfile(
      options.cpuProfile,
      `${profile}-${size}-${mode}`,
      options.rounds,
      () =>
        mode === "manifest"
          ? generateManifest(root, config).docs.map((document) => document.headings)
          : documents.map((document) => extractHeadings(document.body)),
      (result) => {
        assert.equal(result.length, size);
        for (const headings of result) verify(headings, documents[0].expectedHeadings);
      },
    );
    const summary = summarize(samples);
    return {
      mode,
      profile,
      documents: size,
      sectionsPerDocument: options.sections,
      sourceBytes: documents.reduce((total, document) => total + Buffer.byteLength(document.raw), 0),
      headings: size * documents[0].expectedHeadings,
      firstPassMs,
      samplesMs: samples,
      ...summary,
      documentsPerSecond: (size * 1000) / summary.medianMs,
      workerPeakRssMiB: process.resourceUsage().maxRSS / 1024,
      ...(cpuProfile ? { cpuProfile } : {}),
    };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function corpusWorker(mode, options) {
  const { extractHeadings, generateManifest } = await import("../src/cli/utils/scanner.ts");
  const { resolveExistingConfigPath } = await import("../src/cli/utils/docs-layout.ts");
  const { normalizeConfig, parseDocConfigJson } = await import("../src/runtime/config.ts");
  const configPath = resolveExistingConfigPath(options.corpus);
  const hasConfig = fs.existsSync(configPath);
  const configSource = hasConfig ? fs.readFileSync(configPath, "utf8") : "";
  const config = normalizeConfig(hasConfig ? parseDocConfigJson(configSource, configPath) : {});
  // Establish the expected production corpus outside timing. No build, linking,
  // or configuration writes are performed against the selected root.
  const baseline = generateManifest(options.corpus, config);
  const documents = [...baseline.docs].sort((a, b) => a.path.localeCompare(b.path, "en"));
  assert.ok(documents.length > 0, "Corpus contains no indexed Markdown documents");
  const { sourceBytes, sourceSha256 } = fingerprintCorpus(options.corpus, configPath, documents);
  const expected = new Map(documents.map((document) => [document.path, document.headings]));
  const samples = [];
  const perDocument = new Map(documents.map((document) => [document.path, []]));
  let firstPassMs;
  for (let round = 0; round < options.warmups + options.rounds; round++) {
    const start = performance.now();
    const actual =
      mode === "manifest"
        ? generateManifest(options.corpus, config).docs
        : documents.map((document) => ({ path: document.path, headings: extractHeadings(document.content ?? "") }));
    const elapsed = performance.now() - start;
    firstPassMs ??= elapsed;
    assert.equal(actual.length, documents.length);
    assert.equal(new Set(actual.map((document) => document.path)).size, documents.length);
    for (const document of actual) assert.deepEqual(document.headings, expected.get(document.path));
    if (round >= options.warmups) samples.push(elapsed);
  }
  // A separate profiling pass keeps per-document timer overhead out of aggregate
  // samples. Run multiple passes to rank by median rather than a single outlier.
  if (mode === "extraction") {
    for (let round = 0; round < options.rounds; round++) {
      for (const document of documents) {
        const start = performance.now();
        const headings = extractHeadings(document.content ?? "");
        const elapsed = performance.now() - start;
        assert.deepEqual(headings, document.headings);
        perDocument.get(document.path).push(elapsed);
      }
    }
  }
  const cpuProfile = await captureCpuProfile(
    options.cpuProfile,
    `corpus-${mode}`,
    options.rounds,
    () =>
      mode === "manifest"
        ? generateManifest(options.corpus, config).docs
        : documents.map((document) => ({ path: document.path, headings: extractHeadings(document.content ?? "") })),
    (actual) => {
      assert.equal(actual.length, documents.length);
      assert.equal(new Set(actual.map((document) => document.path)).size, documents.length);
      for (const document of actual) assert.deepEqual(document.headings, expected.get(document.path));
    },
  );
  assert.equal(
    fingerprintCorpus(options.corpus, configPath, documents).sourceSha256,
    sourceSha256,
    "Corpus sources changed during measurement; rerun with stable sources",
  );
  const summary = summarize(samples);
  return {
    mode,
    profile: "corpus",
    documents: documents.length,
    sourceBytes,
    sourceSha256,
    headings: documents.reduce((total, document) => total + document.headings.length, 0),
    locales: [...new Set(documents.map((document) => document.locale))].sort(),
    firstPassMs,
    samplesMs: samples,
    ...summary,
    documentsPerSecond: (documents.length * 1000) / summary.medianMs,
    workerPeakRssMiB: process.resourceUsage().maxRSS / 1024,
    ...(cpuProfile ? { cpuProfile } : {}),
    ...(mode === "extraction"
      ? {
          slowestDocuments: documents
            .map((document) => ({
              path: document.path,
              bodyBytes: Buffer.byteLength(document.content ?? ""),
              headings: document.headings.length,
              ...summarize(perDocument.get(document.path)),
            }))
            .sort((a, b) => b.medianMs - a.medianMs)
            .slice(0, 10),
        }
      : {}),
  };
}

async function main(args) {
  if (args[0] === "--worker") {
    const [, mode, size, profile, encoded] = args;
    const options = JSON.parse(encoded);
    console.log(
      JSON.stringify(
        options.corpus ? await corpusWorker(mode, options) : await worker(mode, Number(size), profile, options),
      ),
    );
    return;
  }
  const options = parseOptions(args);
  const results = [];
  for (const size of options.corpus ? [0] : options.sizes) {
    for (const profile of options.corpus ? ["corpus"] : ["prose", "rich"]) {
      for (const mode of ["extraction", "manifest"]) {
        // Sequential fresh processes isolate each case from caches in other cases.
        const child = spawnSync(
          process.execPath,
          ["--import", "tsx", scriptPath, "--worker", mode, String(size), profile, JSON.stringify(options)],
          { encoding: "utf8", cwd: path.dirname(scriptPath) },
        );
        if (child.status !== 0) throw new Error(child.stderr || child.error?.message || "Benchmark worker failed");
        results.push(JSON.parse(child.stdout));
      }
    }
  }
  if (options.corpus) {
    assert.equal(
      results[0].sourceSha256,
      results[1].sourceSha256,
      "Corpus changed between workers; rerun with stable sources",
    );
  }
  console.log(
    JSON.stringify(
      {
        schemaVersion: 1,
        measuredAt: new Date().toISOString(),
        environment: {
          node: process.version,
          platform: process.platform,
          arch: process.arch,
          cpu: os.cpus()[0]?.model,
          logicalCpus: os.cpus().length,
        },
        options,
        results,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
