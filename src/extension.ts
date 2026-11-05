import * as vscode from 'vscode';
import { registerCommands } from './commands';

export function activate(context: vscode.ExtensionContext): void { registerCommands(context); }
export function deactivate(): void { /* Resources are disposed through context.subscriptions. */ }
