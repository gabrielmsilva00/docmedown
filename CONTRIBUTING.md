# Contributing to DocMeDown

## Development setup

Use Node.js 20.19 or later and npm 11.

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run build:docs
```

## Documentation roots

A directory containing `docs.json` is an independent documentation root. Parent manifests must not scan its Markdown, configuration, or `.dmd/components.js` module. Run `npm run build:docs` after documentation changes to validate parent and nested outputs. The build also writes `.nojekyll` so direct GitHub Pages branch publishing does not discard `_docs.js`.

## Configuration contract

`src/runtime/config-schema.ts` is the executable source of truth for configuration validation. It provides the Zod schema used by browser and CLI code; `schemas/docs.schema.json` is the matching portable schema shipped for editor support. Update both schemas, `templates/docs.json`, `docs/configuration.md`, and configuration tests together when adding or changing a configuration field.

Theme changes must keep the four-family contract synchronized across `src/runtime/styles/themes.css`, `ThemeProvider`, the Appearance menu, Mermaid tokens, `schemas/docs.schema.json`, maintained `docs.json` examples, the root README, and `docs/configuration.md`. New documentation must use `theme.family`; `theme.preset` exists only for migration compatibility.

Use `npm run lint:fix` to apply Biome formatting and safe lint/import fixes. Do not broadly disable linter rules: existing narrow exceptions protect the deliberate dynamic Markdown/custom-component runtime boundaries.

## Pull requests

- Keep source changes and generated artifacts separate; generated documentation artifacts are ignored.
- Add or update tests for behavior changes.
- Keep `docs.json`, templates, and the root README aligned with the CLI.
- For layout or diagram changes, rebuild `docs/.dist/index.html` and inspect the affected page in a browser at desktop, tablet, and mobile widths. Unit geometry tests do not replace a rendered artifact check.
- Run `npm run test:release` before requesting review for a release.

## Deploying a release

1. Add release notes under `## Unreleased` in `CHANGELOG.md`.
2. Run `npm run deploy` from `main`.

The deploy pipeline accepts tracked working-tree changes, automatically bumps the patch version when the current version is already released, promotes the Unreleased changelog notes, runs the full release gate, commits tracked files, pushes `main` and `v<version>` to GitHub, publishes the same version to npm, and retries registry verification while npm metadata propagates. Untracked files remain a safety stop and must be added, ignored, or removed explicitly. Use `npm run deploy:dry-run` for a non-mutating validation and release plan.

If npm write 2FA is enabled, provide the one-time password without recording it in shell history:

```powershell
$env:NPM_OTP = Read-Host 'npm one-time password'
npm run deploy
Remove-Item Env:NPM_OTP
```