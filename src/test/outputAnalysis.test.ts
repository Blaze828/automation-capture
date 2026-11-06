import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { hasRepeatedOutput, representativeOutput } from '../outputAnalysis';
import { paginateOutput } from '../pagination';

test('detects repeated cycles and counters, but not short or varied output', () => {
  assert.equal(hasRepeatedOutput('hello\n'.repeat(100)), true);
  assert.equal(hasRepeatedOutput('반복!'.repeat(2000)), true);
  assert.equal(hasRepeatedOutput('start\nend\n'.repeat(40)), true);
  assert.equal(hasRepeatedOutput(Array.from({length: 100}, (_, i) => `반복 ${i}\n`).join('')), true);
  assert.equal(hasRepeatedOutput('hello\n'.repeat(5)), false);
  assert.equal(hasRepeatedOutput(Array.from({length: 80}, (_, i) => `${String.fromCharCode(33 + i)} unique\n`).join('')), false);
});

test('representative output keeps command, real tail and exit status within the page', () => {
  const text = '> node "C:/한글 경로/source.js"\n\n' +
    Array.from({length: 100}, (_, i) => `반복 결과 ${i}`).join('\n') + '\n[실행 중단 · 종료 코드: 없음]\n';
  for (const columns of [40, 100]) {
    const output = representativeOutput(text, columns, 16);
    assert.match(output, /node/); assert.match(output, /반복 결과 99/); assert.match(output, /실행 중단/);
    assert.doesNotMatch(output, /반복 결과 0\n/);
    assert.equal(paginateOutput(output, columns, 16).length, 1);
  }
});
