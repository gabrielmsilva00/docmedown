import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import chalk from "chalk";
import chokidar from "chokidar";
import mime from "mime-types";
import { WebSocket, WebSocketServer } from "ws";
import { renderSplashHead, renderSplashMarkup } from "../../runtime/splash";
import { shouldWatchDocumentationSource } from "../commands/build";
import { detectRootMarkdownFiles, linkRootMarkdownFiles } from "./link-root";

export interface DevServerOptions {
  port?: number;
  host?: string;
  rootDir: string;
  openBrowser?: boolean;
  onSourceChange?: (event: string, changedPath: string) => Promise<void> | void;
  mode?: "preview" | "production";
}

export interface DevServerHandle {
  server: http.Server;
  port: number;
  close: () => void;
  getMode: () => "preview" | "production";
  setMode: (mode: "preview" | "production") => void;
}

export function shouldRebuildDocumentation(rootDir: string, changedPath: string): boolean {
  return shouldWatchDocumentationSource(rootDir, changedPath);
}

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function normalizeSlug(relPath: string): string {
  const clean = relPath.replace(/\\/g, "/").replace(/\.(md|mdx)$/i, "");
  const base = path.basename(clean).toLowerCase();
  return base === "readme" || base === "index" ? "README" : clean;
}

function copyRecursiveSync(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    }
  } else {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

export function startDevServer(options: DevServerOptions): Promise<DevServerHandle> {
  const { rootDir, host = "localhost", port: initialPort = 3000, onSourceChange } = options;

  return new Promise((resolve, reject) => {
    let port = initialPort;
    let serverMode: "preview" | "production" = options.mode || "production";
    const previewDir = path.join(rootDir, ".preview");

    const clients = new Set<WebSocket>();

    function broadcast(message: object | string) {
      const payload = typeof message === "string" ? message : JSON.stringify(message);
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      }
    }

    const liveReloadScript = `
<script>
(function() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  window.__DOCMEDOWN_DEV__ = {
    mode: ${JSON.stringify(serverMode)},
    active: true
  };

  let ws = null;
  function connect() {
    ws = new WebSocket(protocol + '//' + window.location.host + '/__dmd_reload');
    ws.onopen = function() {
      console.log('[DocMeDown HMR] Connected to live dev server (Mode: ' + window.__DOCMEDOWN_DEV__.mode + ')');
    };
    ws.onmessage = function(e) {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'hmr:update') {
          console.log('[DocMeDown HMR] Hot updating ' + data.slug + ' in-place without page reload');
          if (window.__DOCMEDOWN_STORE__ && typeof window.__DOCMEDOWN_STORE__.applyHmrUpdate === 'function') {
            window.__DOCMEDOWN_STORE__.applyHmrUpdate(data.slug, data.content);
            window.dispatchEvent(new CustomEvent('dmd:hmr-update', { detail: data }));
            return;
          }
        } else if (data.type === 'hmr:config') {
          console.log('[DocMeDown HMR] Hot updating configuration in-place');
          if (window.__DOCMEDOWN_STORE__ && typeof window.__DOCMEDOWN_STORE__.updateConfig === 'function') {
            window.__DOCMEDOWN_STORE__.updateConfig(data.config);
            window.dispatchEvent(new CustomEvent('dmd:hmr-config', { detail: data }));
            return;
          }
        } else if (data.type === 'hmr:mode') {
          window.__DOCMEDOWN_DEV__.mode = data.mode;
          if (window.__DOCMEDOWN_STORE__) {
            window.__DOCMEDOWN_STORE__.serverMode = data.mode;
          }
          window.dispatchEvent(new CustomEvent('dmd:mode-change', { detail: data }));
          return;
        }
      } catch (err) {
        // Fallback for non-JSON payloads
      }

      if (e.data === 'reload' || (typeof e.data === 'string' && e.data.includes('"type":"reload"'))) {
        console.log('[DocMeDown] File changed, reloading...');
        window.location.reload();
      }
    };
    ws.onclose = function() {
      setTimeout(connect, 1500);
    };
  }
  connect();
})();
</script>
`;

    const server = http.createServer(async (req, res) => {
      // Enable CORS for local development
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-dmd-mode");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const pathname = parsedUrl.pathname;

      // ==========================================
      // DX API ENDPOINTS (2-Way Editing & Previews)
      // ==========================================
      if (pathname.startsWith("/__dmd_api__/")) {
        res.setHeader("Content-Type", "application/json");

        // 1. GET /__dmd_api__/mode - Query current server mode & preview status
        if (req.method === "GET" && pathname === "/__dmd_api__/mode") {
          const hasPreview = fs.existsSync(previewDir);
          const previewFiles: string[] = [];
          if (hasPreview) {
            const findFiles = (dir: string) => {
              for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) findFiles(full);
                else previewFiles.push(path.relative(previewDir, full).replace(/\\/g, "/"));
              }
            };
            findFiles(previewDir);
          }
          res.writeHead(200);
          res.end(JSON.stringify({ mode: serverMode, hasPreview, previewFiles }));
          return;
        }

        // 2. POST /__dmd_api__/mode - Toggle or set server mode (preview vs production)
        if (req.method === "POST" && pathname === "/__dmd_api__/mode") {
          try {
            const body = await parseBody(req);
            if (body.mode === "preview" || body.mode === "production") {
              serverMode = body.mode;
              broadcast({ type: "hmr:mode", mode: serverMode });
              res.writeHead(200);
              res.end(JSON.stringify({ success: true, mode: serverMode }));
            } else {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'Invalid mode: must be "preview" or "production"' }));
            }
          } catch (err) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        // 3. POST /__dmd_api__/save - Save markdown edits to source or .preview
        if (req.method === "POST" && pathname === "/__dmd_api__/save") {
          try {
            const body = await parseBody(req);
            const { file, content, target = serverMode === "preview" ? "preview" : "source" } = body;

            if (!file || typeof content !== "string") {
              res.writeHead(400);
              res.end(JSON.stringify({ error: "Missing required fields: file and content" }));
              return;
            }

            const cleanRel = file.replace(/^[/\\]+/, "").replace(/\\/g, "/");
            const destDir = target === "preview" ? previewDir : rootDir;
            const destPath = path.join(destDir, cleanRel);

            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.writeFileSync(destPath, content, "utf-8");

            const slug = normalizeSlug(cleanRel);
            // Broadcast HMR update to all connected clients immediately
            broadcast({
              type: "hmr:update",
              file: cleanRel,
              slug,
              content,
              target,
            });

            console.log(chalk.green(`[DocMeDown 2-Way Edit] Saved ${cleanRel} to ${target}`));
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, file: cleanRel, target, slug }));
          } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        // 4. POST /__dmd_api__/publish-preview - Copy .preview files into rootDir
        if (req.method === "POST" && pathname === "/__dmd_api__/publish-preview") {
          try {
            if (fs.existsSync(previewDir)) {
              copyRecursiveSync(previewDir, rootDir);
              fs.rmSync(previewDir, { recursive: true, force: true });
              broadcast({ type: "reload" });
              console.log(chalk.green(`[DocMeDown Preview] Published all preview changes to production source.`));
            }
            res.writeHead(200);
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        // 5. POST /__dmd_api__/discard-preview - Discard .preview staging changes
        if (req.method === "POST" && pathname === "/__dmd_api__/discard-preview") {
          try {
            if (fs.existsSync(previewDir)) {
              fs.rmSync(previewDir, { recursive: true, force: true });
              broadcast({ type: "reload" });
              console.log(chalk.yellow(`[DocMeDown Preview] Discarded preview staging directory.`));
            }
            res.writeHead(200);
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        // 6. GET /__dmd_api__/raw - Get raw markdown source for active doc
        if (req.method === "GET" && pathname === "/__dmd_api__/raw") {
          const reqFile = parsedUrl.searchParams.get("file");
          const reqSlug = parsedUrl.searchParams.get("slug");
          let targetPath: string | null = null;

          const candidates: string[] = [];
          if (reqFile) candidates.push(reqFile);
          if (reqSlug) {
            candidates.push(
              `${reqSlug}.md`,
              `${reqSlug}.mdx`,
              `${reqSlug}/README.md`,
              `${reqSlug}/index.md`,
              reqSlug === "README" ? "README.md" : "",
            );
          }

          const isPreviewActive = serverMode === "preview" || parsedUrl.searchParams.get("mode") === "preview";
          for (const cand of candidates.filter(Boolean)) {
            if (isPreviewActive) {
              const previewCand = path.join(previewDir, cand);
              if (fs.existsSync(previewCand) && fs.statSync(previewCand).isFile()) {
                targetPath = previewCand;
                break;
              }
            }
            const rootCand = path.join(rootDir, cand);
            if (fs.existsSync(rootCand) && fs.statSync(rootCand).isFile()) {
              targetPath = rootCand;
              break;
            }
          }

          if (targetPath) {
            const raw = fs.readFileSync(targetPath, "utf-8");
            res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
            res.end(raw);
          } else {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Document source not found" }));
          }
          return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: "Unknown API endpoint" }));
        return;
      }

      // ==========================================
      // STATIC & DOCUMENT SERVING
      // ==========================================
      let reqPath = decodeURIComponent(parsedUrl.pathname);
      if (reqPath === "/" || reqPath === "") {
        reqPath = "/index.html";
      }

      const isPreviewRequest = serverMode === "preview" || parsedUrl.searchParams.get("mode") === "preview";

      let filePath = path.join(rootDir, reqPath);

      // Check preview folder first if preview mode is active
      if (isPreviewRequest) {
        const previewCandidate = path.join(previewDir, reqPath);
        if (fs.existsSync(previewCandidate) && fs.statSync(previewCandidate).isFile()) {
          filePath = previewCandidate;
        }
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const ext = path.extname(reqPath);
        if (ext) {
          // Asset request (js/css/json/...) — resolve from the docs root so
          // /showcase/_docs.js still finds docs/_docs.js.
          filePath = path.join(rootDir, path.basename(reqPath));
          if (!fs.existsSync(filePath)) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("404 Not Found");
            return;
          }
        } else {
          // SPA route — serve the shell.
          const potentialIndex = path.join(rootDir, "index.html");
          if (fs.existsSync(potentialIndex)) {
            filePath = potentialIndex;
          } else {
            // Serve fallback runtime template
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(`
<!DOCTYPE html>
<html>
<head><title>DocMeDown</title>${renderSplashHead()}</head>
<body>
  ${renderSplashMarkup({ name: "DocMeDown" })}
  <div id="dmd-app"></div>
  <script src="/docmedown.web.js"></script>
  ${liveReloadScript}
</body>
</html>
            `);
            return;
          }
        }
      }

      // Check if requesting a bundled runtime asset
      const requestedAsset = path.basename(reqPath);
      if (
        ["docmedown.web.js", "docmedown-mermaid.js", "docmedown-compiler.js"].includes(requestedAsset) &&
        !fs.existsSync(filePath)
      ) {
        const bundleCandidates = [
          path.resolve(__dirname, requestedAsset),
          path.resolve(__dirname, "../dist", requestedAsset),
          path.resolve(__dirname, "..", requestedAsset),
        ];
        const distFile = bundleCandidates.find((p) => fs.existsSync(p));
        if (distFile) {
          filePath = distFile;
        }
      }

      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          filePath = path.join(filePath, "index.html");
        }

        const mimeType = filePath.endsWith(".svelte")
          ? "text/plain; charset=utf-8"
          : mime.lookup(filePath) || "application/octet-stream";
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        if (mimeType.includes("html")) {
          let content = fs.readFileSync(filePath, "utf-8");
          if (!content.includes("/__dmd_reload")) {
            content = content.replace("</body>", `${liveReloadScript}</body>`);
          }
          res.writeHead(200);
          res.end(content);
        } else {
          const stream = fs.createReadStream(filePath);
          res.writeHead(200);
          stream.pipe(res);
        }
      } catch (_err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
      }
    });

    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
      if (request.url === "/__dmd_reload") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          clients.add(ws);
          ws.on("close", () => clients.delete(ws));
        });
      } else {
        socket.destroy();
      }
    });

    // File watcher for hot reload
    const parentDir = path.dirname(rootDir);
    const rootFiles = detectRootMarkdownFiles(parentDir);
    const watchPaths = [rootDir, ...rootFiles.map((f) => path.join(parentDir, f))];

    const watcher = chokidar.watch(watchPaths, {
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/.dist/**",
        "**/.nojekyll",
        "**/_manifest.json",
        "**/_docs.js",
        "**/docmedown.web.js",
        "**/docmedown-mermaid.js",
      ],
      ignoreInitial: true,
      followSymlinks: true,
    });

    let reloadTimeout: NodeJS.Timeout | null = null;
    watcher.on("all", (event, changedPath) => {
      if (!shouldRebuildDocumentation(rootDir, changedPath)) return;

      const isDirectParentMarkdown =
        path.dirname(path.resolve(changedPath)).toLowerCase() === parentDir.toLowerCase() &&
        /\.(md|mdx)$/i.test(changedPath);

      if (isDirectParentMarkdown && (event === "add" || event === "unlink")) {
        linkRootMarkdownFiles(parentDir, rootDir);
      }

      if (reloadTimeout) clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(async () => {
        const isPreview = changedPath.includes(".preview");
        const rel = isDirectParentMarkdown
          ? path.basename(changedPath)
          : path.relative(isPreview ? previewDir : rootDir, changedPath).replace(/\\/g, "/");

        // Targeted HMR for Markdown files
        if (/\.(md|mdx)$/i.test(changedPath) && fs.existsSync(changedPath)) {
          try {
            const content = fs.readFileSync(changedPath, "utf-8");
            const slug = normalizeSlug(rel);

            console.log(
              chalk.cyan(`[DocMeDown HMR] Document changed: ${rel} -> Emitting in-place update for ${slug}...`),
            );
            broadcast({
              type: "hmr:update",
              file: rel,
              slug,
              content,
              preview: isPreview,
            });

            // Rebuild in background for offline bundle and static artifacts
            if (onSourceChange) {
              await onSourceChange(event, changedPath);
            }
            return;
          } catch (err: any) {
            console.error(chalk.red(`[DocMeDown HMR] Error reading changed markdown: ${err.message}`));
          }
        }

        // Targeted HMR for configuration files
        if ((rel === "docs.json" || rel === "dmd.json") && fs.existsSync(changedPath)) {
          try {
            const rawConfig = fs.readFileSync(changedPath, "utf-8");
            const parsedConfig = JSON.parse(rawConfig);
            console.log(
              chalk.cyan(`[DocMeDown HMR] Configuration changed: ${rel} -> Emitting in-place config update...`),
            );
            broadcast({
              type: "hmr:config",
              config: parsedConfig,
            });

            if (onSourceChange) {
              await onSourceChange(event, changedPath);
            }
            return;
          } catch (err: any) {
            console.error(chalk.red(`[DocMeDown HMR] Error reading changed config: ${err.message}`));
          }
        }

        // Fallback full reload for non-HMR assets or shell scripts
        try {
          if (onSourceChange) {
            console.log(chalk.cyan(`[DocMeDown] Changed: ${rel} -> Rebuilding documentation...`));
            await onSourceChange(event, changedPath);
          } else {
            console.log(chalk.cyan(`[DocMeDown] Changed: ${rel} -> Reloading preview...`));
          }
        } catch (err: any) {
          console.error(chalk.red(`[DocMeDown] Rebuild failed: ${err.message}`));
        }

        broadcast("reload");
      }, 100);
    });

    function tryListen() {
      server.listen(port, host, () => {
        resolve({
          server,
          port,
          close: () => {
            watcher.close();
            wss.close();
            server.close();
          },
          getMode: () => serverMode,
          setMode: (mode: "preview" | "production") => {
            serverMode = mode;
            broadcast({ type: "hmr:mode", mode });
          },
        });
      });

      server.on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          port++;
          tryListen();
        } else {
          reject(err);
        }
      });
    }

    tryListen();
  });
}
