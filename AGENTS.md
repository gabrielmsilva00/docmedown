# Agent Instructions for DocMeDown

This document guides AI coding assistants, autonomous agents, and contributors working in the `docmedown` repository.

---

## 1. Project Overview

**DocMeDown** (`docmedown`) is a zero-friction, next-generation documentation engine and static-site compiler for modern developers. It features:
- **Zero-config & unified root discovery**: Automatically discovers and links root markdown files (`README.md`, `CONTRIBUTING.md`, etc.) alongside `./docs` content.
- **AI-native distribution**: Emits `llms.txt`, `llms-full.txt`, `SKILL.md`, `okf.json`, and includes a built-in Model Context Protocol (MCP) server (`docmedown mcp`).
- **Self-contained offline artifacts**: Single-file distributable (`.dmd/.singlefile/index.html`) using compressed envelopes and self-extracting runtimes that open directly via `file:///` without a web server.
- **Modern UI & developer experience**: Live HMR editing, 6 cohesive theme families, interactive Mermaid diagrams, and Svelte 5 custom elements.

---

## 2. Repository Layout & Architecture

```
docmedown/
├── bin/                   # CLI binary entrypoints (bin/docmedown.js)
├── docs/                  # DocMeDown's own documentation website (docs.json, guides, showcase)
├── dist/                  # Compiled library bundles, runtime artifacts, and type declarations
├── schemas/               # JSON schemas (docs.schema.json) for configuration validation
├── scripts/               # Maintenance, build, commit, and release orchestration scripts
├── src/
│   ├── cli/               # CLI commands (build, serve, doctor, mcp, validate, etc.) and utilities
│   │   ├── commands/      # CLI subcommands implementation
│   │   └── utils/         # Directory scanning, root linking, dev server, scaffolding
│   ├── runtime/           # Browser runtime, router, theme system, search index, motion, config schemas
│   └── ui/                # Svelte 5 UI components (editor, diagram viewer, navigation, themes)
├── templates/             # Starter templates for scaffolding new documentation roots
└── tests/                 # Unit, integration, smoke, and offline bundle test suites
```

---

## 3. Agent & Developer Instruction Files Policy

- **`AGENTS.md` and `SKILL.md` are reserved agent instruction files**:
  - They are developer and agent assets, **NOT** user-facing documentation pages.
  - They are **blacklisted** from documentation website ingestion, root-linking (`linkRootMarkdownFiles`), directory scanning (`scanDirectory`), and file watcher re-triggers (`shouldWatchDocumentationSource`).
  - **Git tracking**: `AGENTS.md` is committed and tracked in version control. Do **not** add `AGENTS.md` to `.gitignore`.

---

## 4. Key Workflows & Commands

Always use **Node.js >= 20.19.0** and **npm 11.x**.

| Command | Purpose |
| :--- | :--- |
| `npm run check` | Run typechecker (`tsc --noEmit`) and linter (`biome check .`) |
| `npm run typecheck` | Run TypeScript compiler check without emitting files |
| `npm run lint` | Inspect code formatting and linting rules with Biome |
| `npm run lint:fix` | Automatically apply Biome formatting and safe lint fixes |
| `npm test` | Run fast unit test suite (`node ./scripts/test-unit.mjs`) |
| `npm run test:mcp` | Run Model Context Protocol (MCP) server tests |
| `npm run test:release` | Full release verification pipeline (checks, tests, builds, smoke tests) |
| `npm run build` | Compile runtime bundles and package distributions via `scripts/build.mjs` |
| `npm run build:docs` | Build and prerender the project's own `./docs` website |
| `npm run dev` | Launch local documentation preview server (`docmedown serve ./docs`) |
| `npm run commit` | Run commit script with validation gates |
| `npm run deploy:dry-run`| Verify release plan and changelog state without publishing |

---

## 5. Development Invariants & Rules

1. **Configuration Source of Truth**:
   - `src/runtime/config-schema.ts` (Zod schema) is the executable source of truth for all `docs.json` configuration.
   - When modifying configuration fields, keep `schemas/docs.schema.json`, `templates/docs.json`, `docs/configuration.md`, and configuration tests synchronized.

2. **Documentation Root Isolation**:
   - Any directory containing `docs.json` constitutes an independent, isolated documentation root.
   - Parent scanners and manifests must **never** ingest nested documentation roots or their internal `.dmd/` directories.

3. **Theme System Consistency**:
   - The engine defines exactly six theme families (`atlas`, `blueprint`, `terminal`, `editorial`, `botanical`, `studio`).
   - Any theme changes must remain synchronized across `src/runtime/styles/themes.css`, `ThemeProvider`, Mermaid tokens, and configuration schemas.

4. **Code Quality & Linter Discipline**:
   - Use Biome for formatting and linting. Apply fixes via `npm run lint:fix`.
   - Do not broadly disable lint rules with wildcard comments; narrow inline disables are permitted only where dynamic Markdown/Svelte runtime boundaries require them.

5. **Clean Working Tree for Releases**:
   - The release script (`scripts/deploy.mjs`) enforces that untracked files are not left behind. Keep git working trees clean and ensure all generated artifacts are placed in `.gitignore` while source documents remain tracked.
