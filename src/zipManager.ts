import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigManager } from './configManager';
import { Cancelled } from './types';
import { exists, nextAvailable } from './storage';
import { createChapterZip } from './zipArchive';

export class ZipManager {
  constructor(private config: ConfigManager) {}
  async export(): Promise<string> {
    const root = await this.config.outputFolder();
    const entries = await fs.readdir(root, { withFileTypes: true });
    const folders = entries.filter(e => e.isDirectory()).map(e => e.name);
    if (!folders.length) { throw new Error('제출 폴더에 장 폴더가 없습니다. 먼저 실행 및 캡처하세요.'); }
    const chapter = await vscode.window.showQuickPick(folders, { title: 'ZIP으로 압축할 장 선택', ignoreFocusOut: true });
    if (!chapter) { throw new Cancelled(); }
    let destination = path.join(root, `${chapter}.zip`);
    let overwrite = false;
    if (await exists(destination)) {
      const choice = await vscode.window.showQuickPick(['덮어쓰기', '새 버전으로 저장', '취소'], { title: '기존 ZIP이 있습니다.', ignoreFocusOut: true });
      if (!choice || choice === '취소') { throw new Cancelled(); }
      overwrite = choice === '덮어쓰기';
      if (!overwrite) { destination = await nextAvailable(destination); }
    }
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `${chapter} ZIP 생성 중` },
      () => createChapterZip(path.join(root, chapter), destination, overwrite));
    return destination;
  }
}
