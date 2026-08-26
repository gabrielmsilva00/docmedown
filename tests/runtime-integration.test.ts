import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, loadDocConfig } from '../src/runtime/config';
import { LocalDocLoader } from '../src/runtime/loader/local-loader';

const originalWindow = (globalThis as any).window;
const originalDocument = (globalThis as any).document;
const originalFetch = globalThis.fetch;

afterEach(() => {
  (globalThis as any).window = originalWindow;
  (globalThis as any).document = originalDocument;
  globalThis.fetch = originalFetch;
});

test('normalizeConfig preserves nested defaults while applying integration overrides', () => {
  const config = normalizeConfig({
    name: 'Embedded docs',
    theme: { preset: 'emerald' },
    search: { enabled: false },
  });

  assert.equal(config.name, 'Embedded docs');
  assert.equal(config.theme?.preset, 'emerald');
  assert.equal(config.theme?.defaultMode, 'auto');
  assert.equal(config.search?.enabled, false);
  assert.equal(config.search?.maxResults, 10);
});

test('loadDocConfig gives inline host configuration precedence over network files', async () => {
  (globalThis as any).window = {};
  (globalThis as any).document = {
    getElementById: (id: string) => id === 'dmd-config' ? { textContent: '{"name":"Host supplied docs"}' } : null,
  };
  globalThis.fetch = async () => {
    throw new Error('fetch should not be called when inline configuration exists');
  };

  const config = await loadDocConfig('/docs');
  assert.equal(config.name, 'Host supplied docs');
});

test('LocalDocLoader reads an embedded offline manifest and document map before fetching', async () => {
  (globalThis as any).window = {
    location: { protocol: 'file:' },
    __DOCMEDOWN_DATA__: {
      manifest: { version: '1', generatedAt: 'now', config: { name: 'Offline docs' }, docs: [], tree: [] },
      docs: { 'guides/intro.md': '# Embedded intro' },
    },
  };
  (globalThis as any).document = { getElementById: () => null };
  globalThis.fetch = async () => {
    throw new Error('offline embedded content must not fetch');
  };

  const loader = new LocalDocLoader();
  assert.equal(loader.getEmbeddedManifest()?.config.name, 'Offline docs');
  assert.equal(await loader.fetchDocContent('guides/intro'), '# Embedded intro');
  assert.equal(await loader.fetchDocContent('missing'), null);
});

test('Remote-source configuration remains available when a nested site embeds an empty local manifest', async () => {
  (globalThis as any).window = {
    __DOCMEDOWN_CONFIG__: {
      name: 'Remote nested site',
      source: { type: 'github', repo: 'facebook/react', branch: 'main', docsDir: '' },
    },
  };
  (globalThis as any).document = { getElementById: () => null };

  const config = await loadDocConfig();
  assert.equal(config.source?.type, 'github');
  assert.equal(config.source?.repo, 'facebook/react');
});