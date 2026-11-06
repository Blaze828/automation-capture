import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { CaptureTerminal } from './captureTerminal';
import { delay } from './types';
import { paginateOutput } from './pagination';
import { representativeOutput } from './outputAnalysis';
import { nativePlatform } from './platform';
import { terminalNodeEnvironment } from './bundledRuntime';

export interface CmdState {
  nonce: string; ready: boolean; done: boolean; stopped: boolean; code: number | null;
  signal: NodeJS.Signals | null; error?: string; ack: number; pid?: number; hostPid?: number;
  columns: number; rows: number; truncated: boolean; tail: string;
}

export class CmdTerminalManager implements CaptureTerminal, vscode.Disposable {
  private terminal?: vscode.Terminal;
  private folder?: string;
  private nonce = '';
  private sequence = 0;
  private state?: CmdState;
  private retained = '';
  private override?: string;
  private source = '';
  private nodePath = '';
  private representative = false;
  private activeHost = false;
  private poller?: NodeJS.Timeout;
  private queue: Promise<unknown> = Promise.resolve();
  private folders = new Set<string>();
  dimensions: vscode.TerminalDimensions = { columns: 100, rows: 20 };
  constructor(private extensionPath: string, private pythonPath: () => string = () => nativePlatform().python) {}
  get exists(): boolean { return !!this.terminal && vscode.window.terminals.includes(this.terminal); }
  get text(): string { return this.retained; }
  get captureText(): string { return this.override ?? this.retained; }
  get wasTruncated(): boolean { return this.state?.truncated ?? false; }
  get tail(): string { return this.state?.tail ?? ''; }
  get estimatedRows(): number {
    return paginateOutput(this.captureText, Math.max(8, this.dimensions.columns), 1_000_000).join('\n').split('\n').length;
  }
  show(): void {
    if (!this.exists) { throw new Error('자동 실행 터미널이 닫혔습니다. JavaScript를 다시 실행하세요.'); }
    this.terminal!.show(true);
  }
  async refresh(): Promise<CmdState | undefined> {
    if (!this.folder) { return undefined; }
    const folder = this.folder;
    const nonce = this.nonce;
    try {
      const state = JSON.parse(await fs.readFile(path.join(folder, 'state.json'), 'utf8')) as CmdState;
      if (state.nonce !== nonce || nonce !== this.nonce) { return undefined; }
      const retained = await fs.readFile(path.join(folder, 'output.txt'), 'utf8');
      if (nonce !== this.nonce) { return undefined; }
      this.state = state;
      this.dimensions = { columns: state.columns, rows: state.rows };
      this.retained = retained;
      return state;
    } catch (error) {
      if (['ENOENT', 'EPERM', 'EACCES', 'EBUSY'].includes((error as NodeJS.ErrnoException).code ?? '') || error instanceof SyntaxError) { return undefined; }
      throw error;
    }
  }
  private async checkIdle(): Promise<void> {
    const pid = await this.terminal!.processId;
    if (!pid) { throw new Error('자동 실행용 터미널 프로세스를 확인하지 못했습니다. 해당 터미널를 닫고 다시 실행하세요.'); }
    // finishCapture's acknowledgement precedes the host exiting by a few milliseconds.
    const deadline = Date.now() + 2000;
    for (;;) {
      const state = await new Promise<{cmd: boolean; children: number[]}>((resolve, reject) => {
        execFile(this.pythonPath(), ['-E', '-s', '-X', 'utf8', path.join(this.extensionPath, 'runtime', 'cmd-idle.py'), String(pid)],
          {windowsHide: true, timeout: 5000, encoding: 'utf8'}, (error, stdout) => {
            if (error) { reject(new Error(`터미널 상태 확인 실패: ${error.message}`)); return; }
            try { resolve(JSON.parse(stdout)); } catch (failure) { reject(failure); }
          });
      });
      if (!state.cmd) { throw new Error('자동 실행용 터미널가 종료되었습니다. 해당 터미널을 닫고 다시 실행하세요.'); }
      if (!state.children.length) { return; }
      if (state.children.every(child => child === this.state?.hostPid) && Date.now() < deadline) { await delay(40); continue; }
      throw new Error('자동 실행용 터미널에서 다른 프로그램이 실행 중입니다. 그 프로그램을 끝낸 뒤 다시 실행하세요.');
    }
  }
  private async open(replay: boolean): Promise<void> {
    const platform = nativePlatform();
    const reuse = this.exists;
    if (reuse) { await this.checkIdle(); }
    if (this.poller) { clearInterval(this.poller); }
    if (!reuse || !this.folder) {
      this.folder = await fs.mkdtemp(path.join(os.tmpdir(), 'autocapture-cmd-'));
      this.folders.add(this.folder);
    }
    this.nonce = randomUUID(); this.sequence = 0; this.state = undefined; this.activeHost = true;
    const request = path.join(this.folder, 'request.json');
    await fs.writeFile(request, JSON.stringify({ folder: this.folder, nonce: this.nonce,
      source: this.source, nodePath: this.nodePath, replay, text: replay ? this.captureText : undefined }));
    await fs.writeFile(path.join(this.folder, 'cwd.txt'), path.dirname(this.source), 'utf8');
    // A NUL-delimited path also supports quotes, dollars and newlines on macOS.
    await fs.writeFile(path.join(this.folder, 'cwd.bin'), path.dirname(this.source) + '\0', 'utf8');
    if (reuse) {
      this.show();
      await vscode.commands.executeCommand('workbench.action.terminal.focus');
      await vscode.commands.executeCommand('workbench.action.terminal.clear');
      // Fixed command: paths and source arguments are read from JSON, never interpolated into CMD input.
      this.terminal!.sendText(platform.startCommand, true);
    } else {
      // Reuse only this owned shell; do not select a user's unrelated terminal by its name.
      this.terminal = vscode.window.createTerminal({ name: platform.shellName, cwd: path.dirname(this.source),
        shellPath: process.platform === 'win32' ? process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe' : '/bin/zsh',
        shellArgs: process.platform === 'win32' ? '/d /q /v:off /k ""%AUTOCAPTURE_BOOTSTRAP%""' : ['-f', '-i'],
        env: { ...terminalNodeEnvironment(this.nodePath), AUTOCAPTURE_NODE: this.nodePath, AUTOCAPTURE_REQUEST: request, AUTOCAPTURE_FOLDER: this.folder,
          AUTOCAPTURE_BOOTSTRAP: path.join(this.extensionPath, 'runtime', platform.bootstrap),
          AUTOCAPTURE_HELPER: path.join(this.extensionPath, 'runtime', 'cmd-host.cjs') },
        location: vscode.TerminalLocation.Panel });
      if (process.platform === 'darwin') { this.terminal.sendText(platform.startCommand, true); }
    }
    this.show();
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      if (!this.exists) { throw new Error('실행 준비 중 자동 실행 터미널이 닫혔습니다.'); }
      if ((await this.refresh())?.ready) {
        this.poller = setInterval(() => { void this.refresh().catch(() => {}); }, 80);
        return;
      }
      await delay(80);
    }
    this.terminal!.dispose(); this.activeHost = false;
    throw new Error('터미널 실행을 시작하지 못했습니다. Node.js 경로와 터미널 설정을 확인하세요.');
  }
  async start(source: string, nodePath: string): Promise<void> {
    this.source = source; this.nodePath = nodePath; this.retained = ''; this.override = undefined; this.representative = false;
    await this.open(false);
  }
  async ensureReplay(): Promise<void> {
    if (!this.activeHost) { await this.open(true); }
  }
  private control(values: { display?: string; stop?: boolean; finish?: boolean }): Promise<void> {
    const action = this.queue.then(async () => {
      if (!this.folder || !this.activeHost) { return; }
      const seq = ++this.sequence;
      const temp = path.join(this.folder, 'control.tmp');
      await fs.writeFile(temp, JSON.stringify({ ...values, seq, nonce: this.nonce }));
      for (let attempt = 0; ; attempt++) {
        try { await fs.rename(temp, path.join(this.folder, 'control.json')); break; }
        catch (error) {
          if (attempt >= 10 || !['EPERM', 'EACCES', 'EBUSY'].includes((error as NodeJS.ErrnoException).code ?? '')) { throw error; }
          await delay(20);
        }
      }
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if (!this.exists) { throw new Error('캡처 중 자동 실행 터미널이 닫혔습니다.'); }
        if (((await this.refresh())?.ack ?? -1) >= seq) { return; }
        await delay(40);
      }
      throw new Error('자동 실행 터미널 응답 시간이 초과되었습니다.');
    });
    this.queue = action.catch(() => {});
    return action;
  }
  async display(text: string): Promise<void> { await this.control({ display: text }); }
  async restore(): Promise<void> { await this.display(this.captureText); }
  async stop(): Promise<void> { await this.control({ stop: true }); }
  useRepresentative(): void { this.representative = true; }
  async fitRepresentative(): Promise<void> {
    if (this.representative) {
      const header = this.retained.split('\n').slice(0, 2).join('\n');
      this.override = representativeOutput(`${header}\n${this.tail}`, this.dimensions.columns, this.dimensions.rows);
      await this.display(this.override);
    }
  }
  async finishCapture(): Promise<void> {
    if (!this.activeHost) { return; }
    try {
      if (!this.state?.done) {
        await this.control({ stop: true });
        const deadline = Date.now() + 5000;
        while (!(await this.refresh())?.done && Date.now() < deadline) { await delay(80); }
      }
      await this.control({ finish: true });
    }
    catch (error) { this.terminal?.dispose(); console.error('[AutoCapture CMD cleanup]', String(error)); }
    finally { this.activeHost = false; if (this.poller) { clearInterval(this.poller); this.poller = undefined; } }
  }
  dispose(): void {
    if (this.poller) { clearInterval(this.poller); }
    // Completed CMDs belong to the user; do not close a shell where they may be working.
    if (this.activeHost) { this.terminal?.dispose(); }
    const tempRoot = path.resolve(os.tmpdir());
    for (const folder of this.folders) {
      const resolved = path.resolve(folder);
      if (path.dirname(resolved) === tempRoot && path.basename(resolved).startsWith('autocapture-cmd-')) {
        void fs.rm(resolved, { recursive: true, force: true }).catch(() => {});
      }
    }
  }
}
