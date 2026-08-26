import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const legacyRuntimeFiles = [
  'dist/docmedown.cjs.js',
  'dist/docmedown.esm.js',
];

for (const runtimeFile of legacyRuntimeFiles) {
  fs.rmSync(path.resolve(rootDirectory, runtimeFile), { force: true });
}

export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin(),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: path.resolve(rootDirectory, 'src/runtime/index.tsx'),
      name: 'DocMeDown',
      formats: ['iife', 'es', 'cjs'],
      fileName: (format) => {
        if (format === 'iife') return 'docmedown.iife.js';
        if (format === 'es') return 'docmedown.mjs';
        return 'docmedown.cjs';
      },
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});