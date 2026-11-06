import * as vscode from 'vscode';
import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { ConfigManager } from './configManager';
import { publishFile } from './fileManager';
import { delay, WindowBinding } from './types';
import { hasImageSignature, isImageFormat } from './imageFormat';
import { nativePlatform } from './platform';

export class CaptureManager {
  constructor(private context: vscode.ExtensionContext, private config: ConfigManager) {}
  private python(args: string[], script = nativePlatform().capture): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(this.config.pythonPath, [path.join(this.context.extensionPath, script), ...args],
        { windowsHide: true, timeout: 20000, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
        (error, stdout, stderr) => {
          if (error) { reject(new Error(`화면 캡처 실패: ${stderr.trim() || error.message}\nPython 및 python/requirements.txt 설치를 확인하세요.`)); }
          else { resolve(stdout); }
        });
    });
  }
  async bind(document: vscode.TextDocument): Promise<WindowBinding> {
    nativePlatform();
    if (!vscode.window.state.focused) { throw new Error('대상 VS Code 창으로 돌아와 캡처를 다시 실행하세요.'); }
    await delay(200); // Allow a newly revealed editor's native window title to settle.
    const result = await this.python(['--probe', '--title', path.basename(document.fileName)]);
    if (!vscode.window.state.focused) { throw new Error('창 확인 중 포커스가 변경되었습니다. 캡처를 다시 실행하세요.'); }
    return JSON.parse(result) as WindowBinding;
  }
  async growTerminal(binding: WindowBinding, outputRows: number, currentRows: number): Promise<void> {
    await this.python(['--hwnd', String(binding.hwnd), '--pid', String(binding.pid),
      '--output-rows', String(outputRows), '--current-rows', String(currentRows)], nativePlatform().layout);
  }
  async capture(binding: WindowBinding, image: string, overwrite: boolean, terminalOnly = false): Promise<void> {
    await vscode.commands.executeCommand('notifications.hideToasts');
    await delay(this.config.captureDelayMs);
    if (!vscode.window.state.focused) { throw new Error('다른 프로그램으로 전환되어 캡처를 취소했습니다. VS Code에서 Capture Again을 실행하세요.'); }
    const format = path.extname(image).slice(1).toLowerCase();
    if (!isImageFormat(format)) { throw new Error('지원하지 않는 이미지 형식입니다. PNG/JPG/WebP를 선택하세요.'); }
    const temp = path.join(path.dirname(image), `.${randomUUID()}.${format}`);
    try {
      await this.python(['--hwnd', String(binding.hwnd), '--pid', String(binding.pid), '--output', temp, '--format', format,
        ...(terminalOnly ? ['--terminal-only'] : [])]);
      if (!vscode.window.state.focused) { throw new Error('캡처 중 포커스가 변경되어 이미지를 저장하지 않았습니다.'); }
      const signature = await fs.readFile(temp);
      if (!hasImageSignature(signature, format)) { throw new Error(`올바른 ${format.toUpperCase()} 파일이 생성되지 않았습니다.`); }
      await publishFile(temp, image, overwrite);
    } finally { await fs.rm(temp, { force: true }); }
  }
}
