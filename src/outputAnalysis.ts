import { paginateOutput } from './pagination';

/** Evidence of repetition, used only for a process still running at its timeout. */
export function hasRepeatedOutput(text: string): boolean {
  const plain = text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/\r/g, '');
  // Some loops use process.stdout.write without line breaks.
  if (plain.length >= 4096) {
    const tail = plain.slice(-2048);
    for (let period = 1; period <= 128; period++) {
      if (tail.slice(period) === tail.slice(0, -period)) { return true; }
    }
  }
  const lines = plain.split('\n');
  lines.pop(); // An unfinished chunk is not a completed output line.
  const sample = lines.filter(line => line.trim()).slice(-160);
  if (sample.length < 24) { return false; }
  // Match counters as well as exact repeated messages, without classifying finite runs.
  const normalized = sample.map(line => line.replace(/-?\d+(?:\.\d+)?/g, '#'));
  for (let period = 1; period <= 12; period++) {
    if (normalized.length < period * 8) { continue; }
    const end = normalized.length;
    if (normalized.slice(end - period * 8, end - period).every((line, index) =>
      line === normalized[end - period + index % period])) { return true; }
  }
  return false;
}

/** Keep actual representative lines, command and exit status; do not invent output. */
export function representativeOutput(text: string, columns: number, rows: number): string {
  const lines = text.replace(/\r/g, '').split('\n');
  const header = lines.slice(0, 2).join('\n');
  const footer = lines.filter(line => /^\[실행 (?:중단|완료|오류)/.test(line)).at(-1) ?? '';
  const body = lines.slice(2).filter(line => line.trim() && !line.startsWith('[실행 ') && !line.startsWith('[출력이 ') && line !== lines[0]);
  const width = Math.max(8, columns);
  const heading = `${header}\n[중단된 실행 · 출력 일부만 표시]`;
  const occupied = paginateOutput(`${heading}\n${footer}`, width, 1_000_000)[0].split('\n').length;
  const wrapped = paginateOutput(body.slice(-40).join('\n'), width, 1_000_000)[0].split('\n');
  return `${heading}\n${wrapped.slice(-Math.max(1, rows - occupied - 3)).join('\n')}\n${footer}`;
}
