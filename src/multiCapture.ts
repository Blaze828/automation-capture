import * as vscode from 'vscode';
import * as path from 'path';
import { CaptureManager } from './captureManager';
import { CaptureTerminal } from './captureTerminal';
import { Submission, WindowBinding, delay } from './types';
import { nextAvailable } from './storage';
import { paginateOutput } from './pagination';

export class MultiCapture {
  constructor(private capture: Pick<CaptureManager, 'capture'>, private terminal: CaptureTerminal) {}
  async capturePages(document: vscode.TextDocument, submission: Submission, binding: WindowBinding,
    mode: 'code' | 'output' | 'both', token: vscode.CancellationToken, beforeCapture: () => void = () => {}): Promise<string[]> {
    const editor = await vscode.window.showTextDocument(document, { preserveFocus: false, preview: false });
    const originalSelection = editor.selection;
    const originalTop = editor.visibleRanges[0]?.start ?? new vscode.Position(0, 0);
    const images: string[] = [];
    const extension = path.extname(submission.image);
    const baseImage = path.join(submission.folder, `${path.basename(document.fileName, path.extname(document.fileName))} 실행결과${extension}`);
    const suffix = path.basename(submission.image, extension).slice(path.basename(baseImage, extension).length);
    let nextNumber = Number(/^_(\d+)$/.exec(suffix)?.[1] ?? 1) + 1;
    let completed = false;
    const savePage = async () => {
      if (token.isCancellationRequested) { return false; }
      beforeCapture();
      const image = images.length === 0 ? submission.image : await nextAvailable(baseImage, nextNumber++);
      await this.capture.capture(binding, image, images.length === 0 && submission.overwrite);
      images.push(image); return true;
    };
    try {
      // Keep the first output page visible while scrolling code, instead of a clipped tail.
      if (this.terminal.exists) {
        this.terminal.show(); await delay(150);
        const pages = paginateOutput(this.terminal.captureText, this.terminal.dimensions.columns, this.terminal.dimensions.rows);
        await this.terminal.display(pages.length > 1 ? `[출력 1/${pages.length}]\n${pages[0]}` : pages[0]);
      }
      if (mode === 'code' || mode === 'both') {
        await vscode.commands.executeCommand('editor.unfoldAll');
        let line = 0;
        while (line < document.lineCount) {
          if (token.isCancellationRequested) { break; }
          editor.revealRange(new vscode.Range(line, 0, line, 0), vscode.TextEditorRevealType.AtTop);
          await delay(250);
          // revealRange schedules a renderer update. On a busy Mac the previous
          // page can remain visible after the initial delay; wait before shooting.
          const deadline = Date.now() + 2000;
          while ((editor.visibleRanges.at(-1)?.end.line ?? -1) <= line + 1 &&
            (editor.visibleRanges.at(-1)?.end.line ?? -1) < document.lineCount - 1 && Date.now() < deadline) {
            await delay(50);
          }
          const end = editor.visibleRanges.at(-1)?.end.line;
          if (end === undefined || end < line) { throw new Error('코드 표시 범위를 확인하지 못했습니다.'); }
          if (end < document.lineCount - 1 && end <= line + 1) { throw new Error('한 줄이 편집기 영역을 초과합니다. 줄 바꿈과 글자 크기를 조정해 다시 캡처하세요.'); }
          if (!await savePage()) { break; }
          if (end >= document.lineCount - 1) { break; }
          line = end - 1; // Overlap boundary lines to avoid losing partially visible text.
        }
      }
      if ((mode === 'output' || mode === 'both') && !token.isCancellationRequested) {
        if (!this.terminal.exists || !this.terminal.captureText) { throw new Error('실행 결과 터미널이 없습니다. Run and Capture를 먼저 실행하세요.'); }
        // Output pages keep the start of the source visible, even after code pagination.
        editor.revealRange(new vscode.Range(0, 0, 0, 0), vscode.TextEditorRevealType.AtTop);
        this.terminal.show(); await delay(250);
        const pages = paginateOutput(this.terminal.captureText, this.terminal.dimensions.columns, this.terminal.dimensions.rows);
        for (let index = 0; index < pages.length; index++) {
          if (token.isCancellationRequested) { break; }
          await this.terminal.display(`[출력 ${index + 1}/${pages.length}]\n${pages[index]}`);
          if (!await savePage()) { break; }
        }
      }
      completed = !token.isCancellationRequested;
      if (!completed) { throw new Error(`분할 캡처가 취소되었습니다. 완료된 ${images.length}장은 유지됩니다.`); }
      return images;
    } catch (error) {
      throw new Error(`${String(error)}\n저장된 분할 이미지: ${images.length}장 (${path.dirname(submission.image)})`);
    } finally {
      await this.terminal.restore(); editor.selection = originalSelection;
      editor.revealRange(new vscode.Range(originalTop, originalTop), vscode.TextEditorRevealType.AtTop);
    }
  }
}
