import * as vscode from 'vscode';
import * as path from 'path';
import { Cancelled } from './types';
import { ImageFormat, isImageFormat } from './imageFormat';

export class ConfigManager {
  get settings() { return vscode.workspace.getConfiguration('assignment'); }
  get nodePath(): string { return this.settings.get('nodePath', 'node'); }
  get pythonPath(): string { return this.settings.get('pythonPath', 'python'); }
  get timeoutMs(): number { return this.settings.get('timeoutSeconds', 30) * 1000; }
  get captureDelayMs(): number { return this.settings.get('captureDelayMs', 800); }
  async imageFormat(): Promise<ImageFormat> {
    const format = this.settings.get<string>('imageFormat', '');
    if (isImageFormat(format)) { return format; }
    return this.selectImageFormat();
  }
  async selectImageFormat(): Promise<ImageFormat> {
    const choice = await vscode.window.showQuickPick([
      { label: 'PNG', description: '글자와 화면을 손실 없이 저장', format: 'png' as const },
      { label: 'JPG', description: '용량이 작은 고화질 사진 형식', format: 'jpg' as const },
      { label: 'WebP', description: '용량을 줄인 무손실 이미지', format: 'webp' as const }
    ], { title: '캡처 파일 형식 선택 · 다음 캡처에도 적용됩니다', ignoreFocusOut: true });
    if (!choice) { throw new Cancelled(); }
    const target = vscode.workspace.workspaceFolders?.length ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
    await this.settings.update('imageFormat', choice.format, target);
    return choice.format;
  }
  async outputFolder(): Promise<string> {
    const configured = this.settings.get<string>('outputFolder', '');
    if (configured) {
      if (!path.isAbsolute(configured)) { throw new Error('assignment.outputFolder는 절대 경로여야 합니다.'); }
      return configured;
    }
    return this.selectOutputFolder();
  }
  async selectOutputFolder(): Promise<string> {
    const result = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true,
      canSelectMany: false, openLabel: '과제 제출 폴더 선택' });
    if (!result?.[0]) { throw new Cancelled(); }
    const target = vscode.workspace.workspaceFolders?.length ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
    await this.settings.update('outputFolder', result[0].fsPath, target);
    return result[0].fsPath;
  }
}
