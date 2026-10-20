import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const require = createRequire(import.meta.url);
const playwright = require(process.env.DMD_PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.resolve(
  process.env.DMD_BROWSER_REPORT || path.join(os.tmpdir(), "dmd-readiness-browser-results.json"),
);
const browsers = (process.env.DMD_BROWSERS || "chromium,firefox,webkit").split(",");
const results = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, status: "PASS", detail });
  } catch (e) {
    results.push({ name, status: "FAIL", error: e.stack });
  }
  console.log(JSON.stringify(results.at(-1)));
}
async function main() {
  const server = http.createServer((req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (!pathname.startsWith("/docmedown/")) {
        res.writeHead(404).end();
        return;
      }
      let file = path.resolve(root, "docs/.dmd", pathname.slice("/docmedown/".length));
      const relative = path.relative(path.resolve(root, "docs/.dmd"), file);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        res.writeHead(403).end();
        return;
      }
      if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      res.setHeader(
        "Content-Type",
        file.endsWith(".js")
          ? "application/javascript"
          : file.endsWith(".html")
            ? "text/html"
            : "application/octet-stream",
      );
      res.end(fs.readFileSync(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/docmedown/`;
  const source = `import * as cache from './src/runtime/compiler-cache.ts'; import {createReactBridge} from './src/runtime/bridges/react-bridge.ts'; import * as React from 'react'; import {createRoot} from 'react-dom/client'; window.gate={...cache,createReactBridge,React,createRoot};`;
  const bundle = await esbuild.build({
    stdin: { contents: source, resolveDir: root },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    define: { "process.env.NODE_ENV": '"production"' },
    external: ["node:crypto"],
  });
  try {
    for (const channel of browsers) {
      const engine = ["chrome", "msedge"].includes(channel) ? playwright.chromium : playwright[channel];
      assert.ok(engine, `Unsupported browser: ${channel}`);
      const browser = await engine.launch({
        ...(["chrome", "msedge"].includes(channel) ? { channel } : {}),
        headless: true,
      });
      const version = browser.version();
      try {
        for (const offline of [false, true]) {
          const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
          const page = await context.newPage();
          page.setDefaultTimeout(15000);
          const errors = [];
          page.on("pageerror", (e) => {
            errors.push(e.message);
            console.error(JSON.stringify({ diagnostic: "pageerror", channel, offline, stack: e.stack }));
          });
          if (offline) {
            // WebKit on Windows rejects even a trivial file:/// page when
            // offline emulation is enabled. Abort every HTTP(S) request instead;
            // local-file execution still cannot obtain any network resources.
            if (channel !== "webkit") await context.setOffline(true);
            await context.route(/^https?:/, (route) => route.abort());
          }
          await check(`${channel} ${version} ${offline ? "file offline" : "served subpath"} reader`, async () => {
            await page.goto(offline ? pathToFileURL(`${root}/docs/.dmd/.singlefile/index.html`).href : base);
            await page.locator(".dmd-article").waitFor({ timeout: 30000 });
            assert.ok((await page.locator(".dmd-article").innerText()).length > 100);
            await page.locator(".dmd-search-trigger").click();
            await page.locator(".dmd-search-input").fill("indexing");
            await page.locator(".dmd-search-item").first().waitFor({ timeout: 10000 });
            await page.keyboard.press("Escape");
            assert.equal(await page.locator('[role="dialog"][aria-label="Documentation search"]').count(), 0);
            assert.deepEqual(errors, []);
            return { errors, network: offline ? "all HTTP(S) requests blocked" : "served" };
          });
          await check(`${channel} ${offline ? "offline" : "served"} packaged framework interactions`, async () => {
            const counter = page.locator("dmd-counter-widget").first();
            const countButton = counter.getByRole("button", { name: "Count: 0", exact: true });
            await countButton.click();
            await counter.getByRole("button", { name: "Count: 1", exact: true }).waitFor();
            const boost = page.getByRole("button", { name: "Boost: 1200 req/s", exact: true }).first();
            await boost.click();
            await page.getByRole("button", { name: "Boost: 1250 req/s", exact: true }).first().waitFor();
            await page.getByRole("button", { name: "Reset", exact: true }).first().click();
            await page.getByRole("button", { name: "Boost: 1200 req/s", exact: true }).first().waitFor();
            await page.getByText("Production Cluster:", { exact: true }).first().waitFor();
            assert.deepEqual(errors, []);
            return { svelte: "incremented", react: "incremented and reset", element: "rendered" };
          });
          await check(`${channel} ${offline ? "offline" : "served"} themes and mobile`, async () => {
            await page.keyboard.press("Escape");
            await page.locator(".dmd-appearance-trigger").click();
            for (const family of ["Atlas", "Blueprint", "Terminal", "Editorial", "Botanical", "Studio"]) {
              await page.locator(".dmd-theme-family-card").filter({ hasText: family }).click();
              assert.equal(await page.locator("html").getAttribute("data-dmd-theme"), family.toLowerCase());
              await page.getByRole("button", { name: "dark", exact: true }).click();
              assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
              await page.getByRole("button", { name: "light", exact: true }).click();
            }
            await page.keyboard.press("Escape");
            assert.equal(
              await page.locator(".dmd-appearance-trigger").evaluate((e) => e === document.activeElement),
              true,
            );
            const widths = [];
            for (const width of [390, 768, 1440]) {
              await page.setViewportSize({ width, height: 900 });
              await page.waitForTimeout(300);
              const actual = await page.evaluate(() => ({
                width: innerWidth,
                scroll: document.documentElement.scrollWidth,
              }));
              widths.push(actual);
              assert.ok(actual.scroll <= actual.width + 2, JSON.stringify(actual));
            }
            assert.deepEqual(errors, []);
            return widths;
          });
          await check(
            `${channel} ${offline ? "offline" : "served"} routing, diagrams and keyboard search`,
            async () => {
              const target = offline
                ? `${pathToFileURL(`${root}/docs/.dmd/.singlefile/index.html`).href}#/guides/markdown-features`
                : `${base}guides/markdown-features/`;
              await page.goto(target);
              await page.locator(".dmd-article").waitFor();
              await page.waitForFunction(() =>
                document.querySelector(".dmd-article")?.textContent.includes("GitHub-Style"),
              );
              await page.locator("dmd-mermaid").first().scrollIntoViewIfNeeded();
              await page.waitForFunction(
                () =>
                  Array.from(document.querySelectorAll("dmd-mermaid")).some(
                    (e) => e.querySelector("svg") || e.shadowRoot?.querySelector("svg"),
                  ),
                {},
                { timeout: 20000 },
              );
              await page.reload();
              await page.locator(".dmd-article").waitFor();
              await page.locator(".dmd-search-trigger").focus();
              await page.keyboard.press("Enter");
              await page.locator(".dmd-search-input").fill("indexing performance");
              await page.locator(".dmd-search-item").first().waitFor();
              await page.keyboard.press("Tab");
              assert.equal(await page.evaluate(() => !!document.activeElement.closest(".dmd-search-modal")), true);
              await page.keyboard.press("Escape");
              await page.locator(".dmd-search-trigger").click();
              await page.locator(".dmd-search-input").fill("indexing performance");
              await page.locator(".dmd-search-item").first().waitFor();
              const selectedTitle = await page.locator(".dmd-search-item-title").first().innerText();
              console.log(
                JSON.stringify({
                  diagnostic: "keyboard-search-before",
                  offline,
                  channel,
                  selectedTitle,
                  items: await page.locator(".dmd-search-item-title").allTextContents(),
                }),
              );
              await page.locator(".dmd-search-input").focus();
              await page.keyboard.press("Enter");
              await page.waitForFunction(
                (title) => document.querySelector(".dmd-article")?.textContent.includes(title),
                selectedTitle,
              );
              console.log(
                JSON.stringify({
                  diagnostic: "keyboard-search-after",
                  offline,
                  channel,
                  url: page.url(),
                  article: (await page.locator(".dmd-article").innerText()).slice(0, 220),
                }),
              );
              assert.deepEqual(errors, []);
              return { url: page.url(), errors };
            },
          );
          await context.close();
        }
        const context = await browser.newContext();
        const pages = await Promise.all([context.newPage(), context.newPage()]);
        await Promise.all(
          pages.map(async (p) => {
            await p.goto(base);
            await p.addScriptTag({ content: bundle.outputFiles[0].text });
          }),
        );
        await check(`${channel} concurrent compiler cache, persistence, invalidation`, async () => {
          const values = await Promise.all(
            pages.map((p, i) =>
              p.evaluate(async (_i) => {
                const h = await gate.computeSourceHash("source", "browser-gate");
                await gate.setCachedCompiledComponent(h, "compiled");
                return { h, v: await gate.getCachedCompiledComponent(h) };
              }, i),
            ),
          );
          assert.equal(values[0].h, values[1].h);
          assert.equal(values[0].v, "compiled");
          await pages[0].reload();
          await pages[0].addScriptTag({ content: bundle.outputFiles[0].text });
          const persisted = await pages[0].evaluate(async () => {
            const h = await gate.computeSourceHash("source", "browser-gate");
            return {
              v: await gate.getCachedCompiledComponent(h),
              changed: await gate.getCachedCompiledComponent(await gate.computeSourceHash("changed", "browser-gate")),
            };
          });
          assert.deepEqual(persisted, { v: "compiled", changed: null });
          return persisted;
        });
        await check(`${channel} unavailable IndexedDB fallback`, async () => {
          const value = await pages[0].evaluate(async () => {
            Object.defineProperty(window, "indexedDB", { value: undefined, configurable: true });
            await gate.setCachedCompiledComponent("fallback", "fallback-code");
            return await gate.getCachedCompiledComponent("fallback");
          });
          assert.equal(value, "fallback-code");
          return value;
        });
        await check(`${channel} React bridge shadow reconnect`, async () => {
          const result = await pages[1].evaluate(async () => {
            const Widget = () => gate.React.createElement("button", null, "Bridge ready");
            customElements.define(
              "gate-react-shadow",
              gate.createReactBridge(Widget, { React: gate.React, createRoot: gate.createRoot, shadowRoot: true }),
            );
            const el = document.createElement("gate-react-shadow");
            document.body.append(el);
            await el.mountPromise;
            await new Promise((r) => setTimeout(r, 50));
            const initial = el.shadowRoot.textContent;
            el.remove();
            document.body.append(el);
            await el.mountPromise;
            await new Promise((r) => setTimeout(r, 50));
            return { initial, reconnected: el.shadowRoot.textContent };
          });
          assert.ok(result.initial.includes("Bridge ready"));
          assert.ok(result.reconnected.includes("Bridge ready"));
          return result;
        });
        await context.close();
      } finally {
        await browser.close();
      }
    }
  } finally {
    server.close();
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          version: JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version,
          platform: process.platform,
          node: process.version,
          results,
        },
        null,
        2,
      ),
    );
  }
  if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
