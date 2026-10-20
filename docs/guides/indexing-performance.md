---
title: Measuring Indexing Performance
description: Reproduce synthetic and real-corpus heading and manifest measurements without changing source files.
order: 12
tags: [performance, indexing, benchmark]
---

# Measuring Indexing Performance

These contributor commands run from the DocMeDown repository after `npm ci`;
they are not commands exposed by the published `docmedown` CLI.

```bash
# Synthetic prose/rich corpora: 100 and 1,000 documents by default
npm run benchmark:headings

# Read-only profile of a real documentation root
npm run benchmark:headings -- --corpus ./docs --rounds 5 --warmups 1

# JSON-only stdout, without npm's command banner
node --import tsx ./scripts/benchmark-headings.mjs --corpus ./docs --rounds 5 --warmups 1
```

## Scope and safety

Extraction measures the production heading extractor, which currently invokes
the Markdown renderer. Manifest generation also includes scanning, YAML,
file metadata, locale bookkeeping, and sidebar construction. Neither measurement
is a full static-site build, component compilation, or browser startup benchmark.

Real-corpus mode reads the existing documentation root without building output,
linking files, or executing setup scripts. It honors production configuration,
locale selection, nested-root isolation, and agent-file exclusions. Keep sources
stable during measurement. Empty roots and invalid configurations fail explicitly.

## Reading the report

Reports include samples, min/median/max, throughput, peak worker RSS, and machine
metadata. Real corpora also include indexed-source/config fingerprints and the
ten slowest documents from separate timing passes. Reports contain local paths;
review them before sharing. Store generated reports outside the working tree.

Corpus timings are warm: an untimed manifest establishes expected headings first.
Peak RSS includes setup and verification, not just parser allocations. Per-page
timing identifies expensive pages but does not identify CPU-stack bottlenecks.
No timing threshold gates CI, and no parser optimization follows automatically.

## Optional CPU-stack capture

```powershell
node --import tsx ./scripts/benchmark-headings.mjs --corpus ./docs --rounds 5 --warmups 1 --cpu-profile "$env:TEMP/dmd-heading-cpu"
```

The output directory must be outside both the repository and corpus, including
symlinked ancestors. This also works with synthetic cases. Separate warm passes
produce `.cpuprofile` files and JSON leaf-frame summaries; ordinary samples remain
unprofiled. Open the raw files in a CPU-profile viewer to inspect caller stacks.
Imports, setup, and verification are outside capture. Requested sampling is
1,000 µs; leaf counts are not inclusive stage costs or exact percentages.
Anonymous/transpiled frames require source-map inspection before attribution.
Profiling adds overhead and affects worker peak RSS. Review absolute paths before
sharing. Local capture exists; enterprise and stage attribution remain open.
Production parsing is unchanged.

### Reading sampled caller ownership

`cpuProfile.attribution` adds versioned module-based buckets using full caller
stacks. `leafSamples` counts recognized top frames. `exclusiveSamples` assigns
each sample to its nearest recognized module; unknown/native child work can
inherit its caller's bucket. `inclusiveSamples` counts every recognized category
once on that stack, so categories overlap and must not be added together.
Leaf and exclusive columns each total the captured sample count. GC, idle, and
unattributed samples remain explicit. Names and generated line positions are not
used to guess stages. No counts are weighted into durations or exact percentages.
Unknown/bundled URLs can reduce attribution, and zero samples do not prove zero
cost. These summaries help select raw stacks for inspection; they do not complete
stage-duration or enterprise validation.

## Recorded baseline and remaining work

On October 20, 2026, the project's 61-document, three-locale snapshot measured
165 ms median extraction and 190 ms median manifest generation on Windows x64,
Node v26.3.0, Intel Core Ultra 7 155H. These are local observations, not guarantees.
The changelog and translated showcases were the slowest individual pages.

Exact corpus sizes, source fingerprint, synthetic results, and methodology are
recorded in repository file `scripts/benchmark-headings.md`. Documentation edits
change the corpus fingerprint; a new run need not match the historical snapshot.
Real large-enterprise profiling, stage-level attribution, and verification on
the final release environment are separate checks. The full candidate release
pipeline passed locally with npm 11.16.0 on Node 20.19.0 and 22.14.0; this does
not complete enterprise profiling or exact stage-duration attribution.