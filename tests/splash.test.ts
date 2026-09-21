import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  dismissSplash,
  renderSplashHead,
  renderSplashMarkup,
  SPLASH_ACTIVE_CLASS,
  SPLASH_HIDDEN_CLASS,
  SPLASH_ID,
  SPLASH_MIN_DURATION_MS,
  SPLASH_START_KEY,
} from "../src/runtime/splash";

const originalDocument = (globalThis as any).document;
const originalWindow = (globalThis as any).window;

afterEach(() => {
  (globalThis as any).document = originalDocument;
  (globalThis as any).window = originalWindow;
});

interface FakeSplash {
  classes: Set<string>;
  attributes: Record<string, string>;
  removed: boolean;
}

function installDom(hasSplash = true): { splash: FakeSplash; rootClasses: Set<string>; delays: number[] } {
  const splash: FakeSplash = { classes: new Set(), attributes: {}, removed: false };
  const rootClasses = new Set<string>([SPLASH_ACTIVE_CLASS]);
  const delays: number[] = [];

  const element = {
    classList: {
      contains: (name: string) => splash.classes.has(name),
      add: (name: string) => splash.classes.add(name),
    },
    setAttribute: (name: string, value: string) => {
      splash.attributes[name] = value;
    },
    remove: () => {
      splash.removed = true;
    },
  };

  (globalThis as any).document = {
    documentElement: { classList: { remove: (name: string) => rootClasses.delete(name) } },
    getElementById: (id: string) => (hasSplash && id === SPLASH_ID ? element : null),
  };
  // Run timers synchronously (recording their delay) so both the pacing and the
  // removal are observable without waiting.
  (globalThis as any).window = {
    setTimeout: (fn: () => void, delay = 0) => {
      delays.push(delay);
      fn();
      return 0;
    },
  };

  return { splash, rootClasses, delays };
}

test("splash head rendering, critical styling, and branding overrides", () => {
  const head = renderSplashHead();
  assert.ok(head.includes(`#${SPLASH_ID}`));
  assert.ok(head.includes("<style>"));
  assert.ok(head.includes("<script>"));
  // Theme bootstrap resolves the saved preference before first paint.
  assert.ok(head.includes("dmd-color-mode"));
  assert.ok(head.includes("dmd-theme-family"));
  assert.ok(head.includes("prefers-color-scheme"));
  assert.ok(head.includes("data-dmd-theme"));
  // JS-disabled readers get the prerendered content, not a stuck splash.
  assert.ok(head.includes("<noscript>"));
  // Self-contained: the splash must paint before any stylesheet has loaded.
  assert.ok(!head.includes("http://") && !head.includes("https://"));
  // The shell choreography ships inline: a hairline loader, skeleton shimmer,
  // and a collapse to static bones under reduced motion.
  assert.ok(head.includes("dmd-splash-progress"));
  assert.ok(head.includes("dmd-splash-shimmer"));
  assert.ok(head.includes("prefers-reduced-motion"));
  // Compact reading mode layout
  assert.ok(head.includes("data-dmd-density"));
  assert.ok(head.includes(":root[data-dmd-density=compact]"));

  // Brand accent overrides per mode and safe fallback
  const branded = renderSplashHead({ accent: "#e0405f", accentDark: "#ff7089" });
  assert.ok(branded.includes(":root{--dmd-splash-accent:#e0405f}"));
  assert.ok(branded.includes(":root[data-theme=dark]{--dmd-splash-accent:#ff7089}"));

  // A light-only accent still applies in dark mode
  const lightOnly = renderSplashHead({ accent: "#e0405f" });
  assert.ok(lightOnly.includes(":root[data-theme=dark]{--dmd-splash-accent:#e0405f}"));

  // Dark-only accents leave light mode on the theme-family default.
  const darkOnly = renderSplashHead({ accentDark: "#ff7089" });
  assert.ok(!darkOnly.includes(":root{--dmd-splash-accent:"));
  assert.ok(darkOnly.includes(":root[data-theme=dark]{--dmd-splash-accent:#ff7089}"));

  // Unsafe accent values are rejected
  const unsafe = renderSplashHead({ accent: "red;}body{x:", accentDark: "javascript:alert(1)" });
  assert.ok(!unsafe.includes("red;}"));
  assert.ok(!unsafe.includes("javascript:"));
  assert.ok(renderSplashHead({ accent: " #e0405f " }).includes("--dmd-splash-accent:#e0405f"));
});

test("splash markup generation, structure, and text escaping", () => {
  // Fallback to sensible default name
  assert.ok(renderSplashMarkup().includes(">Documentation<"));

  // Branded markup with special characters and layout sections
  const markup = renderSplashMarkup({ name: "Acme <Docs> & Co" });
  assert.ok(markup.includes(`id="${SPLASH_ID}"`));
  assert.ok(markup.includes('role="status"'));
  assert.ok(markup.includes('aria-busy="true"'));
  assert.ok(markup.includes("dmd-splash-mark"));
  assert.ok(markup.includes("dmd-splash-bar"));
  assert.ok(markup.includes("dmd-splash-body"));
  assert.ok(markup.includes("dmd-splash-nav"));
  assert.ok(markup.includes("dmd-splash-article"));
  assert.ok(markup.includes("dmd-splash-toc"));
  assert.ok(markup.includes("dmd-splash-progress"));
  assert.ok(markup.includes("<svg"));
  assert.ok(markup.includes("Loading documentation"));
  assert.ok(markup.includes("Acme &lt;Docs&gt; &amp; Co"));
  assert.ok(!markup.includes("<Docs>"));

  // Tagline support
  const withTagline = renderSplashMarkup({ name: "Docs", tagline: "Everything & more" });
  assert.ok(withTagline.includes("dmd-splash-desc"));
  assert.ok(withTagline.includes("Everything &amp; more"));

  // Version and logo branding
  const branded = renderSplashMarkup({
    name: "Docs",
    version: "1.2.3",
    logo: "./logo.svg",
    logoDark: "./logo-dark.svg",
    logoAlt: "Docs logo",
  });
  assert.ok(branded.includes("dmd-splash-version"));
  assert.ok(branded.includes(">v1.2.3<"));
  assert.ok(branded.includes('src="./logo.svg"'));
  assert.ok(branded.includes('src="./logo-dark.svg"'));
  assert.ok(branded.includes('alt="Docs logo"'));

  // Unsafe logo escaping
  const unsafeLogo = renderSplashMarkup({ name: "Docs", logo: 'x" onerror="alert(1)' });
  assert.ok(!unsafeLogo.includes("onerror="));
});

test("dismissSplash lifecycle, animation hold, and DOM state", () => {
  // Standard dismissal
  const { splash, rootClasses } = installDom();
  dismissSplash();
  assert.ok(splash.classes.has(SPLASH_HIDDEN_CLASS));
  assert.equal(splash.attributes["aria-hidden"], "true");
  assert.equal(splash.removed, true);
  assert.equal(rootClasses.has(SPLASH_ACTIVE_CLASS), false);

  // Idempotent and safe without splash or document
  assert.doesNotThrow(() => dismissSplash());
  const { splash: missing } = installDom(false);
  assert.doesNotThrow(() => dismissSplash());
  assert.equal(missing.removed, false);
  (globalThis as any).document = undefined;
  assert.doesNotThrow(() => dismissSplash());

  // Minimum duration hold
  const { delays: holdDelays } = installDom();
  (globalThis as any).window[SPLASH_START_KEY] = Date.now();
  dismissSplash();
  const hold = holdDelays[0];
  assert.ok(
    hold > 0 && hold <= SPLASH_MIN_DURATION_MS,
    `expected a hold between 1 and ${SPLASH_MIN_DURATION_MS}ms, got ${hold}`,
  );

  // Immediate reveal after minimum duration
  const { delays: immediateDelays } = installDom();
  (globalThis as any).window[SPLASH_START_KEY] = Date.now() - SPLASH_MIN_DURATION_MS - 500;
  dismissSplash();
  assert.equal(immediateDelays[0], 0);
});
