import { pathToFileURL } from 'url';
import { stripVTControlCharacters } from 'util';
import type { CmdRunResult } from './cmdRunManager';

const explanations: Record<string, string> = {
  SyntaxError: 'Node.js가 코드 문법을 해석하지 못했습니다.',
  ReferenceError: '현재 위치에서 변수나 함수 이름을 참조할 수 없습니다.',
  TypeError: '값의 자료형이나 상태에 맞지 않는 연산이 실행됐습니다.',
  RangeError: '값이 허용 범위를 벗어났습니다.'
};

function sourceLocation(lines: string[], source: string): string | undefined {
  const paths = [source, pathToFileURL(source).href];
  for (const line of lines) {
    const position = /:(\d+)(?::(\d+))?\)?$/.exec(line);
    if (!position) { continue; }
    const location = line.slice(0, position.index);
    if (paths.some(file => location === file || location === `at ${file}` ||
      (location.startsWith('at ') && location.endsWith(`(${file}`)))) {
      return `${position[1]}줄${position[2] ? ` ${position[2]}열` : ''}`;
    }
  }
}

export function describeRunIssues(result: CmdRunResult, source: string, truncated: boolean): string[] {
  const issues: string[] = [];
  const lines = stripVTControlCharacters(result.stderr).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (result.stopped) {
    if (result.stopReason === 'timeout') {
      issues.push('시간 초과 · 제한 시간 안에 종료되지 않았습니다. 입력 대기나 반복 실행이 원인일 수 있습니다.');
    } else if (result.stopReason !== 'cancelled') {
      issues.push('실행 중단 · 실행이 끝나기 전에 중단 신호를 받았습니다.');
    }
  } else if (result.code !== 0 || result.signal) {
    const errorPattern = /^([\w$]+(?:Error|Exception)|Error)(?: \[[A-Z0-9_]+\])?(?::|$)/;
    const errorLine = lines.filter(line => errorPattern.test(line)).at(-1);
    const type = errorLine?.match(errorPattern)?.[1] ?? '';
    const reason = errorLine && /ERR_MODULE_NOT_FOUND|Cannot find (?:module|package)\b/.test(errorLine)
      ? '불러올 모듈이나 패키지를 찾지 못했습니다.'
      : explanations[type] ?? (errorLine ? '프로그램 실행 중 예외가 발생했습니다.' : '프로그램이 오류 상태로 종료됐습니다.');
    const status = result.signal ? `종료 신호 ${result.signal}` : `종료 코드 ${result.code}`;
    const location = sourceLocation(lines, source);
    const evidence = errorLine ?? lines[0];
    issues.push([`실행 오류 · ${reason} (${status})`,
      location && `원본 파일 위치: ${location}`, evidence?.slice(0, 500)].filter(Boolean).join('\n'));
  } else if (lines.length) {
    const warning = lines.find(line => /^\(node:\d+\) (?:\[[^\]]+\] )?\w*Warning:/.test(line));
    issues.push(`${warning ? '실행 경고' : '확인 필요'} · 정상 종료했으며 표준 오류에 메시지가 기록됐습니다.\n${(warning ?? lines[0]).slice(0, 500)}`);
  }
  if (truncated) {
    issues.push('출력 잘림 · 출력이 보관 한도(1,000,000자)를 초과했습니다. 전체 출력은 캡처할 수 없습니다.');
  }
  return issues;
}
