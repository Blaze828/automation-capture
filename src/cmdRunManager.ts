import * as vscode from 'vscode';
import { CmdTerminalManager } from './cmdTerminalManager';
import { ConfigManager } from './configManager';
import { RunResult, verifyExecutable } from './processRunner';
import { hasRepeatedOutput } from './outputAnalysis';
import { delay } from './types';

export class CmdRunManager implements vscode.Disposable {
  readonly process = this;
  lastSource?: string;
  private active = false;
  get running(): boolean { return this.active; }
  constructor(readonly terminal: CmdTerminalManager, private config: Pick<ConfigManager, 'nodePath' | 'timeoutMs'>,
    private timeoutDecision: () => PromiseLike<string | undefined> = () => vscode.window.showWarningMessage(
      '실행 제한 시간이 지났습니다. 입력 대기 또는 무한 루프일 수 있습니다.', '계속 실행', '중단', '수동 캡처')) {}
  async run(source: string, manualCapture: () => Promise<void>): Promise<RunResult> {
    if (this.active) { throw new Error('이미 JavaScript를 실행하고 있습니다.'); }
    await verifyExecutable(this.config.nodePath);
    this.lastSource = source; this.active = true;
    try {
      await this.terminal.start(source, this.config.nodePath);
      let deadline = Date.now() + this.config.timeoutMs;
      for (;;) {
        if (!this.terminal.exists) { throw new Error('실행 중 자동 실행 터미널이 닫혔습니다.'); }
        const state = await this.terminal.refresh();
        if (state?.done) {
          if (state.error) { throw new Error(`Node.js 실행 실패: ${state.error}`); }
          if (state.stopped) { this.terminal.useRepresentative(); }
          return { code: state.code, signal: state.signal, stopped: state.stopped };
        }
        if (Date.now() >= deadline) {
          if (hasRepeatedOutput(this.terminal.tail)) { await this.terminal.stop(); deadline = Infinity; }
          else {
            const action = await this.timeoutDecision();
            if ((await this.terminal.refresh())?.done) { continue; }
            if (action === '계속 실행') { deadline = Date.now() + this.config.timeoutMs; }
            else if (action === '수동 캡처') {
              try { await manualCapture(); deadline = Infinity; }
              catch (error) { void vscode.window.showErrorMessage(String(error)); deadline = Date.now() + this.config.timeoutMs; }
            } else { await this.terminal.stop(); deadline = Infinity; }
          }
        }
        await delay(80);
      }
    } finally { this.active = false; }
  }
  stop(): void { if (this.active) { void this.terminal.stop().catch(() => {}); } }
  dispose(): void { this.stop(); }
}
