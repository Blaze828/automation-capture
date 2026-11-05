import * as vscode from 'vscode';
import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { ConfigManager } from './configManager';
import { publishFile } from './fileManager';
import { delay, WindowBinding } from './types';

export class CaptureManager {
  constructor(private context: vscode.ExtensionContext, private config: ConfigManager) {}
  private python(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(this.config.pythonPath, [path.join(this.context.extensionPath, 'python', 'capture.py'), ...args],
        { windowsHide: true, timeout: 20000, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
        (error, stdout, stderr) => {
          if (error) { reject(new Error(`화면 캡처 실패: ${stderr.trim() || error.message}\nPython 및 python/requirements.txt 설치를 확인하세요.`)); }
          else { resolve(stdout); }
        });
    });
  }
  async bind(document: vscode.TextDocument): Promise<WindowBinding> {
    if (process.platform !== 'win32') { throw new Error('이 확장은 Windows 로컬 VS Code 전용입니다.'); }
    if (!vscode.window.state.focused) { throw new Error('대상 VS Code 창으로 돌아와 캡처를 다시 실행하세요.'); }
    const result = await this.python(['--probe', '--title', path.basename(document.fileName)]);
    if (!vscode.window.state.focused) { throw new Error('창 확인 중 포커스가 변경되었습니다. 캡처를 다시 실행하세요.'); }
    return JSON.parse(result) as WindowBinding;
  }
  async capture(binding: WindowBinding, image: string, overwrite: boolean): Promise<void> {
    await delay(this.config.captureDelayMs);
    if (!vscode.window.state.focused) { throw new Error('다른 프로그램으로 전환되어 캡처를 취소했습니다. VS Code에서 Capture Again을 실행하세요.'); }
    const temp = path.join(path.dirname(image), `.${randomUUID()}.png`);
    try {
      await this.python(['--hwnd', String(binding.hwnd), '--pid', String(binding.pid), '--output', temp]);
      if (!vscode.window.state.focused) { throw new Error('캡처 중 포커스가 변경되어 이미지를 저장하지 않았습니다.'); }
      const signature = await fs.readFile(temp);
      if (!signature.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) { throw new Error('올바른 PNG 파일이 생성되지 않았습니다.'); }
      await publishFile(temp, image, overwrite);
    } finally { await fs.rm(temp, { force: true }); }
  }
}
