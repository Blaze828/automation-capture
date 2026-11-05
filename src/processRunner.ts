import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as path from 'path';

export interface RunResult { code: number | null; signal: NodeJS.Signals | null; stopped: boolean; }
export interface RunOptions {
  nodePath: string; source: string; timeoutMs: number;
  onOutput: (text: string) => void;
  onTimeout: () => Promise<'continue' | 'stop' | 'manual'>;
}

export function verifyExecutable(executable: string, args = ['--version']): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true, shell: false });
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${executable}: 실행 가능 여부 확인 시간이 초과되었습니다.`)); }, 10000);
    child.on('error', error => { clearTimeout(timer); reject(new Error(`${executable} 실행 실패: ${error.message}`)); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`${executable}: 종료 코드 ${code}`)); });
  });
}

export class ProcessRunner {
  private child?: ChildProcessWithoutNullStreams;
  private timer?: NodeJS.Timeout;
  private stopped = false;
  get running(): boolean { return !!this.child; }
  run(options: RunOptions): Promise<RunResult> {
    if (this.child) { throw new Error('이미 JavaScript를 실행하고 있습니다.'); }
    this.stopped = false;
    const child = spawn(options.nodePath, [options.source], { cwd: path.dirname(options.source), shell: false, windowsHide: true });
    this.child = child;
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', options.onOutput);
    child.stderr.on('data', options.onOutput);
    // A program can close stdin early. EPIPE must not crash the Extension Host.
    child.stdin.on('error', () => {});
    const armTimeout = () => {
      this.timer = setTimeout(() => {
        void (async () => {
          const decision = await options.onTimeout();
          if (this.child !== child) { return; }
          if (decision === 'stop') { this.stop(); }
          else if (decision === 'continue') { armTimeout(); }
          // Manual mode deliberately has no timer; Ctrl+C / Stop Run still works.
        })().catch(error => { options.onOutput(`\n제한 시간 처리 실패: ${String(error)}\n`); this.stop(); });
      }, options.timeoutMs);
    };
    armTimeout();
    return new Promise((resolve, reject) => {
      let spawnError: Error | undefined;
      child.once('error', error => { spawnError = error; });
      child.once('close', (code, signal) => {
        clearTimeout(this.timer);
        if (this.child === child) { this.child = undefined; }
        if (spawnError) { reject(spawnError); }
        else { resolve({ code, signal, stopped: this.stopped }); }
      });
    });
  }
  input(text: string): void { if (this.child?.stdin.writable) { this.child.stdin.write(text); } }
  endInput(): void { this.child?.stdin.end(); }
  stop(): void {
    const child = this.child;
    if (!child) { return; }
    this.stopped = true;
    clearTimeout(this.timer);
    if (process.platform === 'win32' && child.pid) {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, shell: false });
      killer.on('error', () => { child.kill(); });
      killer.on('close', code => { if (code !== 0) { child.kill(); } });
    } else { child.kill('SIGKILL'); }
  }
  dispose(): void { this.stop(); }
}
