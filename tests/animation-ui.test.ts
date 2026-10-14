import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { renderSplashHead } from "../src/runtime/splash";

const source = (file: string) => fs.readFileSync(path.resolve(__dirname, "../src", file), "utf8");
const css = source("runtime/styles/main.css");

test("carousel control navigation has a single scroll owner and stops on teardown", () => {
  const grid = source("ui/builtins/CardGrid.svelte");
  const viewportCss = css.match(/\.dmd-carousel-viewport\s*\{[^}]*\}/)?.[0] ?? "";
  assert.match(grid, /smoothScroll\(viewport, offset, \{ duration: 320 \}\)/);
  assert.match(grid, /navigationIndex !== null/);
  assert.match(grid, /navigation\?\.stop\(\)/);
  assert.match(viewportCss, /scroll-behavior:\s*auto/);
  assert.match(viewportCss, /scroll-snap-type:\s*x mandatory/);
  assert.doesNotMatch(grid, /viewport\.scrollTo\(/);
});

test("tabs animate their visible panel and indicator without animating indicator width", () => {
  const tabs = source("ui/builtins/Tabs.svelte");
  const indicatorCss = css.match(/\.dmd-tab-indicator\s*\{[^}]*\}/)?.[0] ?? "";
  assert.match(tabs, /const target = bodyRef/);
  assert.match(tabs, /indicatorAnimation\?\.stop\(\)/);
  assert.match(tabs, /previous\.width \/ width/);
  assert.match(indicatorCss, /left:\s*var\(--dmd-tab-ind-x/);
  assert.match(css, /\.dmd-tabs-pills \.dmd-tab-indicator\s*\{[^}]*left:\s*var\(--dmd-tab-ind-x/);
  assert.doesNotMatch(indicatorCss, /width var\(--dmd-transition\)/);
});

test("skeletons sweep by transform and the splash hands off without scaling the page", () => {
  const head = renderSplashHead();
  assert.match(css, /@keyframes dmd-skeleton-sweep\s*\{\s*to\s*\{\s*transform:\s*translateX\(100%\)/);
  assert.match(css, /\.dmd-skeleton-shimmer::after\s*\{[^}]*animation:\s*dmd-skeleton-sweep/);
  assert.doesNotMatch(css.match(/html\.dmd-splash-active \.dmd-root\s*\{[^}]*\}/)?.[0] ?? "", /transform/);
  assert.match(head, /#dmd-splash\.dmd-splash-hidden\{opacity:0;visibility:hidden/);
  assert.match(head, /data-dmd-motion=reduced/);
});

test("buttons provide tactile feedback without animating disabled controls", () => {
  assert.match(css, /\.dmd-btn:hover:not\(:disabled\):not\(\[aria-disabled="true"\]\)/);
  assert.match(css, /\.dmd-btn:active:not\(:disabled\):not\(\[aria-disabled="true"\]\)/);
  assert.match(css, /\.dmd-btn:focus-visible/);
  assert.match(css, /\.dmd-btn-spinner svg\s*\{\s*animation:/);
});

test("section scrolling executes target pulse animation and page transitions execute smoothly", () => {
  const router = source("runtime/router.ts");
  const toc = source("ui/components/TableOfContents.svelte");
  const markdownBody = source("ui/components/MarkdownBody.svelte");

  // Section scrolling animation contracts
  assert.match(css, /@keyframes dmd-target-pulse\s*\{/);
  assert.match(css, /\.dmd-heading:target,\s*\.dmd-heading\.dmd-heading-targeted/);
  assert.match(router, /scrollToAndHighlight/);
  assert.match(toc, /scrollToAndHighlight\(target\)/);

  // Page transition animation contracts
  assert.match(css, /@keyframes dmd-page-enter\s*\{[^}]*translateY\(12px\)/);
  assert.match(css, /\.dmd-markdown-body\s*\{[^}]*animation:\s*dmd-page-enter 0\.28s/);
  // Ensure WAAPI does not conflict with CSS dmd-page-enter
  assert.doesNotMatch(markdownBody, /animate\(\s*container/);
});

test("motion preferences support full animation mode while honoring explicit reduced motion overrides", () => {
  const app = source("ui/App.svelte");
  const theme = source("ui/theme.svelte.ts");
  const router = source("runtime/router.ts");
  const appearance = source("ui/components/AppearanceMenu.svelte");

  // App & Theme synchronization contracts
  assert.match(theme, /motion = \$state<"full" \| "reduced">\("full"\)/);
  assert.match(theme, /setMotion/);
  assert.match(app, /setAttribute\("data-dmd-motion", theme\.motion\)/);
  assert.match(appearance, /theme\.setMotion/);

  // Router uses prefersReducedMotion instead of direct matchMedia
  assert.match(router, /const reduced = prefersReducedMotion\(\)/);

  // CSS media query overrides allow data-dmd-motion="full"
  assert.match(css, /:root:not\(\[data-dmd-motion="full"\]\):not\(\[data-dmd-motion="on"\]\) \.dmd-heading:target/);
  assert.match(css, /:root:not\(\[data-dmd-motion="full"\]\):not\(\[data-dmd-motion="on"\]\) \.dmd-markdown-body/);
});
