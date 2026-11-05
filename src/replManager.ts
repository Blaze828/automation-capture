import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigManager } from './configManager';
import { verifyExecutable } from './processRunner';

export class ReplManager implements vscode.Disposable {
  private terminal?: vscode.Terminal;
  private folder?: string;
  constructor(private config: ConfigManager) {}
  get active(): boolean { return !!this.terminal && vscode.window.terminals.includes(this.terminal) && this.terminal.exitStatus === undefined; }
  async start(document: vscode.TextDocument): Promise<void> {
    const folder = path.dirname(document.fileName);
    if (this.active && this.folder === folder) { this.terminal!.show(false); return; }
    await verifyExecutable(this.config.nodePath);
    // Start Node directly, without constructing a shell command or generating JS.
    this.terminal = vscode.window.createTerminal({ name: `Assignment REPL · ${path.basename(folder)}`,
      shellPath: this.config.nodePath, shellArgs: ['--interactive'], cwd: folder, location: vscode.TerminalLocation.Panel });
    this.folder = folder; this.terminal.show(false);
  }
  show(): void {
    if (!this.active) { throw new Error('Assignment: Start REPL로 먼저 REPL을 시작하세요.'); }
    this.terminal!.show(true);
  }
  dispose(): void { /* User-owned REPLs remain until VS Code closes them. */ }
}
