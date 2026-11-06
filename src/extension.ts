import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { prepareBundledRuntime } from './bundledRuntime';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  await prepareBundledRuntime(context.extensionPath, context.extensionMode === vscode.ExtensionMode.Production);
  registerCommands(context);
}
export function deactivate(): void { /* Resources are disposed through context.subscriptions. */ }
