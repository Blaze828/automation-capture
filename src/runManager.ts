import * as vscode from 'vscode';
import { ConfigManager } from './configManager';
import { ProcessRunner, RunResult, verifyExecutable } from './processRunner';
import { TerminalManager } from './terminalManager';

export class RunManager implements vscode.Disposable {
  readonly process = new ProcessRunner();
  constructor(readonly terminal: TerminalManager, private config: ConfigManager) {
    terminal.onInput = text => this.process.input(text);
    terminal.onStop = () => this.process.stop();
    terminal.onEndInput = () => this.process.endInput();
  }
  async run(source: string, manualCapture: () => Promise<void>): Promise<RunResult> {
    await verifyExecutable(this.config.nodePath);
    this.terminal.create();
    this.terminal.write(`> ${JSON.stringify(this.config.nodePath)} ${JSON.stringify(source)}\n\n`);
    const result = await this.process.run({ nodePath: this.config.nodePath, source, timeoutMs: this.config.timeoutMs,
      onOutput: text => this.terminal.write(text), onTimeout: async () => {
        const action = await vscode.window.showWarningMessage('실행 제한 시간이 지났습니다. 입력 대기 또는 무한 루프일 수 있습니다.', '계속 실행', '중단', '수동 캡처');
        if (action === '계속 실행') { return 'continue'; }
        if (action === '수동 캡처') { await manualCapture(); return 'manual'; }
        return 'stop';
      } });
    this.terminal.write(`\n[${result.stopped ? '실행 중단' : result.code === 0 ? '실행 완료' : '실행 오류'} · 종료 코드: ${result.code ?? result.signal ?? '없음'}]\n`);
    return result;
  }
  dispose(): void { this.process.dispose(); }
}
