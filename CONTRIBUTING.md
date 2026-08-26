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

A directory containing `docs.json` is an independent documentation root. Parent manifests must not scan its Markdown, configuration, or `.dmd/components.js` module. Run `npm run build:docs` after documentation changes to validate parent and nested outputs.

## Configuration contract

`src/runtime/config-schema.ts` is the executable source of truth for configuration validation. It provides the Zod schema used by browser and CLI code; `schemas/docs.schema.json` is the matching portable schema shipped for editor support. Update both schemas, `templates/docs.json`, `docs/configuration.md`, and configuration tests together when adding or changing a configuration field.

Use `npm run lint:fix` to apply Biome formatting and safe lint/import fixes. Do not broadly disable linter rules: existing narrow exceptions protect the deliberate dynamic Markdown/custom-component runtime boundaries.

## Pull requests

- Keep source changes and generated artifacts separate; generated documentation artifacts are ignored.
- Add or update tests for behavior changes.
- Keep `docs.json`, templates, and the root README aligned with the CLI.
- Run `npm run test:release` before requesting review for a release.

## Deploying a release

1. Bump the version in `package.json` and `package-lock.json` with `npm version <version> --no-git-tag-version`.
2. Commit the release changes on `main` and ensure the working tree is clean.
3. Run `npm run deploy`.

The deploy pipeline runs the full release gate, pushes `main` and `v<version>` to GitHub, publishes the same version to npm, and verifies the registry result. Use `npm run deploy:dry-run` to validate the pipeline without pushing or publishing.

If npm write 2FA is enabled, provide the one-time password without recording it in shell history:

```powershell
$env:NPM_OTP = Read-Host 'npm one-time password'
npm run deploy
Remove-Item Env:NPM_OTP
```