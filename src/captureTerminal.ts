import * as vscode from 'vscode';

export interface CaptureTerminal {
  readonly exists: boolean;
  readonly text: string;
  readonly captureText: string;
  readonly dimensions: vscode.TerminalDimensions;
  readonly estimatedRows: number;
  readonly wasTruncated: boolean;
  show(): void;
  display(text: string): void | Promise<void>;
  restore(): void | Promise<void>;
  fitRepresentative(): void | Promise<void>;
  refresh?(): Promise<unknown>;
}
