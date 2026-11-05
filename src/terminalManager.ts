import * as vscode from 'vscode';

export class TerminalManager implements vscode.Disposable {
  private writeEmitter = new vscode.EventEmitter<string>();
  private opened = false;
  private pending = '';
  private retained = '';
  private inputBuffer = '';
  private truncated = false;
  private terminal?: vscode.Terminal;
  dimensions: vscode.TerminalDimensions = { columns: 100, rows: 20 };
  onInput?: (text: string) => void;
  onStop?: () => void;
  onEndInput?: () => void;
  create(): void {
    this.terminal?.dispose();
    this.opened = false; this.pending = ''; this.retained = ''; this.inputBuffer = ''; this.truncated = false;
    this.terminal = vscode.window.createTerminal({ name: 'Assignment 실행 결과', location: vscode.TerminalLocation.Panel, pty: {
      onDidWrite: this.writeEmitter.event,
      open: (dimensions: vscode.TerminalDimensions | undefined) => { if (dimensions) { this.dimensions = dimensions; } this.opened = true; this.writeEmitter.fire(this.pending); this.pending = ''; },
      close: () => { this.opened = false; this.onStop?.(); },
      setDimensions: (dimensions: vscode.TerminalDimensions) => { this.dimensions = dimensions; },
      handleInput: (text: string) => this.handleInput(text)
    } });
    this.show();
  }
  show(): void { this.terminal?.show(true); }
  get exists(): boolean { return !!this.terminal && vscode.window.terminals.includes(this.terminal); }
  private emit(text: string): void { if (this.opened) { this.writeEmitter.fire(text); } else { this.pending += text; } }
  write(text: string): void {
    if (this.truncated) { return; }
    if (this.retained.length + text.length > 1_000_000) {
      text = '\n[출력이 1,000,000자를 초과해 이후 표시를 생략합니다. 전체 출력이 캡처되지 않습니다.]\n';
      this.truncated = true;
    }
    const normalized = text.replace(/\r?\n/g, '\r\n');
    this.retained += normalized;
    this.emit(normalized);
  }
  private handleInput(text: string): void {
    if (text === '\x03') { this.onStop?.(); return; }
    if (text === '\x04') { this.onEndInput?.(); return; }
    for (const char of text) {
      if (char === '\r' || char === '\n') {
        this.write('\n'); this.onInput?.(`${this.inputBuffer}\n`); this.inputBuffer = '';
      } else if (char === '\x7f' || char === '\b') {
        if (this.inputBuffer) { this.inputBuffer = [...this.inputBuffer].slice(0, -1).join(''); this.emit('\b \b'); }
      } else if (char >= ' ' && char !== '\x7f') { this.inputBuffer += char; this.emit(char); }
    }
  }
  get text(): string { return this.retained; }
  get wasTruncated(): boolean { return this.truncated; }
  get estimatedRows(): number {
    return this.retained.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil([...line].reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 2 : 1), 0) / Math.max(1, this.dimensions.columns))), 0);
  }
  display(text: string): void { this.emit('\x1b[2J\x1b[3J\x1b[H' + text.replace(/\r?\n/g, '\r\n')); }
  restore(): void { this.display(this.retained); }
  dispose(): void { this.terminal?.dispose(); this.writeEmitter.dispose(); }
}
