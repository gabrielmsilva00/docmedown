import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf-8'));

test('package metadata exposes stable CommonJS, ESM, type, and browser entry points', () => {
  assert.equal(packageJson.name, 'docmedown');
  assert.equal(packageJson.version, '0.1.0');
  assert.equal(packageJson.main, './dist/docmedown.cjs');
  assert.equal(packageJson.module, './dist/docmedown.mjs');
  assert.equal(packageJson.types, './dist/types/runtime/index.d.ts');
  assert.equal(packageJson.exports['.'].require, './dist/docmedown.cjs');
  assert.equal(packageJson.exports['.'].import, './dist/docmedown.mjs');
  assert.equal(packageJson.exports['./iife'], './dist/docmedown.iife.js');
  assert.equal(packageJson.repository.url, 'git+https://github.com/gabrielmsilva00/docmedown.git');
});