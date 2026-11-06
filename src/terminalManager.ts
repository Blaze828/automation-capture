import * as vscode from 'vscode';
import { hasRepeatedOutput, representativeOutput } from './outputAnalysis';
import { paginateOutput } from './pagination';

export class TerminalManager implements vscode.Disposable {
  private writeEmitter = new vscode.EventEmitter<string>();
  private opened = false;
  private pending = '';
  private retained = '';
  private inputBuffer = '';
  private truncated = false;
  private tail = '';
  private captureOverride?: string;
  private representativeStatus?: string;
  private generation = 0;
  private terminal?: vscode.Terminal;
  dimensions: vscode.TerminalDimensions = { columns: 100, rows: 20 };
  onInput?: (text: string) => void;
  onStop?: () => void;
  onEndInput?: () => void;
  async create(): Promise<void> {
    const generation = ++this.generation;
    this.terminal?.dispose();
    this.opened = false; this.pending = ''; this.retained = ''; this.inputBuffer = ''; this.truncated = false;
    this.tail = ''; this.captureOverride = undefined; this.representativeStatus = undefined;
    await vscode.commands.executeCommand('workbench.action.positionPanelBottom');
    this.terminal = vscode.window.createTerminal({ name: 'Assignment 실행 결과', location: vscode.TerminalLocation.Panel, pty: {
      onDidWrite: this.writeEmitter.event,
      open: (dimensions: vscode.TerminalDimensions | undefined) => { if (generation !== this.generation) { return; } if (dimensions) { this.dimensions = dimensions; } this.opened = true; this.writeEmitter.fire(this.pending); this.pending = ''; },
      close: () => { if (generation === this.generation) { this.opened = false; this.onStop?.(); } },
      setDimensions: (dimensions: vscode.TerminalDimensions) => { if (generation === this.generation) { this.dimensions = dimensions; } },
      handleInput: (text: string) => this.handleInput(text)
    } });
    this.show();
  }
  show(): void { if (!this.exists) { throw new Error('실행 결과 터미널이 닫혔습니다. JavaScript를 다시 실행하세요.'); } this.terminal!.show(true); }
  get exists(): boolean { return !!this.terminal && vscode.window.terminals.includes(this.terminal); }
  private emit(text: string): void { if (this.opened) { this.writeEmitter.fire(text); } else { this.pending += text; } }
  write(text: string): void {
    this.tail = (this.tail + text).slice(-32_000);
    if (this.truncated) { return; }
    if (this.retained.length + text.length > 1_000_000) {
      text = text.slice(0, Math.max(0, 1_000_000 - this.retained.length)) +
        '\n[출력이 1,000,000자를 초과해 이후 표시를 생략합니다. 전체 출력이 캡처되지 않습니다.]\n';
      this.truncated = true;
    }
    const normalized = text.replace(/\r?\n/g, '\r\n');
    this.retained += normalized;
    this.emit(normalized);
  }
  private handleInput(text: string): void {
    if (text === '\x03') { this.onStop?.(); return; }
    if (text === '\x04') { this.onEndInput?.(); return; }
    if (text.startsWith('\x1b')) { return; }
    for (const char of text.replace(/\r\n/g, '\r')) {
      if (char === '\r' || char === '\n') {
        if (!this.truncated) { this.retained += `${this.inputBuffer}\r\n`; }
        this.emit('\r\n'); this.onInput?.(`${this.inputBuffer}\n`); this.inputBuffer = '';
      } else if (char === '\x7f' || char === '\b') {
        if (this.inputBuffer) { this.inputBuffer = [...this.inputBuffer].slice(0, -1).join(''); this.emit('\b \b'); }
      } else if (char >= ' ' && char !== '\x7f') { this.inputBuffer += char; this.emit(char); }
    }
  }
  get text(): string { return this.retained; }
  get captureText(): string { return this.captureOverride ?? this.retained; }
  get repetitive(): boolean { return hasRepeatedOutput(this.tail); }
  useRepresentative(status: string, rows = 20): void {
    this.representativeStatus = status;
    this.captureOverride = representativeOutput(this.retained.split('\n').slice(0, 2).join('\n') + '\n' + this.tail + '\n' + status,
      this.dimensions.columns, rows);
    this.display(this.captureOverride);
  }
  fitRepresentative(): void {
    if (this.representativeStatus) { this.useRepresentative(this.representativeStatus, this.dimensions.rows); }
  }
  get wasTruncated(): boolean { return this.truncated; }
  get estimatedRows(): number {
    return paginateOutput(this.captureText, Math.max(8, this.dimensions.columns), 1_000_000).join('\n').split('\n').length;
  }
  display(text: string): void { this.emit('\x1b[2J\x1b[3J\x1b[H' + text.replace(/\r?\n/g, '\r\n')); }
  restore(): void { this.display(this.captureText); }
  dispose(): void { this.terminal?.dispose(); this.writeEmitter.dispose(); }
}
