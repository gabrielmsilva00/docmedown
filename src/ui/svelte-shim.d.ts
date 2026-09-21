/** Module declarations for Svelte component imports consumed by TypeScript. */
declare module "*.svelte" {
  import type { Component } from "svelte";

  const component: Component<Record<string, any>, Record<string, any>, string>;
  export default component;
}

/** Vite CSS raw imports used by the builtin shared styles. */
declare module "*.css?raw" {
  const content: string;
  export default content;
}

declare module "svelte/internal/client";
