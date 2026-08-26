# Changelog

All notable changes to DocMeDown are documented here.

## 0.1.1 - 2026-08-26

### Added

- Strict Zod validation for browser, CLI, inline, manifest, and JSON-file configuration sources.
- Public configuration schemas and types, plus a shipped JSON Schema at `schemas/docs.schema.json` for editor validation.
- Biome formatting and linting commands integrated into the release gate.
- Regression coverage for configuration precedence, fallback behavior, manifest validation, and the shipped JSON Schema.

### Changed

- CLI configuration reads now fail with source-prefixed validation errors instead of silently using malformed configuration.
- Documentation, templates, and contributor guidance now describe the shared configuration contract and quality checks.

## 0.1.0 - 2026-08-26

### Added

- CLI builds that produce serveable documentation assets and a standalone offline `.dist/index.html` by default.
- Nested documentation roots: every directory containing `docs.json` owns isolated configuration, components, manifests, and offline output.
- Browser-loadable `.dmd/components.js` modules, including support in offline bundles.
- Public runtime lifecycle API and release packaging metadata.