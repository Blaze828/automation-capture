import type { CancellationToken } from 'vscode';

/** hwnd is a native HWND on Windows and a CGWindowID on macOS. */
export interface WindowBinding { hwnd: number; pid: number; }
export interface Submission {
  source: string;
  folder: string;
  code: string;
  image: string;
  overwrite: boolean;
  keepCode?: boolean;
}
export class Cancelled extends Error {
  constructor() { super('사용자가 취소했습니다.'); }
}
export function delay(ms: number, token?: CancellationToken): Promise<void> {
  if (token?.isCancellationRequested) { return Promise.resolve(); }
  return new Promise(resolve => {
    const finish = () => {
      clearTimeout(timer);
      subscription?.dispose();
      resolve();
    };
    const timer = setTimeout(finish, ms);
    const subscription = token?.onCancellationRequested(finish);
  });
}
export const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
