import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { nativePlatform } from '../platform';

test('native platform selects matching capture, shell and Python helpers', () => {
  const win = nativePlatform('win32'), mac = nativePlatform('darwin');
  assert.equal(win.capture, 'python/capture.py');
  assert.equal(win.bootstrap, 'cmd-bootstrap.cmd');
  assert.equal(win.python, 'python');
  assert.equal(mac.capture, 'python/capture_macos.py');
  assert.equal(mac.layout, 'runtime/terminal_layout_macos.py');
  assert.equal(mac.bootstrap, 'shell-bootstrap.sh');
  assert.equal(mac.shellName, 'zsh');
  assert.equal(mac.python, 'python3');
  assert.equal(mac.startCommand, 'source "$AUTOCAPTURE_BOOTSTRAP"');
  assert.throws(() => nativePlatform('linux'), /Windows.*macOS/);
});
