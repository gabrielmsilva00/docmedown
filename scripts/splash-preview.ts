import fs from "node:fs";
import { renderSplashHead, renderSplashMarkup } from "../src/runtime/splash";

const opts = {
  name: "DocMeDown",
  tagline: "The simplest MarkDown documenter yet — CLI, web runtime, and static-site compiler.",
  version: "0.2.0",
  accent: "#315cf5",
};

const shell = (family: string, mode: string) => `<!doctype html>
<html lang="en" data-dmd-theme="${family}" data-theme="${mode}" data-dmd-mode="${mode}" data-dmd-density="comfortable">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Splash — ${family} ${mode}</title>${renderSplashHead(opts)}</head>
<body>${renderSplashMarkup(opts)}<div id="dmd-app" style="height:120vh"></div></body></html>`;

const pages = [
  ["atlas", "light"],
  ["atlas", "dark"],
  ["blueprint", "light"],
  ["blueprint", "dark"],
  ["terminal", "light"],
  ["terminal", "dark"],
  ["editorial", "light"],
  ["editorial", "dark"],
];

fs.mkdirSync("node_modules/.cache/splash-preview", { recursive: true });
for (const [family, mode] of pages) {
  fs.writeFileSync(`node_modules/.cache/splash-preview/${family}-${mode}.html`, shell(family, mode));
}
console.log("wrote", pages.length, "previews to node_modules/.cache/splash-preview/");
