import assert from "node:assert/strict";
import { test } from "node:test";
import { createRouter, isStaticRuntime, StaticRouter } from "../src/runtime/router";

interface TestWindow {
  location: { protocol: string; hostname: string; pathname: string; hash: string };
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
  history: { pushState: (state: unknown, title: string, url: string) => void };
  [key: string]: any;
}

function installStaticWindow(pathname: string, slug: string, base = ""): TestWindow {
  const listeners: Record<string, Array<() => void>> = {};
  const win: TestWindow = {
    location: { protocol: "https:", hostname: "docs.test", pathname, hash: "" },
    addEventListener: (type, cb) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(cb);
    },
    removeEventListener: (type, cb) => {
      listeners[type] = (listeners[type] || []).filter((entry) => entry !== cb);
    },
    history: {
      pushState: (_state, _title, url) => {
        const [pathPart, hashPart] = String(url).split("#");
        win.location.pathname = pathPart;
        win.location.hash = hashPart ? `#${hashPart}` : "";
      },
    },
  };
  win.__DOCMEDOWN_STATIC_SLUG__ = slug;
  win.__DOCMEDOWN_STATIC_BASE__ = base;
  (globalThis as any).window = win;
  (globalThis as any).document = { getElementById: () => null };
  return win;
}

function uninstallWindow() {
  delete (globalThis as any).window;
  delete (globalThis as any).document;
}

test("StaticRouter derives routes and URLs from the pathname", () => {
  installStaticWindow("/guides/intro/", "guides/intro");
  const router = new StaticRouter();

  assert.equal(isStaticRuntime(), true);
  assert.equal(router.getCurrentRoute().slug, "guides/intro");
  assert.equal(router.urlForSlug("README"), "/");
  assert.equal(router.urlForSlug("guides/other"), "/guides/other/");
  assert.equal(router.urlForSlug("guides/other", "setup"), "/guides/other/#setup");

  uninstallWindow();
});

test("StaticRouter works on GitHub Pages project subpaths", () => {
  installStaticWindow("/repo/guides/intro/", "guides/intro");
  const router = new StaticRouter();

  assert.equal(router.getCurrentRoute().slug, "guides/intro");
  assert.equal(router.urlForSlug("README"), "/repo/");
  assert.equal(router.urlForSlug("guides/other"), "/repo/guides/other/");

  uninstallWindow();
});

test("StaticRouter.navigate pushes canonical URLs and emits routes", () => {
  const win = installStaticWindow("/guides/intro/", "guides/intro");
  const router = new StaticRouter();

  const seen: string[] = [];
  router.subscribe((route) => seen.push(route.slug));
  router.navigate("README");

  assert.equal(win.location.pathname, "/");
  assert.deepEqual(seen, ["README"]);
  assert.equal(router.getCurrentRoute().slug, "README");

  uninstallWindow();
});

test("StaticRouter.resolveLink converts relative markdown links to page URLs", () => {
  installStaticWindow("/guides/intro/", "guides/intro");
  const router = new StaticRouter();

  assert.equal(router.resolveLink("./other.md", "guides/intro"), "/guides/other/");
  assert.equal(router.resolveLink("../README.md", "guides/intro"), "/");
  assert.equal(router.resolveLink("https://example.com", "guides/intro"), "https://example.com");

  uninstallWindow();
});

test("StaticRouter parses legacy hash-route anchors onto the page", () => {
  installStaticWindow("/guides/intro/", "guides/intro");
  const router = new StaticRouter();

  const route = router.parseStaticPath("/guides/intro/", "#/guides/intro#setup");
  assert.equal(route.slug, "guides/intro");
  assert.equal(route.anchor, "setup");
  assert.equal(route.fullPath, "/guides/intro/#setup");

  uninstallWindow();
});

test("createRouter returns a StaticRouter only when static globals are present", () => {
  installStaticWindow("/", "README");
  assert.ok(createRouter() instanceof StaticRouter);
  uninstallWindow();

  (globalThis as any).window = {
    location: { protocol: "https:", pathname: "/", hash: "", hostname: "x" },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    history: { pushState: () => undefined },
  };
  (globalThis as any).document = { getElementById: () => null };
  assert.equal(isStaticRuntime(), false);
  assert.equal(createRouter().constructor.name, "HashRouter");
  uninstallWindow();
});
