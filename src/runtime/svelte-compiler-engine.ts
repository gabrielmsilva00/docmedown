/**
 * Standalone entry for the on-demand Svelte compiler bundle
 * (`dist/docmedown-compiler.js`, built by `scripts/build-engines.mjs`).
 *
 * Nothing in the main runtime eagerly imports this module: the served runtime only
 * injects the built file as a classic <script> when raw `.svelte` components
 * require in-browser compilation (see `svelte-compiler-loader.ts`).
 */
import { compile } from "svelte/compiler";

(globalThis as unknown as Record<string, unknown>).__DOCMEDOWN_COMPILER__ = { compile };
