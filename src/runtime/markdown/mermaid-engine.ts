/**
 * Standalone entry for the on-demand Mermaid bundle (`dist/docmedown-mermaid.js`,
 * built by `scripts/build-engines.mjs`).
 *
 * Nothing in the main runtime imports this module: the served runtime only
 * injects the built file as a classic <script> when a page actually contains a
 * diagram (see `mermaid-loader.ts`). Bundling Mermaid behind a global keeps it
 * usable over `file://`, where ESM module scripts are blocked.
 */
import mermaid from "mermaid";

(globalThis as unknown as Record<string, unknown>).__DOCMEDOWN_MERMAID__ = mermaid;
