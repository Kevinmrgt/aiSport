import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const compat = require('../packages/minimatch-legacy-compat/index.cjs');
const eslintRequire = createRequire(require.resolve('eslint'));
const cacheRequire = createRequire(eslintRequire.resolve('file-entry-cache'));
const flatCacheRequire = createRequire(cacheRequire.resolve('flat-cache'));
const rimrafRequire = createRequire(flatCacheRequire.resolve('rimraf'));
const globRequire = createRequire(rimrafRequire.resolve('glob'));
const glob = rimrafRequire('glob');

test('legacy tools resolve the real patched engine through the callable adapter', async () => {
  assert.equal(globRequire('minimatch'), compat);
  const modernRequire = createRequire(require.resolve('../packages/minimatch-legacy-compat/index.cjs'));
  assert.equal(modernRequire('minimatch/package.json').version, '11.0.3');
  assert.equal(compat('src/file.ts', '**/*.ts'), true);
  assert.equal(compat('src/file.js', '**/*.ts'), false);
  assert.equal(compat.makeRe('**/*.ts').test('src/file.ts'), true);
  assert.equal(compat.makeRe('**/*.ts').test('src/file.js'), false);
  const matcher = new compat.Minimatch('**/*.ts');
  const part = matcher.set[0][1];
  assert.equal(part._glob, '*.ts');
  assert.deepEqual('file.ts'.match(part), ['file.ts']);
  assert.equal('file.js'.match(part), null);
  assert.equal(new compat.Minimatch('*/*').match('src/file.ts'), true);
  const lock = await readFile(new URL('../pnpm-lock.yaml', import.meta.url), 'utf8');
  assert.doesNotMatch(lock, /(?:^|\n)\s+minimatch@(?:3|10)\./);
});

test('legacy default options stay active for callable, classes and helper methods', () => {
  const bound = compat.defaults({ nocase: true });
  assert.equal(bound('FILE.TS', '*.ts'), true);
  assert.equal(bound.minimatch('FILE.TS', '*.ts'), true);
  assert.equal(new bound.Minimatch('*.ts').match('FILE.TS'), true);
  assert.equal(new (bound.Minimatch.defaults({ dot: true }))('*').match('.hidden'), true);
  assert.deepEqual(bound.match(['FILE.TS', 'file.js'], '*.ts'), ['FILE.TS']);
  assert.deepEqual(['FILE.TS'].filter(bound.filter('*.ts')), ['FILE.TS']);
  assert.equal(bound.makeRe('*.ts').test('FILE.TS'), true);
  assert.equal(bound('FILE.TS', '*.ts', { nocase: false }), false);
});

test('pinned glob 7 sync and callback traverse braces, globstar, dotfiles, ignore and nonull correctly', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alcide-minimatch-compat-'));
  try {
    await mkdir(join(root, 'nested'));
    for (const file of ['first.ts', 'second.js', '.hidden.ts', 'nested/third.ts', 'nested/skip.js']) await writeFile(join(root, file), 'fixture');
    const options = { cwd: root, dot: true, ignore: '**/skip.js' };
    const expected = ['.hidden.ts', 'first.ts', 'nested/third.ts', 'second.js'];
    assert.deepEqual(glob.sync('**/*.{ts,js}', options).sort(), expected);
    assert.deepEqual(await new Promise((resolve, reject) => glob('**/*.{ts,js}', options, (error, files) => error ? reject(error) : resolve(files.sort()))), expected);
    assert.deepEqual(glob.sync('**/*.ts', { cwd: root }).sort(), ['first.ts', 'nested/third.ts']);
    assert.deepEqual(glob.sync('**/{nested,other}/*.ts', { cwd: root }).sort(), ['nested/third.ts']);
    assert.deepEqual(glob.sync('missing.{ts,js}', { cwd: root, nonull: true }).sort(), ['missing.js', 'missing.ts']);
    assert.equal(glob.hasMagic('**/*.ts'), true);
    assert.equal(glob.hasMagic('first.ts'), false);
  } finally { await rm(root, { recursive: true, force: true }); }
});
