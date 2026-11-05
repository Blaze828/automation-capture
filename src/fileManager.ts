import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { ConfigManager } from './configManager';
import { Cancelled, CaptureKind, Submission } from './types';

export async function exists(file: string): Promise<boolean> {
  try { await fs.stat(file); return true; } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') { return false; } throw e; }
}
export function versioned(file: string, version: number): string {
  const parsed = path.parse(file);
  return path.join(parsed.dir, `${parsed.name}_${String(version).padStart(2, '0')}${parsed.ext}`);
}
export async function publishFile(temp: string, destination: string, overwrite: boolean): Promise<void> {
  if (overwrite) { await fs.rename(temp, destination); }
  else {
    // Exclusive creation also protects files created while a capture was in progress.
    await fs.copyFile(temp, destination, fs.constants.COPYFILE_EXCL);
    await fs.unlink(temp);
  }
}
export class FileManager {
  private lastUri?: vscode.Uri;
  constructor(private config: ConfigManager) {
    this.remember(vscode.window.activeTextEditor);
  }
  remember(editor: vscode.TextEditor | undefined): void {
    if (editor && this.isJS(editor.document)) { this.lastUri = editor.document.uri; }
  }
  private isJS(doc: vscode.TextDocument): boolean { return /\.js$/i.test(doc.fileName) || (doc.isUntitled && doc.languageId === 'javascript'); }
  async document(allowRemembered: boolean): Promise<vscode.TextDocument> {
    const active = vscode.window.activeTextEditor?.document;
    let document = active && this.isJS(active) ? active : undefined;
    if (!document && allowRemembered && this.lastUri) { document = await vscode.workspace.openTextDocument(this.lastUri); }
    if (!document || !this.isJS(document)) { throw new Error('JavaScript(.js) 파일을 편집기에서 선택하세요.'); }
    if (document.isUntitled) {
      await vscode.window.showTextDocument(document);
      const saved = await vscode.commands.executeCommand<boolean>('workbench.action.files.save');
      document = vscode.window.activeTextEditor?.document ?? document;
      if (saved === false || document.isUntitled) { throw new Cancelled(); }
    }
    if (document.uri.scheme !== 'file' || !/\.js$/i.test(document.fileName)) { throw new Error('Windows 로컬 .js 파일로 저장해야 합니다.'); }
    if (document.isDirty && !await document.save()) { throw new Error('원본 JavaScript 파일을 저장하지 못했습니다.'); }
    this.lastUri = document.uri;
    return document;
  }
  async prepare(document: vscode.TextDocument, kind: CaptureKind, again = false): Promise<Submission> {
    const source = document.uri.fsPath;
    const chapter = path.basename(path.dirname(source));
    if (!chapter) { throw new Error('파일을 장 폴더 안에 저장하세요.'); }
    const folder = path.join(await this.config.outputFolder(), chapter);
    await fs.mkdir(folder, { recursive: true });
    const base = path.basename(source, path.extname(source));
    const code = path.join(folder, `${base}.js`);
    let image = path.join(folder, `${base} ${kind === 'repl' ? 'REPL' : '실행결과'}.png`);
    if (again) { let n = 2; const initial = image; do { image = versioned(initial, n++); } while (await exists(image)); }
    const sameSource = path.resolve(code).toLowerCase() === path.resolve(source).toLowerCase();
    let destinationCode = code;
    let overwrite = false;
    if ((!sameSource && await exists(code)) || await exists(image)) {
      const decision = await vscode.window.showQuickPick(['덮어쓰기', '새 버전으로 저장', '취소'], { title: '같은 이름의 제출 파일이 있습니다.', ignoreFocusOut: true });
      if (!decision || decision === '취소') { throw new Cancelled(); }
      overwrite = decision === '덮어쓰기';
      if (!overwrite) {
        let n = 2;
        while (await exists(versioned(code, n)) || await exists(versioned(image, n))) { n++; }
        destinationCode = versioned(code, n); image = versioned(image, n);
      }
    }
    return { source, folder, code: destinationCode, image, overwrite };
  }
  async copyCode(submission: Submission): Promise<void> {
    if (path.resolve(submission.code).toLowerCase() === path.resolve(submission.source).toLowerCase()) { return; }
    const temp = path.join(submission.folder, `.${randomUUID()}.js.tmp`);
    try { await fs.copyFile(submission.source, temp); await publishFile(temp, submission.code, submission.overwrite); }
    finally { await fs.rm(temp, { force: true }); }
  }
}
