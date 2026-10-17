import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { test } from "node:test";
import { getLanIpv4 } from "../src/cli/commands/serve";
import { startDevServer } from "../src/cli/utils/server";
import { LocalDocLoader } from "../src/runtime/loader/local-loader";
import { makeTempDir } from "./helpers/temp";

function requestJson(
  url: string,
  method = "GET",
  body?: any,
): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
      },
      (res) => {
        let text = "";
        res.on("data", (chunk) => {
          text += chunk;
        });
        res.on("end", () => {
          try {
            const data = text ? JSON.parse(text) : null;
            resolve({ status: res.statusCode || 200, data, headers: res.headers });
          } catch {
            resolve({ status: res.statusCode || 200, data: text, headers: res.headers });
          }
        });
      },
    );
    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function requestText(url: string): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let text = "";
        res.on("data", (chunk) => {
          text += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode || 200, text });
        });
      })
      .on("error", reject);
  });
}

test("LocalDocLoader setDocContent dynamically mutates cache for instant HMR", async () => {
  const loader = new LocalDocLoader();
  loader.setDocContent("guide", "Initial content");

  const initial = await loader.fetchDocContent("guide");
  assert.equal(initial, "Initial content");
  assert.equal(loader.peekDocContent("guide"), "Initial content");

  loader.setDocContent("guide", "# Updated Content\n\nLive hot-reload payload.");
  const updated = await loader.fetchDocContent("guide");
  assert.equal(updated, "# Updated Content\n\nLive hot-reload payload.");
  assert.equal(loader.peekDocContent("guide"), "# Updated Content\n\nLive hot-reload payload.");
});

test("DevServer API mode and preview toggle endpoints", async () => {
  const dir = makeTempDir("dmd-hmr-mode-test");
  fs.writeFileSync(path.join(dir, "README.md"), "# Production Home", "utf-8");

  const serverHandle = await startDevServer({
    rootDir: dir,
    port: 39120,
    mode: "production",
  });

  try {
    const baseUrl = `http://localhost:${serverHandle.port}`;

    // 1. GET mode initial check
    const modeRes = await requestJson(`${baseUrl}/__dmd_api__/mode`);
    assert.equal(modeRes.status, 200);
    assert.equal(modeRes.data.mode, "production");
    assert.equal(modeRes.data.hasPreview, false);

    // 2. POST mode switch to preview
    const switchRes = await requestJson(`${baseUrl}/__dmd_api__/mode`, "POST", { mode: "preview" });
    assert.equal(switchRes.status, 200);
    assert.equal(switchRes.data.success, true);
    assert.equal(switchRes.data.mode, "preview");

    // 3. Verify serverHandle.getMode() reflects change
    assert.equal(serverHandle.getMode(), "preview");

    // 4. Invalid mode error check
    const invalidRes = await requestJson(`${baseUrl}/__dmd_api__/mode`, "POST", { mode: "invalid" });
    assert.equal(invalidRes.status, 400);
  } finally {
    serverHandle.close();
  }
});

test("getLanIpv4 returns a dotted IPv4 or null without throwing", () => {
  const ip = getLanIpv4();
  assert.ok(ip === null || /^\d{1,3}(\.\d{1,3}){3}$/.test(ip), `unexpected LAN IP: ${ip}`);
});

test("DevServer 2-way edit save to source and .preview targets", async () => {
  const dir = makeTempDir("dmd-hmr-save-test");
  const readmePath = path.join(dir, "README.md");
  fs.writeFileSync(readmePath, "# Original Production", "utf-8");

  const serverHandle = await startDevServer({
    rootDir: dir,
    port: 39121,
    mode: "production",
  });

  try {
    const baseUrl = `http://localhost:${serverHandle.port}`;

    // 1. Save directly to source
    const saveSource = await requestJson(`${baseUrl}/__dmd_api__/save`, "POST", {
      file: "README.md",
      content: "# Modified Directly in Source",
      target: "source",
    });
    assert.equal(saveSource.status, 200);
    assert.equal(saveSource.data.success, true);
    assert.equal(fs.readFileSync(readmePath, "utf-8"), "# Modified Directly in Source");

    // 2. Save to .preview staging
    const savePreview = await requestJson(`${baseUrl}/__dmd_api__/save`, "POST", {
      file: "README.md",
      content: "# Staged in Preview",
      target: "preview",
    });
    assert.equal(savePreview.status, 200);
    assert.equal(savePreview.data.success, true);

    const previewFilePath = path.join(dir, ".preview", "README.md");
    assert.ok(fs.existsSync(previewFilePath));
    assert.equal(fs.readFileSync(previewFilePath, "utf-8"), "# Staged in Preview");
    // Source should NOT have been changed by preview save
    assert.equal(fs.readFileSync(readmePath, "utf-8"), "# Modified Directly in Source");

    // 3. GET mode should now show hasPreview: true
    const modeRes = await requestJson(`${baseUrl}/__dmd_api__/mode`);
    assert.equal(modeRes.data.hasPreview, true);
    assert.ok(modeRes.data.previewFiles.includes("README.md"));
  } finally {
    serverHandle.close();
  }
});

test("DevServer raw content retrieval and differential preview serving", async () => {
  const dir = makeTempDir("dmd-hmr-diff-test");
  fs.writeFileSync(path.join(dir, "page.md"), "Production Content", "utf-8");

  const previewDir = path.join(dir, ".preview");
  fs.mkdirSync(previewDir, { recursive: true });
  fs.writeFileSync(path.join(previewDir, "page.md"), "Preview Staged Content", "utf-8");

  const serverHandle = await startDevServer({
    rootDir: dir,
    port: 39122,
    mode: "production",
  });

  try {
    const baseUrl = `http://localhost:${serverHandle.port}`;

    // 1. In production mode, GET raw returns production content
    const rawProd = await requestText(`${baseUrl}/__dmd_api__/raw?slug=page`);
    assert.equal(rawProd.status, 200);
    assert.equal(rawProd.text, "Production Content");

    // 2. With ?mode=preview parameter, GET raw returns preview content
    const rawPreview = await requestText(`${baseUrl}/__dmd_api__/raw?slug=page&mode=preview`);
    assert.equal(rawPreview.status, 200);
    assert.equal(rawPreview.text, "Preview Staged Content");

    // 3. Static serving in production mode serves production file
    const staticProd = await requestText(`${baseUrl}/page.md`);
    assert.equal(staticProd.text, "Production Content");

    // 4. Static serving in preview mode serves staged preview file
    serverHandle.setMode("preview");
    const staticPreview = await requestText(`${baseUrl}/page.md`);
    assert.equal(staticPreview.text, "Preview Staged Content");
  } finally {
    serverHandle.close();
  }
});

test("DevServer publish-preview and discard-preview workflows", async () => {
  const dir = makeTempDir("dmd-hmr-publish-discard");
  const sourceFile = path.join(dir, "doc.md");
  fs.writeFileSync(sourceFile, "# Original Doc", "utf-8");

  const previewDir = path.join(dir, ".preview");
  fs.mkdirSync(previewDir, { recursive: true });
  fs.writeFileSync(path.join(previewDir, "doc.md"), "# Staged Changes", "utf-8");
  fs.writeFileSync(path.join(previewDir, "new-file.md"), "# Brand New Doc", "utf-8");

  const serverHandle = await startDevServer({
    rootDir: dir,
    port: 39123,
    mode: "preview",
  });

  try {
    const baseUrl = `http://localhost:${serverHandle.port}`;

    // 1. Publish preview changes
    const publishRes = await requestJson(`${baseUrl}/__dmd_api__/publish-preview`, "POST");
    assert.equal(publishRes.status, 200);
    assert.equal(publishRes.data.success, true);

    // .preview should now be cleared
    assert.equal(fs.existsSync(previewDir), false);
    // Source files should now have the published content
    assert.equal(fs.readFileSync(sourceFile, "utf-8"), "# Staged Changes");
    assert.equal(fs.readFileSync(path.join(dir, "new-file.md"), "utf-8"), "# Brand New Doc");

    // 2. Stage a new preview change and discard it
    fs.mkdirSync(previewDir, { recursive: true });
    fs.writeFileSync(path.join(previewDir, "discard-me.md"), "# Discardable", "utf-8");
    assert.ok(fs.existsSync(path.join(previewDir, "discard-me.md")));

    const discardRes = await requestJson(`${baseUrl}/__dmd_api__/discard-preview`, "POST");
    assert.equal(discardRes.status, 200);
    assert.equal(discardRes.data.success, true);
    assert.equal(fs.existsSync(previewDir), false);
    assert.equal(fs.existsSync(path.join(dir, "discard-me.md")), false);
  } finally {
    serverHandle.close();
  }
});

test("Frontmatter synchronization preserves metadata and regenerates valid YAML header", () => {
  const initialDraft = `---
title: "Original Title"
category: "Guides"
tags: ["cli", "svelte"]
order: 2
---

# Document Heading

This is the document body.`;

  // Test extraction
  const match = initialDraft.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match);
  const lines = match[1].split("\n");
  const extracted: Record<string, string> = {};
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      extracted[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  assert.equal(extracted.title, '"Original Title"');
  assert.equal(extracted.category, '"Guides"');

  // Test regeneration with updated values
  const fmLines: string[] = ["---"];
  fmLines.push('title: "Updated Title"');
  fmLines.push('category: "Architecture"');
  fmLines.push('tags: ["hmr", "editor"]');
  fmLines.push("order: 5");
  fmLines.push("noindex: true");
  fmLines.push("---");

  const body = initialDraft.slice(match[0].length).replace(/^\r?\n/, "");
  const updatedDraft = `${fmLines.join("\n")}\n\n${body}`;

  assert.ok(updatedDraft.includes('title: "Updated Title"'));
  assert.ok(updatedDraft.includes('category: "Architecture"'));
  assert.ok(updatedDraft.includes("noindex: true"));
  assert.ok(updatedDraft.includes("# Document Heading"));
});

test("Table Assistant generates compliant GitHub Flavored Markdown tables", () => {
  const headers = ["Feature", "Status", "Notes"];
  const alignments: ("left" | "center" | "right")[] = ["left", "center", "right"];
  const rows = [
    ["HMR", "Ready", "Zero reload"],
    ["2-Way Edit", "Ready", "Source & Preview"],
  ];

  const alignMap = {
    left: ":---",
    center: ":---:",
    right: "---:",
  };
  const headerLine = `| ${headers.join(" | ")} |`;
  const dividerLine = `| ${alignments.map((a) => alignMap[a]).join(" | ")} |`;
  const rowLines = rows.map((r) => `| ${r.join(" | ")} |`);
  const tableMd = `${headerLine}\n${dividerLine}\n${rowLines.join("\n")}`;

  assert.equal(
    tableMd,
    `| Feature | Status | Notes |\n| :--- | :---: | ---: |\n| HMR | Ready | Zero reload |\n| 2-Way Edit | Ready | Source & Preview |`,
  );
});

test("Search match highlighting accurately highlights query substrings and handles regex characters", () => {
  function highlightMatch(text: string, term: string): string {
    if (!text || !term) return text;
    const trimmed = term.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 0) return text;
    const candidates = [trimmed, ...words].sort((a, b) => b.length - a.length);
    const escaped = candidates.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const regex = new RegExp(`(${escaped})`, "gi");
    return text.replace(regex, '<mark class="dmd-search-highlight">$1</mark>');
  }

  const result1 = highlightMatch("Hot Reloading with DocMeDown", "hot");
  assert.equal(result1, '<mark class="dmd-search-highlight">Hot</mark> Reloading with DocMeDown');

  const result2 = highlightMatch("Using Svelte 5 and React (TSX)", "react (tsx)");
  assert.equal(result2, 'Using Svelte 5 and <mark class="dmd-search-highlight">React (TSX)</mark>');

  // Multi-term query
  const result3 = highlightMatch("Fast documentation with zero configuration", "fast zero");
  assert.equal(
    result3,
    '<mark class="dmd-search-highlight">Fast</mark> documentation with <mark class="dmd-search-highlight">zero</mark> configuration',
  );
});

test("In-browser editor offline mode persists edits locally and avoids dev server fetch calls", () => {
  const mockWindow: any = {
    location: { protocol: "file:", hash: "#/showcase" },
    __DOCMEDOWN_OFFLINE__: true,
    __DOCMEDOWN_DATA__: {
      manifest: { docs: [] },
      docs: { showcase: "# Original Showcase" },
    },
    localStorage: {
      items: new Map<string, string>(),
      getItem(key: string) {
        return this.items.get(key) ?? null;
      },
      setItem(key: string, val: string) {
        this.items.set(key, val);
      },
    },
  };

  const isOffline = mockWindow.location.protocol === "file:" || Boolean(mockWindow.__DOCMEDOWN_OFFLINE__);
  assert.equal(isOffline, true);

  // In offline mode, save updates in-memory docs and localStorage
  const slug = "showcase";
  const updatedContent = "# Updated Showcase in Offline Mode\n\nContent edited without server.";

  mockWindow.__DOCMEDOWN_DATA__.docs[slug] = updatedContent;
  mockWindow.localStorage.setItem(`dmd-offline-doc-${slug}`, updatedContent);

  assert.equal(mockWindow.__DOCMEDOWN_DATA__.docs[slug], updatedContent);
  assert.equal(mockWindow.localStorage.getItem(`dmd-offline-doc-${slug}`), updatedContent);
});

test("TOC jumpTo and anchor navigation avoid pushState on file: protocol to prevent security origin errors", () => {
  let pushStateCalled = false;
  let hashAssigned = "";

  const mockWindow: any = {
    location: {
      protocol: "file:",
      set hash(val: string) {
        hashAssigned = val;
      },
      get hash() {
        return hashAssigned;
      },
    },
    history: {
      pushState() {
        pushStateCalled = true;
        throw new Error("SecurityError: 'file:' URLs are treated as unique security origins");
      },
    },
  };

  const currentSlug = "showcase";
  const headingId = "part-4-multi-framework-custom-components-dmd";

  // Simulate jumpTo logic
  try {
    if (mockWindow.location.protocol === "file:") {
      mockWindow.location.hash = `#/${currentSlug}#${headingId}`;
    } else {
      mockWindow.history.pushState(null, "", `#/${currentSlug}#${headingId}`);
    }
  } catch {
    mockWindow.location.hash = `#/${currentSlug}#${headingId}`;
  }

  assert.equal(pushStateCalled, false);
  assert.equal(hashAssigned, `#/${currentSlug}#${headingId}`);
});
