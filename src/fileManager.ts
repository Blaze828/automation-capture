import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { ConfigManager } from './configManager';
import { ImageFormat } from './imageFormat';
import { Cancelled, CaptureKind, Submission } from './types';
import { exists, publishFile, versioned } from './storage';
export { exists, publishFile, versioned } from './storage';
const samePath = (a: string, b: string): boolean => process.platform === 'win32'
  ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b);
type ConflictChoice = '덮어쓰기' | '새 버전으로 저장' | '취소' | undefined;
export class FileManager {
  private lastUri?: vscode.Uri;
  constructor(private config: ConfigManager, private chooseConflict: () => PromiseLike<ConflictChoice> = () =>
    vscode.window.showQuickPick(['덮어쓰기', '새 버전으로 저장', '취소'] as Exclude<ConflictChoice, undefined>[],
      { title: '같은 이름의 제출 파일이 있습니다.', ignoreFocusOut: true }).then(choice => choice as ConflictChoice)) {
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
    if (document.uri.scheme !== 'file' || !/\.js$/i.test(document.fileName)) { throw new Error('로컬 .js 파일로 저장해야 합니다.'); }
    await this.save(document);
    this.lastUri = document.uri;
    return document;
  }
  async save(document: vscode.TextDocument): Promise<void> {
    if (document.isDirty && !await document.save()) { throw new Error('원본 JavaScript 파일을 저장하지 못했습니다.'); }
  }
  async prepare(document: vscode.TextDocument, kind: CaptureKind, again = false,
    batch?: { folder: string; imageFormat: ImageFormat }): Promise<Submission> {
    const source = document.uri.fsPath;
    const chapter = path.basename(path.dirname(source));
    if (!chapter) { throw new Error('파일을 장 폴더 안에 저장하세요.'); }
    const folder = batch?.folder ?? path.join(await this.config.outputFolder(), chapter);
    await fs.mkdir(folder, { recursive: true });
    const base = path.basename(source, path.extname(source));
    const code = path.join(folder, `${base}.js`);
    const format = batch?.imageFormat ?? await this.config.imageFormat();
    let image = path.join(folder, `${base} ${kind === 'repl' ? 'REPL' : '실행결과'}.${format}`);
    if (again) { let n = 2; const initial = image; do { image = versioned(initial, n++); } while (await exists(image)); }
    const sameSource = samePath(code, source);
    const unchanged = sameSource || (await exists(code) && (await fs.readFile(code)).equals(await fs.readFile(source)));
    let destinationCode = code;
    let overwrite = false;
    if ((!unchanged && await exists(code)) || await exists(image)) {
      const decision = batch ? '새 버전으로 저장' : await this.chooseConflict();
      if (!decision || decision === '취소') { throw new Cancelled(); }
      overwrite = decision === '덮어쓰기';
      if (!overwrite) {
        let n = 2;
        while (await exists(versioned(code, n)) || await exists(versioned(image, n))) { n++; }
        destinationCode = versioned(code, n); image = versioned(image, n);
      }
    }
    return { source, folder, code: destinationCode, image, overwrite, keepCode: unchanged && destinationCode === code };
  }
  async copyCode(submission: Submission): Promise<void> {
    if (samePath(submission.code, submission.source)) { return; }
    if (submission.keepCode) {
      if (!(await fs.readFile(submission.code)).equals(await fs.readFile(submission.source))) { throw new Error('제출 JS 또는 원본이 변경되었습니다. 다시 실행하세요.'); }
      return;
    }
    const temp = path.join(submission.folder, `.${randomUUID()}.js.tmp`);
    try { await fs.copyFile(submission.source, temp); await publishFile(temp, submission.code, submission.overwrite); }
    finally { await fs.rm(temp, { force: true }); }
  }
}
