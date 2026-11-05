import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { displayWidth, paginateOutput } from '../pagination';

test('output pagination preserves Korean and wide lines within terminal dimensions', () => {
  const original = Array.from({ length: 60 }, (_, i) => `${i}: 한글 출력 abcdefg🙂`).join('\n');
  const pages = paginateOutput(original, 12, 8);
  assert.ok(pages.length > 1);
  const lines = pages.join('\n').split('\n');
  for (const page of pages) { assert.ok(page.split('\n').length <= 5); }
  for (const line of lines) { assert.ok([...line].reduce((n, c) => n + displayWidth(c), 0) <= 11); }
  assert.equal(pages.join('').replace(/\n/g, ''), original.replace(/\n/g, ''));
});
test('ANSI styling does not consume rows and undersized terminals are rejected', () => {
  assert.deepEqual(paginateOutput('\x1b[31m오류\x1b[0m\r\n완료', 80, 20), ['오류\n완료']);
  assert.throws(() => paginateOutput('hello', 3, 2), /터미널 영역/);
});
