import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ConfigManager } from './configManager';
import { FileManager } from './fileManager';
import { CaptureManager } from './captureManager';
import { CmdTerminalManager } from './cmdTerminalManager';
import { CmdRunManager } from './cmdRunManager';
import { Cancelled, errorMessage, Submission } from './types';
import { ReplManager } from './replManager';
import { ZipManager } from './zipManager';
import { MultiCapture } from './multiCapture';
import { nextAvailable } from './storage';
import { CaptureLayout } from './captureLayout';

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
  context.subscriptions.push(
    vscode.commands.registerCommand('assignment.runAndCapture', guard(async () => {
      const document = await files.document(false);
      const submission = await files.prepare(document, 'run');
      await layout.showCode(document);
      const binding = await capture.bind(document);
      // Copy the exact saved source before running it; never execute a submission copy.
      await files.copyCode(submission); latest = submission;
      const executedVersion = document.version;
      let manualSaved = false;
      try {
        const result = await runner.run(document.fileName, async () => {
          if (document.version !== executedVersion) { throw new Error('실행 중 원본 코드가 변경되었습니다. 다시 실행한 뒤 캡처하세요.'); }
          await capture.capture(binding, submission.image, submission.overwrite); manualSaved = true; notify(submission, ' (실행 중 수동 캡처)');
        });
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
            throw new Error('출력이 보관 한도(1,000,000자)를 초과했습니다. 현재 화면만 저장했으며 전체 출력은 캡처되지 않았습니다.');
          }
          if (fits.output || result.stopped) {
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
        catch (error) { throw new Error(`JS 파일은 저장되었습니다: ${submission.code}\n${errorMessage(error)}\nCapture Again으로 재시도하세요.`); }
        notify(submission, ` (${count}장${result.stopped ? ' · 중단된 실행의 대표 출력' : result.code !== 0 ? ' · 실행 오류 화면' : ''})`);
      } finally { await terminal.finishCapture(); }
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
    vscode.commands.registerCommand('assignment.stopRun', () => runner.process.stop()),
    vscode.commands.registerCommand('assignment.selectOutputFolder', guard(async () => { await config.selectOutputFolder(); })),
    vscode.commands.registerCommand('assignment.selectImageFormat', guard(async () => { await config.selectImageFormat(); })),
    vscode.commands.registerCommand('assignment.openOutputFolder', guard(async () => { await openFolder(latest?.folder ?? await config.outputFolder()); }))
  );
}
