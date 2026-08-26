# Contributing to DocMeDown

## Development setup

Use Node.js 20.19 or later and npm 11.

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run build:docs
```

## Documentation roots

A directory containing `docs.json` is an independent documentation root. Parent manifests must not scan its Markdown, configuration, or `.dmd/components.js` module. Run `npm run build:docs` after documentation changes to validate parent and nested outputs.

## Pull requests

- Keep source changes and generated artifacts separate; generated documentation artifacts are ignored.
- Add or update tests for behavior changes.
- Keep `docs.json`, templates, and the root README aligned with the CLI.
- Run `npm run test:release` before requesting review for a release.