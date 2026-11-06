// Shared source, separate installable VSIX targets.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const { version } = require('../package.json');
const groups = { windows: ['win32-x64'], mac: ['darwin-arm64', 'darwin-x64'], all: ['win32-x64', 'darwin-arm64', 'darwin-x64'] };
const selection = process.argv[2] || 'all';
const targets = groups[selection] || (groups.all.includes(selection) ? [selection] : undefined);
if (!targets) { throw new Error('Expected windows, mac, all, win32-x64, darwin-arm64 or darwin-x64'); }
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
for (const target of targets) {
  const output = path.join('dist', `js-assignment-autocapture-${version}-${target}.vsix`);
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules', '@vscode', 'vsce', 'vsce'),
    'package', '--target', target, '--out', output], { cwd: root, stdio: 'inherit', shell: false });
  if (result.error) { throw result.error; }
  if (result.status !== 0) { process.exit(result.status || 1); }
}
