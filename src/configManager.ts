import * as vscode from 'vscode';
import * as path from 'path';
import { Cancelled } from './types';

export class ConfigManager {
  get settings() { return vscode.workspace.getConfiguration('assignment'); }
  get nodePath(): string { return this.settings.get('nodePath', 'node'); }
  get pythonPath(): string { return this.settings.get('pythonPath', 'python'); }
  get timeoutMs(): number { return this.settings.get('timeoutSeconds', 30) * 1000; }
  get captureDelayMs(): number { return this.settings.get('captureDelayMs', 800); }
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
