import * as vscode from 'vscode';
import { ConfigManager } from './configManager';
import { FileManager } from './fileManager';
import { CaptureManager } from './captureManager';
import { TerminalManager } from './terminalManager';
import { RunManager } from './runManager';
import { Cancelled, errorMessage, Submission } from './types';

export function registerCommands(context: vscode.ExtensionContext): void {
  const config = new ConfigManager();
  const files = new FileManager(config);
  const capture = new CaptureManager(context, config);
  const terminal = new TerminalManager();
  const runner = new RunManager(terminal, config);
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.text = '$(device-camera) Assignment'; status.command = 'assignment.runAndCapture'; status.tooltip = 'JavaScript 실행 및 실제 창 캡처 (Ctrl+Alt+R)'; status.show();
  let busy = false;
  let latest: Submission | undefined;
  context.subscriptions.push(terminal, runner, status, vscode.window.onDidChangeActiveTextEditor(editor => files.remember(editor)));
  const openFolder = async (folder: string) => { await vscode.env.openExternal(vscode.Uri.file(folder)); };
  const notify = (submission: Submission, warning = '') => {
    void vscode.window.showInformationMessage(`저장 완료: ${submission.image}${warning}`, '폴더 열기').then(action => { if (action) { void openFolder(submission.folder); } });
  };
  const guard = (action: () => Promise<unknown>) => async () => {
    if (busy) { void vscode.window.showWarningMessage('실행 또는 캡처가 진행 중입니다. 중단은 Assignment: Stop Run을 사용하세요.'); return; }
    busy = true; status.text = '$(sync~spin) Assignment';
    try { await action(); } catch (error) {
      if (!(error instanceof Cancelled)) { console.error('[AutoCapture]', errorMessage(error)); void vscode.window.showErrorMessage(errorMessage(error)); }
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
      await vscode.window.showTextDocument(document, { preview: false });
      const binding = await capture.bind(document);
      // Copy the exact saved source before running it; never execute a submission copy.
      await files.copyCode(submission); latest = submission;
      const result = await runner.run(document.fileName, async () => {
        await capture.capture(binding, submission.image, submission.overwrite); notify(submission, ' (실행 중 수동 캡처)');
      });
      await vscode.window.showTextDocument(document, { preserveFocus: true, preview: false }); terminal.show();
      try { await capture.capture(binding, submission.image, submission.overwrite); }
      catch (error) { throw new Error(`JS 파일은 저장되었습니다: ${submission.code}\n${errorMessage(error)}\nCapture Again으로 재시도하세요.`); }
      const editor = vscode.window.visibleTextEditors.find(e => e.document === document);
      const visible = editor?.visibleRanges;
      const incomplete = !visible?.some(r => r.start.line === 0 && r.end.line >= document.lineCount - 1);
      notify(submission, result.code !== 0 ? ' (실행 오류/중단 화면)' : '');
      if (incomplete || terminal.estimatedRows > terminal.dimensions.rows) {
        void vscode.window.showWarningMessage('코드 또는 출력이 화면보다 깁니다. 현재 보이는 부분만 저장했습니다. 화면을 조절한 뒤 Capture Again으로 추가 캡처하세요.');
      }
    })),
    vscode.commands.registerCommand('assignment.captureAgain', guard(async () => {
      const document = await files.document(true);
      const submission = await files.prepare(document, 'run', true);
      await captureCurrent(document, submission, false); notify(submission);
    })),
    vscode.commands.registerCommand('assignment.stopRun', () => runner.process.stop()),
    vscode.commands.registerCommand('assignment.selectOutputFolder', guard(async () => { await config.selectOutputFolder(); })),
    vscode.commands.registerCommand('assignment.openOutputFolder', guard(async () => { await openFolder(latest?.folder ?? await config.outputFolder()); }))
  );
}
