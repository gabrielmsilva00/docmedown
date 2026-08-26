import http from 'http';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { WebSocketServer, WebSocket } from 'ws';
import chokidar from 'chokidar';
import chalk from 'chalk';
import { shouldWatchDocumentationSource } from '../commands/build';

export interface DevServerOptions {
  port?: number;
  host?: string;
  rootDir: string;
  openBrowser?: boolean;
  onSourceChange?: (event: string, changedPath: string) => Promise<void> | void;
}

export function shouldRebuildDocumentation(rootDir: string, changedPath: string): boolean {
  return shouldWatchDocumentationSource(rootDir, changedPath);
}

export function startDevServer(options: DevServerOptions): Promise<{ server: http.Server; port: number; close: () => void }> {
  const { rootDir, host = 'localhost', port: initialPort = 3000, onSourceChange } = options;

  return new Promise((resolve, reject) => {
    let port = initialPort;

    const liveReloadScript = `
<script>
(function() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  let ws = null;
  function connect() {
    ws = new WebSocket(protocol + '//' + window.location.host + '/__dmd_reload');
    ws.onmessage = function(e) {
      if (e.data === 'reload') {
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

    const server = http.createServer((req, res) => {
      // Enable CORS for local development
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      let reqPath = decodeURIComponent(req.url?.split('?')[0] || '/');
      if (reqPath === '/' || reqPath === '') {
        reqPath = '/index.html';
      }

      let filePath = path.join(rootDir, reqPath);

      // Check if file exists in rootDir
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const potentialIndex = path.join(rootDir, 'index.html');
        if (fs.existsSync(potentialIndex)) {
          filePath = potentialIndex;
        } else {
          // Serve fallback runtime template
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
<!DOCTYPE html>
<html>
<head><title>DocMeDown</title></head>
<body>
  <div id="dmd-app"></div>
  <script src="/docmedown.iife.js"></script>
  ${liveReloadScript}
</body>
</html>
          `);
          return;
        }
      }

      // Check if requesting bundled runtime docmedown.iife.js
      if (reqPath === '/docmedown.iife.js' && !fs.existsSync(filePath)) {
        const bundleCandidates = [
          path.resolve(__dirname, 'docmedown.iife.js'),
          path.resolve(__dirname, '../dist/docmedown.iife.js'),
          path.resolve(__dirname, '../docmedown.iife.js'),
        ];
        const distFile = bundleCandidates.find((p) => fs.existsSync(p));
        if (distFile) {
          filePath = distFile;
        }
      }

      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }

        const mimeType = mime.lookup(filePath) || 'application/octet-stream';
        res.setHeader('Content-Type', mimeType);

        if (mimeType.includes('html')) {
          let content = fs.readFileSync(filePath, 'utf-8');
          if (!content.includes('/__dmd_reload')) {
            content = content.replace('</body>', `${liveReloadScript}</body>`);
          }
          res.writeHead(200);
          res.end(content);
        } else {
          const stream = fs.createReadStream(filePath);
          res.writeHead(200);
          stream.pipe(res);
        }
      } catch (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
    });

    const wss = new WebSocketServer({ noServer: true });
    const clients = new Set<WebSocket>();

    server.on('upgrade', (request, socket, head) => {
      if (request.url === '/__dmd_reload') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          clients.add(ws);
          ws.on('close', () => clients.delete(ws));
        });
      } else {
        socket.destroy();
      }
    });

    // File watcher for hot reload
    const watcher = chokidar.watch(rootDir, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/.dist/**',
        '**/_manifest.json',
        '**/_docs.js',
        '**/docmedown.iife.js',
      ],
      ignoreInitial: true,
    });

    let reloadTimeout: NodeJS.Timeout | null = null;
    watcher.on('all', (event, changedPath) => {
      if (!shouldRebuildDocumentation(rootDir, changedPath)) return;

      if (reloadTimeout) clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(async () => {
        const rel = path.relative(rootDir, changedPath);
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

        clients.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('reload');
          }
        });
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
        });
      });

      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
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
