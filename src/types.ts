export type CaptureKind = 'run' | 'repl';
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
export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
export const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
