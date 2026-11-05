import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import { delay } from '../../types';

export async function run(): Promise<void> {
  const workspace = process.env.AUTOCAPTURE_WORKSPACE!;
  const output = process.env.AUTOCAPTURE_OUTPUT!;
  const extension = vscode.extensions.getExtension('Blaze828.js-assignment-autocapture');
  assert.ok(extension, 'extension is registered'); await extension.activate();
  await vscode.commands.executeCommand('workbench.action.closeSidebar');
  await delay(2500);
  for (let i = 0; i < 120 && !vscode.window.state.focused; i++) { await delay(500); }
  for (const name of ['131', '오류 예제']) {
    const doc = await vscode.workspace.openTextDocument(path.join(workspace, '4장', `${name}.js`));
    await vscode.window.showTextDocument(doc, { preview: false });
    await delay(1500);
    assert.ok(vscode.window.state.focused, 'development host must be foreground for real capture');
    await vscode.commands.executeCommand('assignment.runAndCapture');
    if (!await fs.stat(path.join(output, '4장', `${name} 실행결과.png`)).catch(() => undefined)) { await delay(20000); }
    const image = await fs.readFile(path.join(output, '4장', `${name} 실행결과.png`));
    assert.equal(image.subarray(1, 4).toString(), 'PNG');
    assert.equal(await fs.readFile(path.join(output, '4장', `${name}.js`), 'utf8'), doc.getText());
    console.log(`PASS real VS Code run/capture: ${name}`);
  }
  // Capture Again without re-running or replacing existing images.
  const again = path.join(output, '4장', '오류 예제 실행결과_02.png');
  await vscode.commands.executeCommand('assignment.captureAgain');
  assert.ok((await fs.stat(again)).size > 1000);
  console.log('PASS capture again');
}
