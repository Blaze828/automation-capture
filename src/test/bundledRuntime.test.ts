import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { getBundledRuntime, prepareBundledRuntime, terminalNodeEnvironment } from '../bundledRuntime';

test('packaged runtime resolves in Korean/space paths and rejects wrong architecture or escaping paths', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'autocapture-설치 공백-'));
  try {
    const bundled = path.join(root, 'runtime', 'bundled');
    await fs.mkdir(path.join(bundled, 'bin'), {recursive: true});
    await fs.writeFile(path.join(bundled, 'bin', 'node'), 'node fixture');
    await fs.writeFile(path.join(bundled, 'bin', 'python'), 'python fixture');
    const marker = path.join(bundled, 'runtime.json');
    const manifest = {schema: 1, target: 'darwin-arm64', node: 'bin/node', python: 'bin/python'};
    await fs.writeFile(marker, JSON.stringify(manifest));
    const runtime = await prepareBundledRuntime(root, true, 'darwin', 'arm64');
    assert.equal(runtime?.python, path.join(bundled, 'bin', 'python'));
    assert.equal(getBundledRuntime()?.node, path.join(bundled, 'bin', 'node'));
    assert.ok(terminalNodeEnvironment(runtime!.node).PATH?.startsWith(path.dirname(runtime!.node) + path.delimiter));
    await assert.rejects(prepareBundledRuntime(root, true, 'darwin', 'x64'), /컴퓨터 종류/);
    await fs.writeFile(marker, JSON.stringify({...manifest, python: '../../outside'}));
    await assert.rejects(prepareBundledRuntime(root, true, 'darwin', 'arm64'), /경로/);
    await fs.writeFile(marker, JSON.stringify({...manifest, python: 'missing/python'}));
    await assert.rejects(prepareBundledRuntime(root, true, 'darwin', 'arm64'));
  } finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('autocapture-설치 공백-'));
    await fs.rm(root, {recursive: true, force: true});
  }
});

test('source development may use system tools; production requires a bundled runtime', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'autocapture-runtime-missing-'));
  try {
    assert.equal(await prepareBundledRuntime(root, false), undefined);
    await assert.rejects(prepareBundledRuntime(root, true), /최신 VSIX/);
    assert.deepEqual(terminalNodeEnvironment('node'), {});
  } finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('autocapture-runtime-missing-'));
    await fs.rm(root, {recursive: true, force: true});
  }
});
