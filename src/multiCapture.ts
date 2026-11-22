import * as vscode from 'vscode';
import * as path from 'path';
import { CaptureManager } from './captureManager';
import { CaptureTerminal } from './captureTerminal';
import { Cancelled, Submission, WindowBinding, delay } from './types';
import { nextAvailable } from './storage';
import { paginateOutput } from './pagination';

export type CaptureMode = 'code' | 'output' | 'both';

export class MultiCapture {
  constructor(private capture: Pick<CaptureManager, 'capture'>, private terminal: CaptureTerminal) {}
  async capturePages(document: vscode.TextDocument, submission: Submission, binding: WindowBinding,
    mode: CaptureMode, token: vscode.CancellationToken, beforeCapture: () => void = () => {}): Promise<string[]> {
    const editor = await vscode.window.showTextDocument(document, { preserveFocus: false, preview: false });
    const originalSelection = editor.selection;
    const originalTop = editor.visibleRanges[0]?.start ?? new vscode.Position(0, 0);
    const images: string[] = [];
    const extension = path.extname(submission.image);
    const baseImage = path.join(submission.folder, `${path.basename(document.fileName, path.extname(document.fileName))} 실행결과${extension}`);
    const suffix = path.basename(submission.image, extension).slice(path.basename(baseImage, extension).length);
    let nextNumber = Number(/^_(\d+)$/.exec(suffix)?.[1] ?? 1) + 1;
    const savePage = async () => {
      if (token.isCancellationRequested) { return false; }
      beforeCapture();
      const image = images.length === 0 ? submission.image : await nextAvailable(baseImage, nextNumber++);
      if (token.isCancellationRequested) { return false; }
      await this.capture.capture(binding, image, images.length === 0 && submission.overwrite, token);
      images.push(image); return true;
    };
    try {
      if (mode === 'code' || mode === 'both') {
        // Keep the first output page visible while scrolling code.
        if (this.terminal.exists) {
          this.terminal.show(); await delay(150, token);
          if (token.isCancellationRequested) { return images; }
          const pages = paginateOutput(this.terminal.captureText, this.terminal.dimensions.columns, this.terminal.dimensions.rows);
          await this.terminal.display(pages[0]);
        }
        await vscode.commands.executeCommand('editor.unfoldAll');
        let line = 0;
        while (line < document.lineCount) {
          if (token.isCancellationRequested) { break; }
          editor.revealRange(new vscode.Range(line, 0, line, 0), vscode.TextEditorRevealType.AtTop);
          await delay(250, token);
          // revealRange schedules a renderer update. On a busy Mac the previous
          // page can remain visible after the initial delay; wait before shooting.
          const deadline = Date.now() + 2000;
          while (!token.isCancellationRequested && (editor.visibleRanges.at(-1)?.end.line ?? -1) <= line + 1 &&
            (editor.visibleRanges.at(-1)?.end.line ?? -1) < document.lineCount - 1 && Date.now() < deadline) {
            await delay(50, token);
          }
          if (token.isCancellationRequested) { break; }
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
        this.terminal.show(); await delay(250, token);
        if (token.isCancellationRequested) { return images; }
        const pages = paginateOutput(this.terminal.captureText, this.terminal.dimensions.columns, this.terminal.dimensions.rows);
        for (const page of pages) {
          if (token.isCancellationRequested) { break; }
          await this.terminal.display(page);
          if (!await savePage()) { break; }
        }
      }
      return images;
    } catch (error) {
      if (error instanceof Cancelled && token.isCancellationRequested) { return images; }
      throw new Error(`${String(error)}\n저장된 분할 이미지: ${images.length}장 (${path.dirname(submission.image)})`);
    } finally {
      await this.terminal.restore(); editor.selection = originalSelection;
      editor.revealRange(new vscode.Range(originalTop, originalTop), vscode.TextEditorRevealType.AtTop);
    }
  }
}
