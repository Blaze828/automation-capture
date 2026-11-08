import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { describeRunIssues } from '../runDiagnostics';

const source = path.resolve('과제 폴더', 'test.js');

test('explains Node syntax errors and locates encoded ESM stack frames in the original file', () => {
  const [issue] = describeRunIssues({ code: 1, signal: null, stopped: false,
    stderr: `\x1b[31mSyntaxError: Unexpected token '}'\x1b[0m\n    at run (${pathToFileURL(source).href}:12:4)\n` }, source, false);
  assert.match(issue, /코드 문법.*종료 코드 1/);
  assert.match(issue, /12줄 4열/);
  assert.match(issue, /SyntaxError: Unexpected token/);
  assert.ok(!issue.includes('\x1b'));
});

test('reports missing modules and uses the exit status when there is no exception message', () => {
  const failed = { code: 1, signal: null, stopped: false, stderr: "Error: Cannot find module 'missing'" };
  assert.match(describeRunIssues(failed, source, false)[0], /패키지를 찾지 못했습니다.*\nError: Cannot find module 'missing'/);
  assert.match(describeRunIssues({ ...failed, code: 7, stderr: '' }, source, false)[0], /종료 코드 7/);
});

test('distinguishes cancellation, output limits, and successful runs with stderr', () => {
  const finished = { code: 0, signal: null, stopped: false, stderr: '' };
  assert.deepEqual(describeRunIssues(finished, source, false), []);
  assert.match(describeRunIssues({ ...finished, stderr: 'diagnostic note' }, source, false)[0], /^확인 필요.*정상 종료/);
  assert.match(describeRunIssues({ ...finished, stderr: '(node:123) Warning: check this value' }, source, false)[0],
    /^실행 경고[^\n]+\n\(node:123\) Warning: check this value/);
  const stopped = describeRunIssues({ ...finished, stopped: true, stopReason: 'cancelled' }, source, true);
  assert.equal(stopped.length, 1);
  assert.match(stopped[0], /^출력 잘림/);
});
