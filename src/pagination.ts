// Conservative display width: CJK/emoji take two cells; tabs take four.
export function displayWidth(char: string): number {
  if (char === '\t') { return 4; }
  return (char.codePointAt(0) ?? 0) > 255 ? 2 : 1;
}
export function paginateOutput(text: string, columns: number, rows: number): string[] {
  if (columns < 8 || rows < 4) { throw new Error('분할 캡처를 위해 터미널 영역을 더 크게 조절하세요.'); }
  // Retain text, not cursor controls, when replaying output into the actual terminal.
  const plain = text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/\r/g, '');
  const lines: string[] = [];
  for (const line of plain.split('\n')) {
    let segment = ''; let width = 0;
    for (const char of line) {
      const cells = displayWidth(char);
      if (width + cells > columns - 1) { lines.push(segment); segment = ''; width = 0; }
      segment += char; width += cells;
    }
    lines.push(segment);
  }
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += rows - 3) { pages.push(lines.slice(i, i + rows - 3).join('\n')); }
  return pages;
}
