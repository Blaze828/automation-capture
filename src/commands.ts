import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ConfigManager } from './configManager';
import { FileManager } from './fileManager';
import { CaptureManager } from './captureManager';
import { CmdTerminalManager } from './cmdTerminalManager';
import { CmdRunManager, CmdRunResult } from './cmdRunManager';
import { Cancelled, errorMessage, Submission } from './types';
import { ReplManager } from './replManager';
import { ZipManager } from './zipManager';
import { MultiCapture } from './multiCapture';
import { nextAvailable } from './storage';
import { CaptureLayout } from './captureLayout';
import { describeRunIssues } from './runDiagnostics';

interface FileIssues { name: string; notes: string[]; }

const execFileAsync = promisify(execFile);

export function registerCommands(context: vscode.ExtensionContext): void {
  const config = new ConfigManager();
  const files = new FileManager(config);
  const capture = new CaptureManager(context, config);
  const terminal = new CmdTerminalManager(context.extensionPath, () => config.pythonPath);
  const runner = new CmdRunManager(terminal, config);
  const repl = new ReplManager(config);
  const zip = new ZipManager(config);
  const multi = new MultiCapture(capture, terminal);
  const layout = new CaptureLayout();
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.text = '$(device-camera) Assignment'; status.command = 'assignment.runAndCapture'; status.tooltip = 'JavaScript 실행 및 자동 맞춤 캡처 (Ctrl+Alt+Q)'; status.show();
  const folderStatus = vscode.window.createStatusBarItem('assignment.outputFolder', vscode.StatusBarAlignment.Left, 99);
  folderStatus.name = 'Assignment 저장 폴더';
  folderStatus.command = 'assignment.selectOutputFolder';
  let busy = false;
  let batchRun: vscode.CancellationTokenSource | undefined;
  let issuesOutput: vscode.OutputChannel | undefined;
  let latest: Submission | undefined;
  const updateFolderStatus = () => {
    const folder = config.settings.get<string>('outputFolder', '');
    folderStatus.text = folder ? `$(folder-opened) 저장 폴더: ${path.basename(folder) || folder}` : '$(folder-opened) 저장 폴더 선택';
    const shortcut = process.platform === 'darwin' ? 'Control+Option+S' : 'Ctrl+Alt+S';
    folderStatus.tooltip = folder ? `저장 위치: ${folder}\n클릭하여 폴더 변경 (${shortcut})` : `클릭하여 결과를 저장할 폴더 선택 (${shortcut})`;
    folderStatus.accessibilityInformation = { label: folder ? `저장 폴더 ${folder}. 클릭하여 변경` : '결과를 저장할 폴더 선택' };
    folderStatus.show();
  };
  updateFolderStatus();
  context.subscriptions.push(terminal, runner, repl, status, folderStatus,
    vscode.window.onDidChangeActiveTextEditor(editor => files.remember(editor)),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('assignment.outputFolder')) {
        latest = undefined;
        updateFolderStatus();
      }
    }));
  const openFolder = async (folder: string) => {
    // Use VS Code's native file reveal API: opening a file: URL externally can
    // fail on Windows for folders containing Korean characters or spaces.
    const entries = await fs.readdir(folder, {withFileTypes: true});
    const child = entries.find(entry => entry.isFile()) ?? entries[0];
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(child ? path.join(folder, child.name) : folder));
  };
  const notify = (submission: Submission, warning = '') => {
    void vscode.window.showInformationMessage(`저장 완료: ${submission.image}${warning}`, '폴더 열기').then(action => { if (action) { void openFolder(submission.folder); } });
  };
  const finishBatch = async (folder: string, source: string, summary: string, issues: FileIssues[], autoOpen: boolean) => {
    let content = '';
    let message = summary;
    if (issues.length) {
      const names = issues.slice(0, 3).map(issue => issue.name).join(', ');
      message += ` · 문제 파일 ${issues.length}개 (${names}${issues.length > 3 ? ' 외' : ''})`;
      content = ['일괄 실행 문제 내역', `원본 폴더: ${source}`, summary, '',
        ...issues.flatMap(({ name, notes }) => [
          name, ...notes.map(note => `  - ${note.replace(/\r?\n/g, '\n    ')}`), ''
        ])].join('\n');
      if (!issuesOutput) {
        issuesOutput = vscode.window.createOutputChannel('Assignment 실행 문제');
        context.subscriptions.push(issuesOutput);
      }
      issuesOutput.replace(content);
    }
    let folderError = false;
    if (autoOpen) {
      try {
        await execFileAsync(config.pythonPath, ['-E', '-s', '-X', 'utf8',
          path.join(context.extensionPath, 'runtime', 'open-result-folder.py'), folder],
        { windowsHide: true, timeout: 12000, encoding: 'utf8' });
      } catch (error) {
        folderError = true;
        message += ' · 결과 폴더를 열지 못했습니다.';
        console.error('[AutoCapture]', errorMessage(error));
      }
    }
    if (!issues.length && !folderError) { return; }
    const actions = issues.length ? ['문제 보기'] : [];
    if (!autoOpen || folderError) { actions.push('폴더 열기'); }
    void Promise.resolve(vscode.window.showWarningMessage(message, ...actions)).then(async choice => {
      if (choice === '폴더 열기') { await openFolder(folder); }
      if (choice === '문제 보기' && issuesOutput) {
        issuesOutput.replace(content);
        issuesOutput.show();
      }
    }).catch(error => vscode.window.showErrorMessage(errorMessage(error)));
  };
  const guard = (action: () => Promise<unknown>) => async () => {
    if (busy) { void vscode.window.showWarningMessage('실행 또는 캡처가 진행 중입니다. 중단은 Assignment: Stop Run을 사용하세요.'); return { ok: false, error: 'busy' }; }
    busy = true; status.text = '$(sync~spin) Assignment';
    try { await action(); } catch (error) {
      if (!(error instanceof Cancelled)) { console.error('[AutoCapture]', errorMessage(error)); void vscode.window.showErrorMessage(errorMessage(error)); }
      return { ok: false, error: errorMessage(error) };
    } finally { busy = false; status.text = '$(device-camera) Assignment'; }
  };
  const captureCurrent = async (document: vscode.TextDocument, submission: Submission, showTerminal: boolean) => {
    await vscode.window.showTextDocument(document, { preserveFocus: true, preview: false });
    if (showTerminal) { terminal.show(); }
    const binding = await capture.bind(document);
    await files.copyCode(submission);
    latest = submission;
    try { await capture.capture(binding, submission.image, submission.overwrite); }
    catch (error) { throw new Error(`JS 파일은 저장되었습니다: ${submission.code}\n${errorMessage(error)}\nCapture Again으로 재시도할 수 있습니다.`); }
  };
  const runAndCapture = async (document: vscode.TextDocument, submission: Submission,
    batch?: { token: vscode.CancellationToken; onRun: (result: CmdRunResult, truncated: boolean) => void }) => {
    if (batch) { await vscode.window.showTextDocument(document, { preview: false }); }
    else { await layout.showCode(document); }
    const binding = await capture.bind(document);
    // Copy the exact saved source before running it; never execute a submission copy.
    await files.copyCode(submission); latest = submission;
    const executedVersion = document.version;
    let manualSaved = false;
    try {
      const result = await runner.run(document.fileName, async () => {
        if (document.version !== executedVersion) { throw new Error('실행 중 원본 코드가 변경되었습니다. 다시 실행한 뒤 캡처하세요.'); }
        await capture.capture(binding, submission.image, submission.overwrite); manualSaved = true; notify(submission, ' (실행 중 수동 캡처)');
      }, batch?.token);
      batch?.onRun(result, terminal.wasTruncated);
      if (document.version !== executedVersion) { throw new Error('실행 중 원본 코드가 변경되어 자동 캡처를 중단했습니다. 원본을 다시 실행하세요. 실행 직전 JS 복사본은 유지됩니다.'); }
      if (manualSaved) { submission.image = await nextAvailable(submission.image); submission.overwrite = false; }
      const unchanged = () => {
        if (document.version !== executedVersion) { throw new Error('캡처 중 원본 코드가 변경되었습니다. 다시 실행하세요. 완료된 이미지는 유지됩니다.'); }
      };
      let count = 1;
      try {
        const fits = await layout.fit(document, terminal,
          (outputRows, currentRows) => capture.growTerminal(binding, outputRows, currentRows));
        await terminal.fitRepresentative();
        await vscode.commands.executeCommand('workbench.action.terminal.scrollToTop');
        unchanged();
        if (terminal.wasTruncated && !result.stopped) {
          await capture.capture(binding, submission.image, submission.overwrite);
          if (!batch) { throw new Error('출력이 보관 한도(1,000,000자)를 초과했습니다. 현재 화면만 저장했으며 전체 출력은 캡처되지 않았습니다.'); }
        } else if (fits.output || result.stopped) {
          // The real CMD already contains the program's output and native input echo.
          await capture.capture(binding, submission.image, submission.overwrite);
        } else {
          // The JS file is submitted separately. Only output can require automatic pages.
          const images = await vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: '자동 분할 캡처 중', cancellable: true },
            (_progress, token) => multi.capturePages(document, submission, binding, 'output', token, unchanged));
          count = images.length;
        }
        unchanged();
      }
      catch (error) {
        if (batch) { throw error; }
        throw new Error(`JS 파일은 저장되었습니다: ${submission.code}\n${errorMessage(error)}\nCapture Again으로 재시도하세요.`);
      }
      return { count, result };
    } finally { await terminal.finishCapture(); }
  };
  context.subscriptions.push(
    vscode.commands.registerCommand('assignment.runAndCapture', guard(async () => {
      const document = await files.document(false);
      const submission = await files.prepare(document, 'run');
      const { count, result } = await runAndCapture(document, submission);
      notify(submission, ` (${count}장${result.stopped ? ' · 중단된 실행의 대표 출력' : result.code !== 0 ? ' · 실행 오류 화면' : ''})`);
    })),
    vscode.commands.registerCommand('assignment.runFolderAndCapture', guard(async () => {
      const active = vscode.window.activeTextEditor?.document.uri;
      const [source] = await vscode.window.showOpenDialog({
        canSelectFiles: false, canSelectFolders: true, canSelectMany: false,
        title: '실행할 JavaScript 파일이 있는 폴더 선택', openLabel: '이 폴더 실행',
        defaultUri: active?.scheme === 'file' ? vscode.Uri.file(path.dirname(active.fsPath)) : vscode.workspace.workspaceFolders?.[0]?.uri
      }) ?? [];
      if (!source) { throw new Cancelled(); }
      if (source.scheme !== 'file') { throw new Error('로컬 폴더를 선택하세요.'); }
      const names = (await fs.readdir(source.fsPath, { withFileTypes: true }))
        .filter(entry => entry.isFile() && /\.js$/i.test(entry.name))
        .map(entry => entry.name)
        .sort(new Intl.Collator('ko', { numeric: true }).compare);
      if (!names.length) { void vscode.window.showWarningMessage('선택한 폴더 바로 아래에 .js 파일이 없습니다.'); return; }

      const chapter = path.basename(source.fsPath);
      if (!chapter) { throw new Error('파일을 장 폴더 안에 저장하세요.'); }
      const folder = path.join(await config.outputFolder(), chapter);
      const imageFormat = await config.imageFormat();
      await fs.mkdir(folder, { recursive: true });

      const cancellation = new vscode.CancellationTokenSource();
      batchRun = cancellation;
      let captured = 0;
      let images = 0;
      const issues: FileIssues[] = [];
      try {
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: '폴더 실행 및 캡처 중' }, async progress => {
          for (const [index, name] of names.entries()) {
            if (cancellation.token.isCancellationRequested) { break; }
            progress.report({ message: `${index + 1}/${names.length} ${name}` });
            const notes: string[] = [];
            try {
              const document = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(source, name));
              await files.save(document);
              const submission = await files.prepare(document, 'run', false, { folder, imageFormat });
              const { count } = await runAndCapture(document, submission, {
                token: cancellation.token,
                onRun: (result, truncated) => notes.push(...describeRunIssues(result, document.fileName, truncated))
              });
              captured++;
              images += count;
            } catch (error) {
              if (error instanceof Cancelled) { break; }
              console.error('[AutoCapture]', name, errorMessage(error));
              notes.push(`처리 실패 · ${errorMessage(error)}`);
            }
            if (notes.length) { issues.push({ name, notes }); }
          }
        });
        const cancelled = cancellation.token.isCancellationRequested;
        const state = cancelled ? '폴더 실행 중단' : '폴더 실행 완료';
        await finishBatch(folder, source.fsPath, `${state} · ${captured}/${names.length}개 파일, 이미지 ${images}장 저장`,
          issues, !cancelled && captured > 0);
      } finally {
        batchRun = undefined;
        cancellation.dispose();
      }
    })),
    vscode.commands.registerCommand('assignment.startRepl', guard(async () => {
      const document = await files.document(true); await repl.start(document);
    })),
    vscode.commands.registerCommand('assignment.captureRepl', guard(async () => {
      const document = await files.document(true);
      const submission = await files.prepare(document, 'repl');
      await layout.showCode(document);
      const binding = await capture.bind(document);
      await files.copyCode(submission); latest = submission;
      await layout.replOnly(document, () => repl.show(), () => capture.capture(binding, submission.image, submission.overwrite, true));
      notify(submission, ' (REPL 터미널 전용 · 세션 유지)');
    })),
    vscode.commands.registerCommand('assignment.captureMultiple', guard(async () => {
      const document = await files.document(true);
      const choice = await vscode.window.showQuickPick([
        { label: '코드와 실행 결과', mode: 'both' as const },
        { label: '코드만', mode: 'code' as const },
        { label: '실행 결과만', mode: 'output' as const }
      ], { title: '실제 VS Code 창을 여러 장으로 캡처합니다. 줄 바꿈을 켜고 가로로 긴 줄을 확인하세요.', ignoreFocusOut: true });
      if (!choice) { throw new Cancelled(); }
      if (choice.mode !== 'code' && runner.lastSource !== document.fileName) { throw new Error('현재 JS의 실행 결과가 없습니다. 이 파일을 먼저 Run and Capture로 실행하세요.'); }
      if (choice.mode !== 'code' && terminal.wasTruncated) { throw new Error('출력이 표시 한도를 초과해 전체 분할 캡처를 할 수 없습니다. 출력량을 줄여 다시 실행하세요.'); }
      const submission = await files.prepare(document, 'run', true);
      await vscode.window.showTextDocument(document, { preview: false });
      const binding = await capture.bind(document);
      await files.copyCode(submission); latest = submission;
      if (terminal.text) { await terminal.ensureReplay(); }
      try {
        const images = await vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: '분할 캡처 중', cancellable: true },
          (_progress, token) => multi.capturePages(document, submission, binding, choice.mode, token));
        void vscode.window.showInformationMessage(`${images.length}장 분할 캡처 저장 완료: ${submission.folder}`);
      } finally { await terminal.finishCapture(); }
    })),
    vscode.commands.registerCommand('assignment.exportChapterZip', guard(async () => {
      const destination = await zip.export();
      void vscode.window.showInformationMessage(`ZIP 저장 완료: ${destination}`, '폴더 열기').then(action => {
        if (action) { void vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(destination)); }
      });
    })),
    vscode.commands.registerCommand('assignment.captureAgain', guard(async () => {
      const document = await files.document(true);
      const submission = await files.prepare(document, 'run', true);
      await captureCurrent(document, submission, false); notify(submission);
    })),
    vscode.commands.registerCommand('assignment.stopRun', () => {
      if (batchRun) { batchRun.cancel(); }
      else { runner.process.stop(); }
    }),
    vscode.commands.registerCommand('assignment.selectOutputFolder', guard(async () => { await config.selectOutputFolder(); })),
    vscode.commands.registerCommand('assignment.selectImageFormat', guard(async () => { await config.selectImageFormat(); })),
    vscode.commands.registerCommand('assignment.openOutputFolder', guard(async () => { await openFolder(latest?.folder ?? await config.outputFolder()); }))
  );
}
