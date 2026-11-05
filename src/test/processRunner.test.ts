import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ProcessRunner, verifyExecutable } from '../processRunner';

async function fixture(code: string, action: (source: string, folder: string) => Promise<void>) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), '과제 공백 '));
  const source = path.join(folder, '테스트 코드.js');
  await fs.writeFile(source, code);
  try { await action(source, folder); } finally { await fs.rm(folder, { recursive: true, force: true }); }
}
test('runs original file with cwd, relative module/data and Korean paths/output', async () => {
  await fixture("console.log(require('./data.json').text); console.log(process.cwd())", async (source, folder) => {
    await fs.writeFile(path.join(folder, 'data.json'), JSON.stringify({ text: '안녕하세요 한글' }));
    let output = '';
    const result = await new ProcessRunner().run({ source, nodePath: process.execPath, timeoutMs: 5000,
      onOutput: text => { output += text; }, onTimeout: async () => 'stop' });
    assert.equal(result.code, 0); assert.match(output, /안녕하세요 한글/); assert.ok(output.includes(folder));
  });
});
test('captures syntax and runtime failures with nonzero exit codes', async () => {
  for (const code of ['const = ;', "throw new Error('실행 오류')"]) {
    await fixture(code, async source => {
      let output = '';
      const result = await new ProcessRunner().run({ source, nodePath: process.execPath, timeoutMs: 5000,
        onOutput: text => { output += text; }, onTimeout: async () => 'stop' });
      assert.notEqual(result.code, 0); assert.match(output, /Error/);
    });
  }
});
test('supports line input and detects a concurrent run', async () => {
  await fixture("process.stdout.write('ready');process.stdin.once('data', d=>{console.log(d.toString());process.exit(0)})", async source => {
    const runner = new ProcessRunner(); let output = '';
    const promise = runner.run({ source, nodePath: process.execPath, timeoutMs: 5000,
      onOutput: text => { output += text; if (text.includes('ready')) { runner.input('입력 결과\n'); } }, onTimeout: async () => 'stop' });
    assert.throws(() => runner.run({ source, nodePath: process.execPath, timeoutMs: 5000, onOutput: () => {}, onTimeout: async () => 'stop' }), /이미/);
    assert.equal((await promise).code, 0); assert.match(output, /입력 결과/); assert.equal(runner.running, false);
  });
});
test('timeout can continue once and then stop an infinite loop', async () => {
  await fixture('while(true){}', async source => {
    let timeouts = 0;
    const runner = new ProcessRunner();
    const result = await runner.run({ source, nodePath: process.execPath, timeoutMs: 100,
      onOutput: () => {}, onTimeout: async () => ++timeouts === 1 ? 'continue' : 'stop' });
    assert.equal(timeouts, 2); assert.equal(result.stopped, true); assert.equal(runner.running, false);
  });
});
test('missing Node executable rejects cleanly', async () => {
  await assert.rejects(verifyExecutable('nonexistent-autocapture-node-12345'), /실행 실패/);
});
