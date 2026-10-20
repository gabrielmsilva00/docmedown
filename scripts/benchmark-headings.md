# Heading-extraction benchmark

Run from the repository root after installing development dependencies:

```sh
npm run benchmark:headings
```

The defaults are `--sizes 100,1000 --rounds 3 --warmups 1 --sections 4`.
For JSON-only stdout (without npm's script banner), use:

```sh
node --import tsx ./scripts/benchmark-headings.mjs --sizes 100,1000 --rounds 3 --warmups 1 --sections 4 > heading-results.json
```

Store reports outside the working tree, or remove them after analysis. A quick
smoke run is `npm run benchmark:headings -- --sizes 2 --rounds 1 --warmups 0 --sections 1`.
All options accept nonnegative integer warmups or positive integer sizes,
rounds, and sections. Only sizes accepts a comma-separated list.

## Read-only real-corpus mode

```sh
npm run benchmark:headings -- --corpus ./docs --rounds 5 --warmups 1
```

Use an absolute path to profile another local documentation root. This mode
does not download repositories, run setup scripts, build output, or link root
Markdown files. It uses production configuration discovery and manifest
generation to select physical documents, including configured locale variants.
Nested documentation roots and agent instruction files stay excluded by the
production scanner. Existing root-document links are included as they are.
Missing or empty roots and invalid configuration fail rather than silently
measuring synthetic data. `--sizes` and `--sections` cannot be used with `--corpus`.

An untimed initial manifest establishes the expected path/heading sets. Extraction
then uses its in-memory bodies, while manifest samples reread the source root.
Each sample must match those expected headings. Consequently even the reported
first pass follows an initial manifest: **all corpus timings are warm**.
Keep source files stable while measuring. A SHA-256 fingerprint covers the
selected config text and sorted indexed paths/raw source text; workers compare
it before/after measurement and against one another. It is a source-snapshot
identifier, not a Git commit or a fingerprint of excluded files and components.

The extraction worker also runs separate per-document passes and reports the
ten slowest median times with relative paths and body sizes. Those timers do not
affect aggregate samples. They identify expensive pages, not CPU-stack attribution.
Peak RSS includes the initial manifest and the per-document passes. Reports
include local paths and machine metadata; review them before sharing publicly.

## Method

### Caller-stack sample attribution

CPU summaries now include `attribution.method: "nearest-known-module-v1"` and
`attribution.stages`, computed from the full sampled parent chain, not just the
top 20 frames. Module URL ownership identifies math, highlighting, callouts,
components, tables, heading-text, frontmatter, Markdown core, parser orchestration,
and manifest scanning; GC, idle, and unattributed samples remain explicit.

- `leafSamples` counts samples whose top frame itself belongs to a known module.
- `exclusiveSamples` assigns each sample to the nearest recognized module while
  walking from leaf to root. An unknown/native child can inherit caller ownership;
  it is not automatically filesystem, regex, or parser work.
- `inclusiveSamples` counts each recognized category once per stack. Recursive
  or repeated modules do not double-count within a category. Different categories
  overlap: **never sum inclusive counts as a partition**.

Leaf and exclusive columns each sum to the captured sample count. No count is
weighted by `timeDeltas`, multiplied by sampling interval, or converted into exact
durations/CPU percentages. Missing categories mean no attributed samples, not
proof of zero work. Original module URLs are decoded; anonymous names and generated
line positions are not used for classification. Bundled/unrecognized source paths
stay unattributed unless a recognized ancestor exists. These are sampled module
ownership buckets, not instrumentation of every rendering stage. Inspect raw
stacks before changing production code. Summary work runs after capture stops.

#### Reanalysis of the existing October 20 capture

The unchanged 64-document snapshot and raw profiles in the scoped-capture section
were reanalyzed without rerunning the corpus. Counts below are **exclusive
samples**, not time estimates or comparisons between equally long workloads:

| Ownership bucket | Extraction (600 samples) | Manifest (603 samples) |
| --- | ---: | ---: |
| Markdown core | 160 | 147 |
| Highlighting | 154 | 124 |
| Math | 137 | 118 |
| Components | 73 | 63 |
| Parser orchestration | 32 | 28 |
| Manifest scanning | 0 | 59 |
| Frontmatter | 0 | 14 |
| Callouts / tables / heading text | 29 | 29 |
| Garbage collection | 13 | 18 |
| Idle / unattributed | 2 | 3 |

For contrast, inclusive Markdown-core counts were 331/282 and inclusive parser
orchestration counts were 585/508: renderer callbacks nest under Markdown parsing,
so those totals overlap. Highlighting and math are investigation candidates on
this project snapshot, not a general enterprise conclusion or authorization to
replace renderer-based heading extraction. Stage-duration attribution remains open.

Attribution-slice validation: 264/264 unit tests, typecheck, lint, documentation
build, and source validation passed (64 documents, 62 links, 1,010 headings; no
warnings). Tests cover nested/recursive ownership, unknown/native children,
decoded URLs, GC/idle, empty samples, count reconciliation, and malformed trees.

### Opt-in scoped CPU profiles

```powershell
node --import tsx ./scripts/benchmark-headings.mjs --corpus ./docs --rounds 5 --warmups 1 --cpu-profile "$env:TEMP/dmd-heading-cpu" > "$env:TEMP/dmd-heading-cpu-report.json"
```

`--cpu-profile` accepts an output directory outside both the repository and the
selected corpus, including symlinked ancestors. It also works with synthetic
cases. Each worker captures an additional `--rounds` warm workload passes with
Node's Inspector CPU profiler at a requested 1,000 µs sampling interval. Imports,
fixture writes, ordinary timing samples, per-document passes, and correctness
checks are outside capture. The final captured result is verified after stopping
the profiler. Profile files use unique names and are never overwritten.

Each result gains `cpuProfile` metadata: profile path, rounds, duration, sample
count, and the top 20 leaf frames. Open the `.cpuprofile` in a CPU-profile viewer
for full caller stacks. Leaf counts are **not** inclusive stage timings, exact
CPU percentages, or wall-clock costs; sampling may miss short work. Transpiled
frames may have anonymous names or generated line positions. Inspect full stacks
and source maps before attributing cost to a rendering stage. Profiling adds
overhead and its allocation/capture work is included in worker peak RSS. Do not
compare that memory figure to an unprofiled baseline as parser-only memory.

Profiles and summaries can expose absolute source paths. Review before sharing;
keep them outside source control. The default benchmark does not write profiles.

Each size/profile/mode combination runs sequentially in a fresh Node process.
Synthetic fixtures contain unique document titles, nested categories (100 pages
per category), heading depths 1–6, Setext headings, inline heading formatting,
and duplicate IDs that collide with authored suffixes. Four sections produce
28 headings per document. The rich profile adds code fences, indented code,
comments, tables, callouts, inline/display math, and component bodies.

- **Extraction** calls the production `extractHeadings()` on in-memory bodies.
  It currently uses the complete Markdown renderer, not a heading-only parser.
- **Manifest** calls production `generateManifest()` on temporary source files,
  including directory discovery, YAML parsing, heading extraction, file metadata,
  localization bookkeeping, and sidebar construction. It does not serialize the
  manifest, prerender a static site, build search/AI exports, or compile components.

Fixture generation, source-file writes, imports, and correctness assertions are
outside timing. Each pass verifies document/heading counts, unique anchors,
duplicate suffix behavior, and exclusion of code/comment examples. Temporary
sources are removed in `finally`. The report includes every measured sample,
min/median/max, throughput, first-pass duration, input bytes (including YAML),
and per-worker peak RSS.

The first pass is **not cold disk I/O**: setup has just written the sources.
Module startup is also excluded. Subsequent passes share JIT, OS caches, and
library state. Peak RSS covers the entire worker, including fixture creation,
imports, and verification; it is not incremental parser memory or retained heap.
No garbage collection is forced, and no wall-clock threshold gates CI.

## Local baseline — October 20, 2026

Windows x64, Node v26.3.0, Intel Core Ultra 7 155H (22 logical CPUs).
One warmup, three measured passes, four sections per document. Values are
rounded medians; these results are observations, not release guarantees.

| Documents | Profile | Source bytes | Headings | Extraction median | Manifest median |
| ---: | --- | ---: | ---: | ---: | ---: |
| 100 | Prose | 229,970 | 2,800 | 38.90 ms | 125.54 ms |
| 100 | Rich | 388,670 | 2,800 | 241.84 ms | 328.22 ms |
| 1,000 | Prose | 2,302,670 | 28,000 | 333.18 ms | 1,154.24 ms |
| 1,000 | Rich | 3,889,670 | 28,000 | 2,385.50 ms | 3,249.37 ms |

At 1,000 pages, observed extraction throughput was 3,001 prose documents/s
and 419 rich documents/s. Manifest throughput was 866 and 308 documents/s.
Peak worker RSS at that size was 176/181 MiB (prose extraction/manifest) and
188/325 MiB (rich extraction/manifest). These figures include the full worker
and cannot be used to estimate parser allocations alone.

## Interpretation and follow-up

Renderer-based extraction has a measurable rich-content cost. This experiment
does not isolate syntax highlighting, math, components, or filesystem overhead,
so it cannot attribute that cost to a particular stage. There is no regex-parser
comparison: a parser that produces different anchors is not an equivalent baseline.

Keep production heading identity unchanged. Before optimizing, profile a real
large documentation repository, add larger/adversarial documents and locale
variants, and rerun on the supported Node/npm release environment. If extraction
dominates, evaluate a shared heading-only rendering path or parse-result reuse
against the existing heading-parity tests and this benchmark.

## Project documentation profile — October 20, 2026

The same Windows/Node/CPU environment above, one warmup and five measured rounds:
61 physical documents, 968 headings, 694,926 source bytes; locales `en`, `es`, and
`pt-BR`. Snapshot fingerprint before the profiling notes were added:
`a84592603ed622e608de6381740f52311762b9a5c726632194163d3fcf790142`.
Root-linked changelog/roadmap files are part of this snapshot; later edits to
them legitimately change the hash and corpus sizes.

| Measurement | Minimum | Median | Maximum | Peak worker RSS |
| --- | ---: | ---: | ---: | ---: |
| Extraction | 158.81 ms | 165.03 ms | 173.99 ms | 178.52 MiB |
| Manifest | 182.92 ms | 190.18 ms | 223.99 ms | 176.45 MiB |

Slowest pages in the separate per-document pass:

| Relative source | Body bytes | Headings | Median extraction |
| --- | ---: | ---: | ---: |
| `CHANGELOG.md` | 52,298 | 58 | 14.23 ms |
| `showcase.es.md` | 31,018 | 44 | 10.51 ms |
| `showcase.pt-br.md` | 31,155 | 44 | 10.29 ms |
| `showcase.md` | 28,623 | 44 | 10.09 ms |
| `guides/markdown-features.es.md` | 13,872 | 20 | 5.11 ms |

Extraction is a substantial part of the observed warm indexing cost. Do not
subtract independently measured medians to claim exact filesystem/YAML overhead
or use this run to identify a rendering-stage bottleneck. No CPU-stack sampling
was performed. The project's 61-page corpus is neither a large-enterprise corpus
nor a complete static-site build. Leave production parsing unchanged until a
real larger corpus and stage-level profiling justify a specific optimization.

## Scoped CPU capture — October 20, 2026

Windows x64 / Node v26.3.0, five captured passes after ordinary warm measurements.
The pre-notes snapshot had 64 documents and 992 headings, fingerprint
`1a07059d20bbda5e7407079b2e11f859e9ded92c98d08eb7fda215ea3de90be4`.
Extraction captured 600 samples over 1,016 ms; manifest captured 603 over 1,018 ms.
The largest individual leaf frame was anonymous in `markdown/katex.ts` (113 and
96 samples respectively). Other visible frames included Marked, code-line
wrapping, Prism, component fence restoration, and native file reading in manifest
capture. This identifies investigation candidates, **not** an exact math-stage
share or an optimization decision. No production parser changes were made.

Both installed npm entrypoints reported 12.0.2, not the required 11.x. Validation
used local executable entrypoints directly; the supported release-environment
gate remains open, as do representative enterprise profiling and stage attribution.

Implementation validation: 261/261 unit tests passed, including synthetic and
real-corpus profile capture, disabled/failing capture cleanup, summary accounting,
and symlinked output rejection. Typecheck, lint, documentation build, and source
validation passed (64 documents, 62 links, 1,007 headings; no warnings).