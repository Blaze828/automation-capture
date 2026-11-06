import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { spawn, execFileSync } from 'child_process';
import { randomUUID } from 'crypto';
const isMac = process.platform === 'darwin';
const unsupported = !['win32', 'darwin'].includes(process.platform);
const startCommand = isMac ? 'source "$AUTOCAPTURE_BOOTSTRAP"\n' : '@"%AUTOCAPTURE_BOOTSTRAP%"\r\n';

async function fixture(code: string, check: (host: {
  wait: (predicate: (state: any) => boolean) => Promise<any>;
  control: (values: object) => Promise<void>; input: (text: string) => void;
  output: () => string; log: () => Promise<string>; root: string;
  restart: (code: string) => Promise<{source: string; pid: number}>;
  pid: number;
}) => Promise<void>): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'autocapture-cmd-test-'));
  const chapter = path.join(root, isMac ? '한글 공백 & $() `문자` "인용" ! (장)' : '한글 공백 & %문자! (장)'); await fs.mkdir(chapter);
  const source = path.join(chapter, '과제 & %파일!.js'); await fs.writeFile(source, code);
  await fs.writeFile(path.join(chapter, 'data.json'), JSON.stringify({ text: '상대 모듈 한글' }));
  let nonce = randomUUID();
  const request = path.join(root, 'request.json');
  await fs.writeFile(request, JSON.stringify({ folder: root, nonce, nodePath: process.execPath, source }));
  await fs.writeFile(path.join(root, 'cwd.txt'), chapter);
  await fs.writeFile(path.join(root, 'cwd.bin'), chapter + '\0');
  const cmd = spawn(isMac ? '/bin/zsh' : process.env.ComSpec || 'cmd.exe', isMac ? ['-f', '-i'] : ['/d', '/q', '/v:off', '/k', '""%AUTOCAPTURE_BOOTSTRAP%""'], {
    windowsHide: true, windowsVerbatimArguments: !isMac, detached: isMac, cwd: chapter,
    env: { ...process.env, AUTOCAPTURE_NODE: process.execPath, AUTOCAPTURE_REQUEST: request, AUTOCAPTURE_FOLDER: root,
      AUTOCAPTURE_BOOTSTRAP: path.resolve(isMac ? 'runtime/shell-bootstrap.sh' : 'runtime/cmd-bootstrap.cmd'), AUTOCAPTURE_HELPER: path.resolve('runtime/cmd-host.cjs') }
  });
  if (isMac) { cmd.stdin.write(startCommand); }
  let output = ''; let seq = 0;
  cmd.stdout.setEncoding('utf8'); cmd.stderr.setEncoding('utf8');
  cmd.stdout.on('data', text => { output += text; }); cmd.stderr.on('data', text => { output += text; });
  const closed = new Promise(resolve => cmd.once('close', resolve));
  const wait = async (predicate: (state: any) => boolean) => {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      try {
        const state = JSON.parse(await fs.readFile(path.join(root, 'state.json'), 'utf8'));
        if (state.nonce === nonce && predicate(state)) { return state; }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) { throw error; }
      }
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    throw new Error(`CMD state timed out. Output: ${output}`);
  };
  const control = async (values: object) => {
    const temp = path.join(root, 'control.tmp');
    await fs.writeFile(temp, JSON.stringify({ ...values, seq: ++seq, nonce }));
    await fs.rename(temp, path.join(root, 'control.json'));
    await wait(state => state.ack >= seq);
  };
  const restart = async (nextCode: string) => {
    await control({finish: true});
    nonce = randomUUID(); seq = 0;
    const nextChapter = path.join(root, '다른 장 & %폴더! (2)');
    await fs.mkdir(nextChapter, {recursive: true});
    const nextSource = path.join(nextChapter, '새 파일 & %과제!.js');
    await fs.writeFile(nextSource, nextCode);
    await fs.writeFile(request, JSON.stringify({folder: root, nonce, nodePath: process.execPath, source: nextSource}));
    await fs.writeFile(path.join(root, 'cwd.txt'), nextChapter);
    await fs.writeFile(path.join(root, 'cwd.bin'), nextChapter + '\0');
    cmd.stdin.write(startCommand);
    await wait(state => state.ready);
    return {source: nextSource, pid: cmd.pid!};
  };
  try {
    await wait(state => state.ready);
    await check({wait, control, input: text => cmd.stdin.write(text), output: () => output,
      log: () => fs.readFile(path.join(root, 'output.txt'), 'utf8'), root, restart, pid: cmd.pid!});
    await control({ finish: true });
    cmd.stdin.end('exit\r\n');
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([closed, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('CMD did not return to prompt')), 5000); })]);
    } finally { clearTimeout(timer); }
    assert.doesNotMatch(output, /\[실행 완료|종료 코드:/);
  } finally {
    if (cmd.exitCode === null && cmd.pid) {
      if (isMac) { try { process.kill(-cmd.pid, 'SIGKILL'); } catch {} }
      else {
        const kill = spawn('taskkill', ['/PID', String(cmd.pid), '/T', '/F'], { windowsHide: true });
        await new Promise(resolve => { kill.once('close', resolve); kill.once('error', resolve); });
      }
      await closed;
    }
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('autocapture-cmd-test-'));
    await fs.rm(resolved, {recursive: true, force: true});
  }
}

test('real owned shell runs original JS safely in Korean/metacharacter paths; replays and returns to prompt', {skip: unsupported}, async () => {
  await fixture("console.log(require('./data.json').text); console.log('실제 출력'); console.error('stderr 한글')", async host => {
    const state = await host.wait(state => state.done);
    assert.equal(state.code, 0); assert.equal(state.stopped, false);
    assert.match(await host.log(), /상대 모듈 한글/); assert.match(await host.log(), /stderr 한글/);
    assert.match(host.output(), /실제 출력/);
    await host.control({display: '[출력 1/2]\n실제 출력'});
    assert.match(host.output(), /\[출력 1\/2\]/);
  });
});

test('real owned shell accepts input and preserves a failing Node exit code without adding banners', {skip: unsupported}, async () => {
  await fixture("console.log('ready');process.stdin.once('data',text=>{console.log('입력:',text.toString().trim());process.exit(7)})", async host => {
    await host.wait(state => state.tail.includes('ready'));
    host.input('이름 한글\r\n');
    const state = await host.wait(state => state.done);
    assert.equal(state.code, 7); assert.match(await host.log(), /입력: 이름 한글/);
  });
});

test('real owned shell stops an infinite Node process and keeps its representative output', {skip: unsupported}, async () => {
  await fixture("setInterval(()=>console.log('무한 반복'),1)", async host => {
    await host.wait(state => state.tail.includes('무한 반복'));
    await host.control({stop: true});
    const state = await host.wait(state => state.done);
    assert.equal(state.stopped, true); assert.match(await host.log(), /무한 반복/);
  });
});

test('the same owned shell runs a second file from another folder and clears all earlier output', {skip: unsupported}, async () => {
  await fixture("console.log('이전 파일 출력 ONLY_OLD')", async host => {
    await host.wait(state => state.done);
    const next = await host.restart("console.log('현재 파일 출력 ONLY_NEW');console.log(process.cwd())");
    assert.equal(next.pid, host.pid, 'CMD PID stays the same');
    assert.equal((await host.wait(state => state.done)).code, 0);
    const log = await host.log();
    assert.match(log, /ONLY_NEW/); assert.doesNotMatch(log, /ONLY_OLD/);
    assert.ok(log.startsWith(path.dirname(next.source) + (isMac ? ' $ ' : '>')));
    assert.ok(log.includes(path.dirname(next.source)));
    const clear = host.output().lastIndexOf('\x1b[2J\x1b[3J\x1b[H');
    assert.ok(clear >= 0, 'the new run clears the viewport and scrollback');
    assert.doesNotMatch(host.output().slice(clear), /ONLY_OLD/);
    assert.match(host.output().slice(clear), /ONLY_NEW/);
  });
});

test('owned shell idle probe identifies the owned shell and reports programs still using it', {skip: unsupported}, async () => {
  await fixture("setInterval(()=>console.log('running'),20)", async host => {
    const probe = (pid: number) => JSON.parse(execFileSync(process.env.AUTOCAPTURE_PYTHON || (isMac ? 'python3' : 'python'),
      [path.resolve('runtime/cmd-idle.py'), String(pid)], {encoding: 'utf8'}));
    const state = await host.wait(state => state.tail.includes('running'));
    const busy = probe(host.pid);
    assert.equal(busy.cmd, true); assert.ok(busy.children.includes(state.hostPid));
    assert.equal(probe(2147483646).cmd, false);
    await host.control({stop: true}); await host.wait(state => state.done);
  });
});
