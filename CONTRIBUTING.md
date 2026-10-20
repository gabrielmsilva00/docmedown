# Contributing to DocMeDown

## Development setup

Use Node.js 20.19 or later and npm 11.

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

## Documentation roots

A directory containing `docs.json` is an independent documentation root. Parent manifests must not scan its Markdown, configuration, or `.dmd/` component directory. Run `npm run build:docs` after documentation changes to validate parent and nested outputs. The build also writes `.nojekyll` so direct GitHub Pages branch publishing does not discard `_docs.js`.

## Configuration contract

`src/runtime/config-schema.ts` is the executable source of truth for configuration validation. It provides the Zod schema used by browser and CLI code; `schemas/docs.schema.json` is the matching portable schema shipped for editor support. Update both schemas, `templates/docs.json`, `docs/configuration.md`, and configuration tests together when adding or changing a configuration field.

Theme changes must keep the six-family contract synchronized across `src/runtime/styles/themes.css`, `ThemeProvider`, the Appearance menu, Mermaid tokens, `schemas/docs.schema.json`, maintained `docs.json` examples, the root README, and `docs/configuration.md`. New documentation must use `theme.family`; `theme.preset` exists only for migration compatibility.

Use `npm run lint:fix` to apply Biome formatting and safe lint/import fixes. Do not broadly disable linter rules: existing narrow exceptions protect the deliberate dynamic Markdown/custom-component runtime boundaries.

## Pull requests

- Keep source changes and generated artifacts separate; generated documentation artifacts are ignored.
- Add or update tests for behavior changes.
- Keep `docs.json`, templates, and the root README aligned with the CLI.
- For layout or diagram changes, rebuild `docs/.dmd/.singlefile/index.html` and inspect the affected page in a browser at desktop, tablet, and mobile widths. Unit geometry tests do not replace a rendered artifact check.
- Run `npm run test:release` before requesting review for a release.

## Documentation maintenance

Documentation is part of each implementation slice, not a release-only cleanup:

1. Update `ROADMAP.md` with completed work and explicit remaining gates. A local
   benchmark or unit test does not complete a browser, enterprise, or release gate.
2. Add user-visible changes and compatibility notes under `Unreleased` in
   `CHANGELOG.md`. The prepared target is **0.9.9-b**; **1.0.0-rc-a** follows later. Do not mark it shipped or
   bump package versions merely to record progress.
3. Update the relevant `docs/` guide and its `.es.md` / `.pt-br.md` variants when
   maintained translations exist. Add a focused guide if the topic has no home;
   preserve logical document identity and locale suffix conventions.
4. Keep the root README, contributor commands, configuration artifacts, and
   examples aligned where affected. Agent-only instructions and generated files
   are not substitutes for project documentation.
5. Run documentation validation and rebuild docs. Report existing failures
   separately from new ones, and preserve nested-root isolation.

## Performance measurements

Run `npm run benchmark:headings` for synthetic extraction/manifest measurements,
or `npm run benchmark:headings -- --corpus ./docs --rounds 5 --warmups 1` for a
read-only profile of an existing root. See repository file `scripts/benchmark-headings.md`
for JSON reports, scope, and local baselines. These are diagnostic measurements,
not wall-clock CI thresholds or full-site build timings. Do not relax size or
correctness guards merely to make an optimization pass.

## Deploying a release

1. Add release notes under `## Unreleased` in `CHANGELOG.md`.
2. Run `npm run deploy` from `main`.

The deploy pipeline accepts tracked working-tree changes. Its automatic patch bump
and changelog promotion apply to an already-released **stable** version; the patch
helper rejects prerelease inputs. An explicitly prepared, unpublished version is
kept as-is, and its changelog must already be promoted. The pipeline runs the full
release gate, commits tracked files, pushes `main` and `v<version>` to GitHub,
publishes the same version to npm, and retries registry verification while npm
metadata propagates. All prereleases currently use the `alpha` dist-tag; stable
releases use `latest`.

Untracked files remain a safety stop and must be reviewed and explicitly tracked
or ignored as appropriate. Keep `AGENTS.md` tracked; do not ignore source files to
make deployment pass. `npm run deploy:dry-run` does not commit, tag, push or publish,
but it fetches `origin/main`, checks remote tags/registry metadata, and rebuilds
generated artifacts. It is not a filesystem- or network-free command.

### Explicit prerelease preparation (0.9.9-b)

The current candidate has synchronized package/lockfile/docs metadata and notes;
it is not published. The procedure below is the reproducible preparation sequence,
not a request to promote the same notes twice. Before preparing any new candidate,
verify that its version and tag are unused; never reuse a release. The later
`1.0.0-rc-a` milestone needs its own preparation after this release.

1. Validate that `Unreleased` has meaningful notes before modifying package files:

   ```bash
    node --input-type=module -e "import fs from 'node:fs'; import {promoteChangelog,localIsoDate} from './scripts/deploy-lib.mjs'; promoteChangelog(fs.readFileSync('CHANGELOG.md','utf8'),'0.9.9-b',localIsoDate());"
   ```

2. Set the exact package and lockfile version without creating a Git tag:

   ```bash
   npm version 0.9.9-b --no-git-tag-version
   ```

3. Promote the notes explicitly; keeping an unpublished version does not invoke
   automatic promotion in the deploy script:

   ```bash
   node --input-type=module -e "import fs from 'node:fs'; import {promoteChangelog,localIsoDate} from './scripts/deploy-lib.mjs'; fs.writeFileSync('CHANGELOG.md',promoteChangelog(fs.readFileSync('CHANGELOG.md','utf8'),'0.9.9-b',localIsoDate()));"
   ```

4. Check `package.json`, `package-lock.json` (top-level and root package), the dated
   changelog section, intended tracked files, and all remaining evidence gates.

5. Run `npm run deploy:dry-run` under npm 11. Its summary must keep exactly
   `0.9.9-b`, propose tag `v0.9.9-b`, mark the GitHub release as a prerelease,
   and use npm dist-tag `alpha`. Stop if any of these differ. Publication requires
   a separate approved `npm run deploy`.

### Historical pre-candidate evidence — 2026-10-20

Environment: Windows, Node v26.3.0 (within the declared `>=20.19.0` range), npm
11.16.0 matching `packageManager`. npm was installed in the temporary directory
`dmd-release-tools-npm11`, not globally; its `.bin` directory was prepended to
`PATH` for nested npm/npx scripts. Existing dependencies were used; this is not
evidence of a fresh `npm ci` or the Node 20/22 CI matrix.

| Check | Observed result | Scope / remaining evidence |
| --- | --- | --- |
| `npm run test:release` | Exit 0; 264 unit tests (also rerun by build), 32 MCP, 3 hosting, 6 offline-artifact, 4 bundle and 3 package-smoke tests passed | Development version `0.9.9-a`; rerun on final RC metadata/tree |
| Typecheck, lint, production build and docs build | Passed; project doctor 7/7 | Does not prove visual, keyboard or assistive-technology behavior |
| Production budgets | All seven passed | Served gzip 498.3 KiB / 500 KiB; CJS raw 1.34 MiB / 1.35 MiB; retain existing limits |
| `npm pack --dry-run` | 87 files, 3.5 MB packed, 10.8 MB unpacked; no tarball written | Package version still `0.9.9-a`; not an install-from-registry check |
| Documentation validation before evidence edits | 64 documents, 62 links, 1,010 headings; no validation errors | Historical snapshot, not a fixed expected count |
| Post-edit verification | Full release pipeline rerun exited 0; source validation passed for 64 documents, 62 links and 1,015 headings; `git diff --check` passed | Includes this slice's evidence documentation; package metadata remains unchanged |
| MCP transports | SDK stdio subprocess and SSE session/CORS/error cases passed in 32-test suite; local CLI stdio smoke exited 0 | Independent desktop/agent hosts and remote proxies remain unverified |

The gate emitted Node 26 experimental-localStorage warnings and KaTeX quirks-mode
warnings in test processes. These were non-failing and must not be described as
a warning-free release log. Local temporary log basenames are
`dmd-release-gate-npm11.log`, `dmd-release-gate-final-npm11.log`,
`dmd-release-stdio.log`, `dmd-release-validate.log` and
`dmd-release-validate-final.log`; these files are not durable CI evidence and may expose
absolute paths. That earlier slice performed no version bump, commit, tag, push
or publication. The later candidate preparation below supersedes its metadata
status; the historical measurements are retained rather than relabeled.

### Manual evidence matrix

Interim `0.9.9-b` review: the user requested completion of outstanding checks
before any bump or deploy; the subsequent request authorized candidate preparation,
not bypassing validation before publication. Targeted probes used cached Playwright 1.59.1
without adding repository dependencies: Chrome 155.0.8059.85 and Edge
155.0.4283.62 passed local HTTP subpath and network-disabled `file:///` reader
and search checks, six theme-family switches in light/dark modes, overflow
checks at 390/768/1440 widths, appearance Escape/focus restoration, concurrent
compiler-cache writes, reload persistence, changed-source misses and
unavailable-IndexedDB fallback. A real shadow-root reconnect failure was found
in the React bridge and fixed; repeated light/shadow unit coverage and the
browser reconnect probe passed. These probes bundle the source bridge/cache
for isolation; they do not prove full dynamic compilation or all packaged
framework integrations. The earlier missing-browser finding was corrected by
a broader installation search. Temporary script/results:
`dmd-readiness-browser.cjs`, `dmd-readiness-browser-results.json`, and
`dmd-readiness-browser-rerun.log` in the local temporary directory.
No full accessibility, Safari/Firefox, independent MCP-host or deployed-host
certification is claimed. Keep the matrix below open for those checks.

Post-fix full release pipeline: exit 0, 265/265 unit tests and all 48 specialized
tests passed; typecheck, lint, builds, budgets and package dry-run passed. Source
validation passed for 64 documents and 62 links. The extended routing/diagram
probe initially used a stale placeholder selector: the runtime replaces it with
`dmd-mermaid`. Correcting that selector reached the SVG and keyboard checks,
then timed out waiting for expected search-destination content. On 2026-10-20,
the corrected probe explicitly focused the search input before Enter and asserted
the selected title, `Measuring Indexing Performance`, instead of unrelated text.
All 18 Chrome/Edge scenarios passed, including served/offline routing, SVG and
keyboard search; no page errors were recorded. See the local temporary files
`dmd-099b-browser-diagnostic.log` and `dmd-readiness-browser-results.json`.
This was a probe correction, not an application routing fix.

### Prepared 0.9.9-b candidate (2026-10-20; not published)

Package, lockfile, docs version and candidate notes identify `0.9.9-b`.
Registry lookup returned E404 for that exact version, and local/remote tag checks
found no `v0.9.9-b`. These checks must be repeated immediately before publication.
GitHub authentication is active; `npm whoami` returns E401. Authenticate npm
before any real deploy. Do not put credentials or one-time passwords in evidence.
The 24 intended source/instruction/test additions were individually reviewed and
staged during the subsequent readiness pass, clearing the untracked-file guard.
Existing tracked changes remain preserved. No commit, tag, push or publication
was performed.
The candidate is not certified 100% ready while any required matrix row is open.

Candidate verification under Node v26.3.0 and isolated npm 11.16.0:

| Candidate check | Observed outcome |
| --- | --- |
| `npm run test:release` | Exit 0 on `0.9.9-b`: 265 unit tests, 32 MCP, 3 hosting, 6 offline-artifact, 4 bundle and 3 package-smoke tests; typecheck, lint, build, docs build and all seven production budgets passed |
| `npm pack --dry-run` within the gate | 87 files, 3.5 MB packed, 10.8 MB unpacked; candidate filename `docmedown-0.9.9-b.tgz`, no tarball written |
| Source documentation validation | Exit 0: 64 documents, 62 links, 1,018 headings before this evidence update; historical counts are not assertions |
| Rebuilt-candidate browser probe | Exit 0; all 18 Chrome/Edge scenarios passed, including served/offline routing, SVG, keyboard search, themes, widths, cache and React reconnect |
| `npm run deploy:dry-run` | Subsequent reviewed-source run exited 0: keep `0.9.9-b`, tag `v0.9.9-b`, prerelease true, npm `alpha`; no commit, tag, push or publication |

Local evidence basenames: `dmd-099b-candidate-release.log`,
`dmd-099b-candidate-docs-validation.log`, `dmd-099b-candidate-browser.log`,
and `dmd-099b-candidate-deploy-dry-run.log`. These are temporary local evidence,
not durable CI certification. Latest remote CI runs for `03fe061` and `e6801b1`
report failure; neither tests this uncommitted candidate. Passing Node 20/22
candidate CI remains required. The subsequent pass installed Firefox 148.0.2 and
WebKit 26.4 into the external Playwright cache, without adding package dependencies.

### Extended readiness pass — 2026-10-20

- Full release pipelines passed locally on Node 20.19.0 and 22.14.0 with isolated
  npm 11.16.0. These are Windows candidate checks, not Linux CI results. Inspection
  of remote failure logs identified formatting in `scripts/deploy.mjs`; that
  working-tree fix passes lint. CI now pins npm 11.16.0 before installation.
- Fixed a WebKit diagram ResizeObserver feedback loop by deferring measurement
  writes to an animation frame and cancelling pending frames on teardown. Existing
  diagram contract tests now guard the scheduling and cleanup behavior.
- Expanded the browser probe with actual packaged Svelte counter, React
  increment/reset and Web Component rendering checks, served and single-file.
  Chrome/Edge/Firefox passed all 33 scenarios after the diagram fix. WebKit passed
  all 11 scenarios separately, including local-file rendering and interactions.
  Playwright WebKit offline emulation fails even on a trivial local HTML file;
  WebKit uses an HTTP(S)-abort route instead. No network content is allowed, but
  this is not a physical disconnected-device or Apple Safari certification.
- Added an independent newline-delimited JSON-RPC stdio client regression to the
  MCP tests: initialization, tool listing, all four tools and missing-document
  errors pass without using the MCP client SDK. Independent SSE desktop/proxy
  clients remain outstanding; the local SDK smoke passed separately.
- Clean-checkout validation exposed seven authored docs widgets/setup sources
  hidden by the `.dmd/` ignore rule, including the nested OrbitCounter. Narrow
  ignore exceptions now preserve only authored sources; generated assets remain
  ignored. A clean temporary source snapshot with fresh `npm ci` passes the full
  release pipeline on Node 20.19.0 and 22.14.0. The initial clean Node 22 run
  correctly failed on the missing nested widget before that source was preserved.
  The rebuilt clean snapshot also passed all 33 default-engine scenarios
  (Chromium/Firefox/WebKit); these mirror the new browser CI job locally.
- The combined Chrome/Edge/Firefox/WebKit run passed **44/44 scenarios**. The final
  Node 22 deployment dry-run passed the complete gate: 265 unit tests, 33 MCP,
  4 hosting, 6 artifact, 4 bundle and 3 package-smoke tests; seven budgets and
  package dry-run passed. Source validation: 64 documents, 62 links, 1,019 headings
  before this evidence update. Counts are observations, not future assertions.

The durable browser probe is repository file `scripts/test-browser-readiness.mjs`.
After building the runtime and docs, run it with an externally installed Playwright
module (no browser dependency is added to the published package):

```powershell
$env:DMD_PLAYWRIGHT_MODULE = 'C:/path/to/browser-tools/node_modules/playwright'
$env:DMD_BROWSERS = 'chrome,msedge,firefox,webkit'
$env:DMD_BROWSER_REPORT = "$env:TEMP/dmd-browser-results.json"
npm run test:browser
```

Default engines are `chromium,firefox,webkit`; every requested engine is required,
and any failed scenario exits nonzero. CI installs isolated Playwright 1.59.1,
runs all three engines, and uploads the JSON evidence even on failure. Local logs:
`dmd-099b-node20-release.log`, `dmd-099b-node22-release.log`,
`dmd-099b-reviewed-deploy-dry-run.log`, `dmd-099b-postfix-browser-results.json`,
`dmd-099b-webkit-network-blocked.json` and `dmd-099b-new-regression-tests.log`.
Clean-install/final evidence: `dmd-099b-clean-ci.log`,
`dmd-099b-clean-node20-release.log`, `dmd-099b-final-ready-dry-run.log`,
`dmd-099b-final-ready-validation.log`, `dmd-099b-four-browser-results.json`.
Final clean-snapshot evidence: `dmd-099b-clean-node22-release.log`,
`dmd-099b-clean-browser-results.json`. Final working-tree deploy/validation logs:
`dmd-099b-final-deploy-ready.log`, `dmd-099b-final-source-validation.log`.

Each pending result needs a candidate revision, platform/browser or client version,
command or reproduction steps, actual outcome, and reviewed evidence. No blank
result counts as a pass.

| Area | Existing automated coverage | Pending manual / integration evidence |
| --- | --- | --- |
| Browser, accessibility and mobile | Chrome/Edge/Firefox/WebKit served and network-blocked single-file, six themes light/dark, 390/768/1440 widths, basic focus and keyboard search passed | Apple Safari; physical mobile/input behavior; full tab order, screen reader and contrast review |
| Offline | Envelope/payload integrity, nested sites, bundled components and local engines | Open `docs/.dmd/.singlefile/index.html` with `file:///` and network disabled; test routing, search, nested navigation, diagrams and supported widgets; repeat served with network disabled |
| Static hosting | Three local hosting tests | Deployed subpath, direct/deep links, refresh, assets, locales, canonical URLs and `.nojekyll`; record host/revision |
| MCP | SDK stdio/SSE and independent JSON-RPC stdio regression | Independent desktop/agent host over SSE; proxy behavior and real host lifecycle |
| Components and compiler cache | Packaged Svelte/React/Web Component served/offline interactions; isolated bridge reconnect, concurrent cache writes, persistence, invalidation, storage fallback | Full runtime dynamic compilation/error paths and framework teardown edge cases; concurrent compilation rather than only cache writes |

External-corpus profiling additionally requires a stable revision, corpus source
and size, commands, fingerprints and reviewed stacks; no representative external
enterprise corpus has been supplied. Parser optimization stays deferred.

Six language presets and the built-in guide translations do not mean every
documentation page or UI message is translated. Recent maintained guides cover
English, Spanish and Brazilian Portuguese. Complete the broader coverage or
explicitly approve and document an RC limitation before clearing that gate; no
exception has been accepted in this slice.

If npm write 2FA is enabled, provide the one-time password without recording it in shell history:

```powershell
$env:NPM_OTP = Read-Host 'npm one-time password'
npm run deploy
Remove-Item Env:NPM_OTP
```