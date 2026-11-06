import * as vscode from 'vscode';
import { CaptureTerminal } from './captureTerminal';
import { delay } from './types';

/** Preserve the user's layout. Overflow permits a single, precomputed adjustment. */
export class CaptureLayout {
  async showCode(document: vscode.TextDocument): Promise<vscode.TextEditor> {
    const editor = vscode.window.visibleTextEditors.find(candidate => candidate.document === document);
    return editor ?? vscode.window.showTextDocument(document, { preserveFocus: true, preview: false });
  }

  async showFileIdentity(document: vscode.TextDocument): Promise<void> {
    await this.showCode(document);
    await vscode.commands.executeCommand('workbench.action.showMultipleEditorTabs');
    await vscode.commands.executeCommand('workbench.action.moveSideBarLeft');
    await vscode.commands.executeCommand('workbench.view.explorer');
    await vscode.commands.executeCommand('revealInExplorer', document.uri);
  }

  async fit(document: vscode.TextDocument, terminal: CaptureTerminal,
    growOnce?: (outputRows: number, currentRows: number) => Promise<unknown>): Promise<{ output: boolean }> {
    await this.showFileIdentity(document);
    terminal.show();
    await vscode.commands.executeCommand('workbench.action.terminal.focus');
    await delay(100);
    await terminal.refresh?.();
    if (terminal.estimatedRows > terminal.dimensions.rows && growOnce) {
      await growOnce(terminal.estimatedRows, terminal.dimensions.rows);
      // Wait for the single layout change; never probe by resizing or retry the drag.
      await delay(200);
      await terminal.refresh?.();
    }
    return { output: terminal.estimatedRows <= terminal.dimensions.rows };
  }

  async replOnly(document: vscode.TextDocument, show: () => void, capture: () => Promise<void>): Promise<void> {
    await this.showCode(document);
    show();
    await vscode.commands.executeCommand('workbench.action.terminal.focus');
    // The capture backend crops to the terminal viewport; no maximizing/restoring needed.
    await capture();
  }
}
