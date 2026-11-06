import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import { delay } from '../../types';
import { ConfigManager } from '../../configManager';
import { FileManager } from '../../fileManager';
import { RunManager } from '../../runManager';
import { TerminalManager } from '../../terminalManager';
import { MultiCapture } from '../../multiCapture';
import { CaptureLayout } from '../../captureLayout';
import { CmdTerminalManager } from '../../cmdTerminalManager';
import { CmdRunManager } from '../../cmdRunManager';
import { execFileSync } from 'child_process';
import { prepareBundledRuntime } from '../../bundledRuntime';

async function runApiTests(workspace: string, output: string): Promise<void> {
  const config = new ConfigManager();
  const files = new FileManager(config);
  const terminal = new TerminalManager();
  const runner = new RunManager(terminal, config);
  try {
    const doc = await vscode.workspace.openTextDocument(path.join(workspace, '4장', '131.js'));
    await vscode.window.showTextDocument(doc, { preview: false });
    const edit = new vscode.WorkspaceEdit(); edit.insert(doc.uri, new vscode.Position(doc.lineCount, 0), '\n// 자동 저장 검증\n');
    assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(doc.isDirty);
    await files.document(false); assert.equal(doc.isDirty, false);
    const submission = await files.prepare(doc, 'run'); await files.copyCode(submission);
    assert.equal(await fs.readFile(submission.code, 'utf8'), doc.getText());
    console.log('PASS API dirty JS auto-save and original copy');
    await fs.writeFile(submission.code, '// previous submission');
    const versions = new FileManager(config, async () => '새 버전으로 저장');
    const version = await versions.prepare(doc, 'run'); await versions.copyCode(version);
    assert.equal(path.basename(version.code), '131_02.js'); assert.equal(path.basename(version.image), '131 실행결과_02.png');
    assert.equal(await fs.readFile(submission.code, 'utf8'), '// previous submission');
    await assert.rejects(new FileManager(config, async () => undefined).prepare(doc, 'run'), /취소/);
    const replace = new FileManager(config, async () => '덮어쓰기'); await replace.copyCode(await replace.prepare(doc, 'run'));
    assert.equal(await fs.readFile(submission.code, 'utf8'), doc.getText());
    console.log('PASS API filename conflicts: overwrite/version/cancel preserve expected files');
    for (let i = 0; i < 2; i++) {
      const result = await runner.run(doc.fileName, async () => {});
      assert.equal(result.code, 0); assert.match(terminal.text, /안녕하세요/); assert.doesNotMatch(terminal.text, /실행 완료/);
    }
    console.log('PASS API real Pseudoterminal Unicode output and repeated execution');
    const layout = new CaptureLayout();
    // Showing Explorer and focusing a newly created terminal settles its initial
    // viewport. The Pseudoterminal's proposed size is not a panel-height baseline.
    await layout.fit(doc, terminal);
    assert.ok(terminal.dimensions.rows > 0, 'focused terminal has a measured viewport');
    const shortRows = terminal.dimensions.rows;
    terminal.write(Array.from({length: 24}, (_, i) => `height ${i}`).join('\n'));
    await layout.fit(doc, terminal);
    assert.equal(terminal.dimensions.rows, shortRows, 'layout does not resize without the one-shot backend');
    await layout.replOnly(doc, () => terminal.show(), async () => {
      assert.equal(terminal.dimensions.rows, shortRows, 'REPL-only capture keeps the panel height');
    });
    assert.ok((await layout.showCode(doc)).visibleRanges.length > 0, 'file tab is restored after REPL capture');
    console.log('PASS API output priority layout and terminal-only capture/restoration');

    const repeatedSource = path.join(workspace, '4장', '반복.js');
    await fs.writeFile(repeatedSource, "let i=0; setInterval(()=>console.log('반복', i++), 1)");
    const repeatedRunner = new RunManager(terminal, {nodePath: config.nodePath, timeoutMs: 800}, async () => {
      throw new Error('repeating output must stop without a prompt');
    });
    try {
      const result = await repeatedRunner.run(repeatedSource, async () => {});
      assert.equal(result.stopped, true); assert.match(terminal.captureText, /출력 일부만/);
      assert.ok(terminal.captureText.length < terminal.text.length);
      await layout.fit(doc, terminal); terminal.fitRepresentative();
      assert.ok(terminal.estimatedRows <= terminal.dimensions.rows - 2);
    } finally { repeatedRunner.dispose(); }
    const finiteSource = path.join(workspace, '4장', '유한 반복.js');
    await fs.writeFile(finiteSource, "for(let i=0;i<100;i++) console.log('유한 반복', i)");
    assert.equal((await runner.run(finiteSource, async () => {})).stopped, false);
    assert.equal(terminal.captureText, terminal.text, 'completed finite loops retain all output');
    console.log('PASS API timed repetitive output is compact; completed finite loops retain all output');
    const timedSource = path.join(workspace, '4장', '타임아웃.js');
    await fs.writeFile(timedSource, "setTimeout(() => console.log('끝'), 50)");
    const timedRunner = new RunManager(terminal, {nodePath: config.nodePath, timeoutMs: 10}, async () => '수동 캡처');
    let manualComplete = false;
    try {
      await timedRunner.run(timedSource, async () => { await delay(200); manualComplete = true; });
      assert.equal(manualComplete, true);
    } finally { timedRunner.dispose(); }
    console.log('PASS API manual capture finishes before final capture when process exits during capture');
    files.remember(vscode.window.activeTextEditor);
    await vscode.commands.executeCommand('workbench.action.terminal.focus');
    assert.equal((await files.document(true)).fileName, doc.fileName);
    console.log('PASS API remembered JS while terminal is focused');
    const textFile = path.join(workspace, '메모.txt'); await fs.writeFile(textFile, 'not javascript');
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(textFile));
    await assert.rejects(files.document(false), /JavaScript/);
    await vscode.window.showTextDocument(doc);
    console.log('PASS API rejects non-JS editor');
    await vscode.commands.executeCommand('assignment.startRepl');
    const repl = vscode.window.terminals.find(t => t.name.startsWith('Assignment REPL'));
    assert.ok(repl); assert.ok(await repl.processId); await delay(500); assert.equal(repl.exitStatus, undefined);
    await vscode.commands.executeCommand('assignment.startRepl');
    assert.equal(vscode.window.terminals.filter(t => t.name.startsWith('Assignment REPL')).length, 1);
    const settings = vscode.workspace.getConfiguration('assignment');
    const previous = settings.get('pythonPath');
    const previousBundled = settings.get('useBundledRuntime');
    await settings.update('useBundledRuntime', false, vscode.ConfigurationTarget.Global);
    await settings.update('pythonPath', 'nonexistent-autocapture-python', vscode.ConfigurationTarget.Global);
    try {
      const failed = await vscode.commands.executeCommand<{ok: boolean}>('assignment.captureRepl');
      assert.equal(failed?.ok, false);
      await assert.rejects(fs.stat(path.join(output, '4장', '131 REPL.png')), { code: 'ENOENT' });
      assert.equal(repl.exitStatus, undefined); assert.ok(vscode.window.terminals.includes(repl));
    } finally {
      await settings.update('pythonPath', previous, vscode.ConfigurationTarget.Global);
      await settings.update('useBundledRuntime', previousBundled, vscode.ConfigurationTarget.Global); repl.dispose();
    }
    console.log('PASS API REPL launch/reuse; failed capture preserves session and creates no PNG');
    const longSource = path.join(workspace, '4장', '긴 코드.js');
    await fs.writeFile(longSource, Array.from({length: 160}, (_, i) => `console.log('줄 ${i}');`).join('\n'));
    const longDoc = await vscode.workspace.openTextDocument(longSource); await vscode.window.showTextDocument(longDoc);
    const longSubmission = await files.prepare(longDoc, 'run', true);
    await terminal.create(); terminal.write(Array.from({length: 100}, (_, i) => `한글 출력 ${i}`).join('\n'));
    const retained = terminal.text;
    const ranges: number[] = [];
    const multi = new MultiCapture({capture: async () => {
      ranges.push(vscode.window.activeTextEditor?.visibleRanges.at(-1)?.end.line ?? -1); await delay(30);
    }}, terminal);
    const cancel = new vscode.CancellationTokenSource();
    try {
      const images = await multi.capturePages(longDoc, longSubmission, {hwnd: 0, pid: 0}, 'both', cancel.token);
      assert.ok(images.length > 3); assert.equal(new Set(images).size, images.length);
      assert.ok(ranges.some(line => line >= longDoc.lineCount - 1));
      assert.equal(terminal.text, retained);
      console.log('PASS API multi-page scrolling/output/restoration with capture backend stub (no PNG)');
    } finally { cancel.dispose(); }
  } finally { runner.dispose(); terminal.dispose(); }
}

async function runCmdApiTests(workspace: string, extensionPath: string): Promise<void> {
  const config = new ConfigManager();
  const terminal = new CmdTerminalManager(extensionPath, () => config.pythonPath);
  const runner = new CmdRunManager(terminal, {nodePath: config.nodePath, timeoutMs: 1000});
  try {
    const source = path.join(workspace, '4장', '131.js');
    const doc = await vscode.workspace.openTextDocument(source); await vscode.window.showTextDocument(doc);
    const result = await runner.run(source, async () => {});
    assert.equal(result.code, 0); assert.match(terminal.text, /안녕하세요/);
    assert.doesNotMatch(terminal.text, /\[실행 완료|종료 코드:/);
    assert.equal(vscode.window.activeTerminal?.name, process.platform === 'darwin' ? 'zsh' : 'cmd');
    const layout = new CaptureLayout();
    assert.equal((await layout.fit(doc, terminal)).output, true);
    const rows = terminal.dimensions.rows;
    const submission = {source, folder: workspace, code: source, image: path.join(workspace, 'CMD 결과.webp'), overwrite: false};
    const cancel = new vscode.CancellationTokenSource();
    try {
      let pages = 0;
      const multi = new MultiCapture({capture: async () => { pages++; }}, terminal);
      const retained = terminal.captureText;
      const images = await multi.capturePages(doc, submission, {hwnd: 0, pid: 0}, 'output', cancel.token);
      assert.ok(pages >= 1);
      assert.equal(pages, images.length);
      assert.equal(new Set(images).size, images.length);
      assert.equal(terminal.captureText, retained);
    } finally { cancel.dispose(); }
    await terminal.finishCapture();
    assert.ok(terminal.exists, 'CMD stays alive for ordinary commands after capture');
    const firstCmd = vscode.window.activeTerminal;
    const cmdPid = await firstCmd?.processId;
    const secondSource = path.join(workspace, '두번째 장', '재사용.js');
    await fs.mkdir(path.dirname(secondSource), {recursive: true});
    await fs.writeFile(secondSource, "console.log('두번째 결과 ONLY_SECOND'); console.log(process.cwd())");
    const opened: vscode.Terminal[] = [];
    const listener = vscode.window.onDidOpenTerminal(value => opened.push(value));
    try { assert.equal((await runner.run(secondSource, async () => {})).code, 0); }
    finally { listener.dispose(); }
    assert.equal(opened.length, 0, 'a second file does not open another terminal');
    assert.equal(vscode.window.activeTerminal, firstCmd);
    assert.equal(await vscode.window.activeTerminal?.processId, cmdPid);
    assert.match(terminal.text, /ONLY_SECOND/); assert.doesNotMatch(terminal.text, /안녕하세요/);
    assert.ok(terminal.text.startsWith(path.dirname(secondSource) + (process.platform === 'darwin' ? ' $ ' : '>')));
    await terminal.finishCapture();
    await terminal.ensureReplay();
    assert.equal(vscode.window.activeTerminal, firstCmd, 'manual replay also reuses the same CMD');
    assert.ok((await terminal.refresh())?.done, 'replay does not execute the JS again');
    assert.ok(terminal.dimensions.rows > 0 && rows > 0);
    console.log('PASS API real CMD run/output/dimensions/replay; no completion banner; prompt stays alive');
  } finally { await terminal.finishCapture(); runner.dispose(); terminal.dispose(); }
}

async function runScenarios(): Promise<void> {
  const workspace = process.env.AUTOCAPTURE_WORKSPACE!;
  const output = process.env.AUTOCAPTURE_OUTPUT!;
  const extension = vscode.extensions.getExtension('Blaze828.js-assignment-autocapture');
  assert.ok(extension, 'extension is registered'); await extension.activate();
  if (process.env.AUTOCAPTURE_BUNDLED_TEST) {
    // The installed extension and this source-side test runner have separate
    // module instances; initialize the test-side services with the same payload.
    await prepareBundledRuntime(extension.extensionPath, true);
    const config = new ConfigManager();
    assert.ok(config.nodePath.startsWith(path.join(extension.extensionPath, 'runtime', 'bundled')));
    assert.ok(config.pythonPath.startsWith(path.join(extension.extensionPath, 'runtime', 'bundled')));
    console.log('PASS packaged runtimes selected with missing user Node/Python and broken PYTHONHOME/PATH');
  }
  if (process.env.AUTOCAPTURE_API_ONLY === '1') {
    await runApiTests(workspace, output); await runCmdApiTests(workspace, extension.extensionPath); return;
  }
  await vscode.commands.executeCommand('workbench.action.closeSidebar');
  await delay(2500);
  if (process.platform === 'darwin' && process.env.GITHUB_ACTIONS === 'true' && process.env.AUTOCAPTURE_MAIN_PID_FILE) {
    const pid = (await fs.readFile(process.env.AUTOCAPTURE_MAIN_PID_FILE, 'utf8')).trim();
    execFileSync(new ConfigManager().pythonPath, ['-E', '-s', '-X', 'utf8', path.resolve(__dirname, '../../../scripts/macos_activate_ci.py'), pid], {timeout: 15000});
    await delay(500);
  }
  for (let i = 0; i < 120 && !vscode.window.state.focused; i++) { await delay(500); }
  for (const name of ['131', '오류 예제']) {
    const doc = await vscode.workspace.openTextDocument(path.join(workspace, '4장', `${name}.js`));
    await vscode.window.showTextDocument(doc, { preview: false });
    await delay(1500);
    assert.ok(vscode.window.state.focused, 'development host must be foreground for real capture');
    const result = await vscode.commands.executeCommand<{ok: boolean; error: string}>('assignment.runAndCapture');
    assert.notEqual(result?.ok, false, result?.error);
    const image = await fs.readFile(path.join(output, '4장', `${name} 실행결과.png`));
    assert.equal(image.subarray(1, 4).toString(), 'PNG');
    assert.equal(await fs.readFile(path.join(output, '4장', `${name}.js`), 'utf8'), doc.getText());
    console.log(`PASS real VS Code run/capture: ${name}`);
  }
  // Capture Again without re-running or replacing existing images.
  const again = path.join(output, '4장', '오류 예제 실행결과_02.png');
  await vscode.commands.executeCommand('assignment.captureAgain');
  assert.ok((await fs.stat(again)).size > 1000);
  console.log('PASS capture again');
  for (const format of ['jpg', 'webp']) {
    await vscode.workspace.getConfiguration('assignment').update('imageFormat', format, vscode.ConfigurationTarget.Global);
    const result = await vscode.commands.executeCommand<{ok: boolean; error: string}>('assignment.captureAgain');
    assert.notEqual(result?.ok, false, result?.error);
    const bytes = await fs.readFile(path.join(output, '4장', `오류 예제 실행결과_02.${format}`));
    if (format === 'jpg') { assert.equal(bytes.subarray(0, 3).toString('hex'), 'ffd8ff'); }
    else { assert.equal(bytes.subarray(8, 12).toString(), 'WEBP'); }
    console.log(`PASS real ${format} capture with matching file signature`);
  }
  await vscode.workspace.getConfiguration('assignment').update('imageFormat', 'png', vscode.ConfigurationTarget.Global);

  const scenarios = [
    {name: '자동 높이', code: "for(let i=1;i<=18;i++) console.log('높이 조절', i)", multiple: false},
    {name: '자동 출력 분할', code: "for(let i=1;i<=90;i++) console.log('출력 페이지', i)", multiple: true},
    {name: '긴 코드 짧은 출력', code: Array.from({length: 160}, (_, i) => `// 코드 페이지 ${i + 1}`).join('\n') + "\nconsole.log('마지막 줄 확인')", multiple: false},
    {name: '자동 반복 요약', code: "let i=0;setInterval(()=>console.log('반복 출력',i++),1)", multiple: false}
  ];
  await vscode.workspace.getConfiguration('assignment').update('timeoutSeconds', 1, vscode.ConfigurationTarget.Global);
  for (const scenario of scenarios) {
    const source = path.join(workspace, '4장', `${scenario.name}.js`);
    await fs.writeFile(source, scenario.code);
    const doc = await vscode.workspace.openTextDocument(source); await vscode.window.showTextDocument(doc);
    const result = await vscode.commands.executeCommand<{ok: boolean; error: string}>('assignment.runAndCapture');
    assert.notEqual(result?.ok, false, result?.error);
    const images = (await fs.readdir(path.join(output, '4장'))).filter(name => name.startsWith(`${scenario.name} 실행결과`) && name.endsWith('.png'));
    assert.ok(scenario.multiple ? images.length > 1 : images.length === 1, `${scenario.name}: ${images.length} images`);
    for (const image of images) { assert.ok((await fs.stat(path.join(output, '4장', image))).size > 1000); }
    console.log(`PASS real automatic capture: ${scenario.name} (${images.length} images)`);
  }
  await vscode.commands.executeCommand('assignment.startRepl');
  const repl = vscode.window.terminals.find(t => t.name.startsWith('Assignment REPL'));
  assert.ok(repl); await delay(800); repl.sendText("console.log('REPL 출력 전용 확인', 1 + 2)"); await delay(500);
  const replResult = await vscode.commands.executeCommand<{ok: boolean; error: string}>('assignment.captureRepl');
  assert.notEqual(replResult?.ok, false, replResult?.error);
  assert.ok((await fs.stat(path.join(output, '4장', '자동 반복 요약 REPL.png'))).size > 1000);
  assert.equal(repl.exitStatus, undefined);
  console.log('PASS real REPL terminal-only capture; session remains alive');

  if (process.env.AUTOCAPTURE_SAMPLE) {
    const doc = await vscode.workspace.openTextDocument(path.join(workspace, '6장', 'test.js'));
    await vscode.window.showTextDocument(doc);
    const result = await vscode.commands.executeCommand<{ok: boolean; error: string}>('assignment.runAndCapture');
    assert.notEqual(result?.ok, false, result?.error);
    const images = (await fs.readdir(path.join(output, '6장'))).filter(name => name.endsWith('.png'));
    assert.equal(images.length, 1, 'actual chapter 6 sample needs one output screenshot');
    console.log('PASS real 6장/test.js: one output screenshot despite long source');
    for (const format of ['jpg', 'webp']) {
      await vscode.workspace.getConfiguration('assignment').update('imageFormat', format, vscode.ConfigurationTarget.Workspace);
      const again = await vscode.commands.executeCommand<{ok: boolean; error: string}>('assignment.captureAgain');
      assert.notEqual(again?.ok, false, again?.error);
      const image = await fs.readFile(path.join(output, '6장', `test 실행결과_02.${format}`));
      if (format === 'jpg') { assert.equal(image.subarray(0, 3).toString('hex'), 'ffd8ff'); }
      else { assert.equal(image.subarray(8, 12).toString(), 'WEBP'); }
      console.log(`PASS real ${format} capture with matching file signature`);
    }
  }
  await fs.writeFile(path.join(path.dirname(workspace), 'gui-verification.json'), JSON.stringify({
    platform: process.platform, architecture: process.arch, vscode: vscode.version,
    completedAt: new Date().toISOString(), formats: ['png', 'jpg', 'webp'],
    scenarios: ['normal JS', 'runtime error', 'capture again', 'automatic height', 'long output pages',
      'long source with short output', 'repeating output', 'REPL terminal-only'],
    guiCaptureVerified: true
  }, null, 2));
}

export async function run(): Promise<void> {
  try { await runScenarios(); }
  catch (error) {
    if (process.platform === 'darwin' && process.env.CI) {
      try {
        execFileSync('/usr/sbin/screencapture', ['-x', path.join(path.dirname(process.env.AUTOCAPTURE_WORKSPACE!), 'failure.png')], {timeout: 10000});
      } catch (captureError) { console.error('Failure screenshot:', String(captureError)); }
    }
    throw error;
  }
}
