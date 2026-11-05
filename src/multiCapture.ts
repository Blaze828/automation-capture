import * as vscode from 'vscode';
import * as path from 'path';
import { CaptureManager } from './captureManager';
import { TerminalManager } from './terminalManager';
import { Submission, WindowBinding, delay } from './types';
import { nextAvailable } from './storage';
import { paginateOutput } from './pagination';

export class MultiCapture {
  constructor(private capture: Pick<CaptureManager, 'capture'>, private terminal: TerminalManager) {}
  async capturePages(document: vscode.TextDocument, submission: Submission, binding: WindowBinding,
    mode: 'code' | 'output' | 'both', token: vscode.CancellationToken): Promise<string[]> {
    const editor = await vscode.window.showTextDocument(document, { preserveFocus: false, preview: false });
    const originalSelection = editor.selection;
    const originalTop = editor.visibleRanges[0]?.start ?? new vscode.Position(0, 0);
    const images: string[] = [];
    const baseImage = path.join(submission.folder, `${path.basename(document.fileName, path.extname(document.fileName))} 실행결과.png`);
    const suffix = path.basename(submission.image).slice(path.basename(baseImage, '.png').length);
    let nextNumber = Number(/^_(\d+)\.png$/.exec(suffix)?.[1] ?? 1) + 1;
    let completed = false;
    const savePage = async () => {
      if (token.isCancellationRequested) { return false; }
      const image = images.length === 0 ? submission.image : await nextAvailable(baseImage, nextNumber++);
      await this.capture.capture(binding, image, images.length === 0 && submission.overwrite);
      images.push(image); return true;
    };
    try {
      if (mode === 'code' || mode === 'both') {
        await vscode.commands.executeCommand('editor.unfoldAll');
        let line = 0;
        while (line < document.lineCount) {
          if (token.isCancellationRequested) { break; }
          editor.revealRange(new vscode.Range(line, 0, line, 0), vscode.TextEditorRevealType.AtTop);
          await delay(250);
          if (!await savePage()) { break; }
          const end = editor.visibleRanges.at(-1)?.end.line;
          if (end === undefined || end < line) { throw new Error('코드 표시 범위를 확인하지 못했습니다.'); }
          if (end >= document.lineCount - 1) { break; }
          if (end <= line + 1) { throw new Error('한 줄이 편집기 영역을 초과합니다. 줄 바꿈과 글자 크기를 조정해 다시 캡처하세요.'); }
          line = end - 1; // Overlap boundary lines to avoid losing partially visible text.
        }
      }
      if ((mode === 'output' || mode === 'both') && !token.isCancellationRequested) {
        if (!this.terminal.exists || !this.terminal.text) { throw new Error('실행 결과 터미널이 없습니다. Run and Capture를 먼저 실행하세요.'); }
        this.terminal.show(); await delay(250);
        const pages = paginateOutput(this.terminal.text, this.terminal.dimensions.columns, this.terminal.dimensions.rows);
        for (let index = 0; index < pages.length; index++) {
          if (token.isCancellationRequested) { break; }
          this.terminal.display(`[출력 ${index + 1}/${pages.length}]\n${pages[index]}`);
          if (!await savePage()) { break; }
        }
      }
      completed = !token.isCancellationRequested;
      if (!completed) { throw new Error(`분할 캡처가 취소되었습니다. 완료된 ${images.length}장은 유지됩니다.`); }
      return images;
    } catch (error) {
      throw new Error(`${String(error)}\n저장된 분할 이미지: ${images.length}장 (${path.dirname(submission.image)})`);
    } finally {
      this.terminal.restore(); editor.selection = originalSelection;
      editor.revealRange(new vscode.Range(originalTop, originalTop), vscode.TextEditorRevealType.AtTop);
    }
  }
}
