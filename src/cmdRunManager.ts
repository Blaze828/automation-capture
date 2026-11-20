import * as vscode from 'vscode';
import { CmdStopReason, CmdTerminalManager } from './cmdTerminalManager';
import { ConfigManager } from './configManager';
import { RunResult, verifyExecutable } from './processRunner';
import { hasRepeatedOutput } from './outputAnalysis';
import { Cancelled, delay } from './types';

export interface CmdRunResult extends RunResult {
  stderr: string;
  stopReason?: CmdStopReason;
}

export class CmdRunManager implements vscode.Disposable {
  lastSource?: string;
  private active = false;
  private stopRequested = false;
  get running(): boolean { return this.active; }
  constructor(readonly terminal: CmdTerminalManager, private config: Pick<ConfigManager, 'nodePath' | 'timeoutMs'>,
    private timeoutDecision: () => PromiseLike<string | undefined> = () => vscode.window.showWarningMessage(
      '실행 제한 시간이 지났습니다. 입력 대기 또는 무한 루프일 수 있습니다.', '계속 실행', '중단', '수동 캡처')) {}
  async run(source: string, manualCapture: () => Promise<void>, batch?: vscode.CancellationToken): Promise<CmdRunResult> {
    if (this.active) { throw new Error('이미 JavaScript를 실행하고 있습니다.'); }
    await verifyExecutable(this.config.nodePath);
    if (batch?.isCancellationRequested) { throw new Cancelled(); }
    this.lastSource = source; this.active = true; this.stopRequested = false;
    try {
      await this.terminal.start(source, this.config.nodePath);
      let deadline = Date.now() + this.config.timeoutMs;
      let timeoutResponse: { choice: string | undefined } | undefined;
      for (;;) {
        if (!this.terminal.exists) { throw new Error('실행 중 자동 실행 터미널이 닫혔습니다.'); }
        const state = await this.terminal.refresh();
        if (state?.done) {
          if (state.error) { throw new Error(`Node.js 실행 실패: ${state.error}`); }
          if (state.stopReason === 'timeout') { this.terminal.useRepresentative(); }
          return { code: state.code, signal: state.signal, stopped: state.stopped, stderr: state.stderr ?? '', stopReason: state.stopReason };
        }
        if (state?.stopped) { await delay(80); continue; }
        if (batch?.isCancellationRequested || this.stopRequested) {
          await this.terminal.stop(batch?.isCancellationRequested ? 'cancelled' : 'manual');
        } else if (timeoutResponse) {
          const { choice } = timeoutResponse;
          timeoutResponse = undefined;
          if (choice === '계속 실행') { deadline = Date.now() + this.config.timeoutMs; }
          else if (choice === '수동 캡처') {
            try { await manualCapture(); }
            catch (error) { void vscode.window.showErrorMessage(String(error)); deadline = Date.now() + this.config.timeoutMs; }
          } else { await this.terminal.stop(choice === '중단' ? 'manual' : 'timeout'); }
        } else if (Date.now() >= deadline) {
          deadline = Infinity;
          if (batch || hasRepeatedOutput(this.terminal.tail)) { await this.terminal.stop('timeout'); }
          else {
            // Keep polling so a terminal interrupt can finish the run while the prompt is open.
            void Promise.resolve(this.timeoutDecision()).then(choice => { timeoutResponse = { choice }; },
              error => { console.error('[AutoCapture timeout]', String(error)); timeoutResponse = { choice: undefined }; });
          }
        }
        await delay(80);
      }
    } finally { this.active = false; }
  }
  stop(): void { if (this.active) { this.stopRequested = true; } }
  dispose(): void { this.stop(); }
}
