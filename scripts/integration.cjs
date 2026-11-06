// Launch an isolated Extension Development Host; never edit the user's profile.
const path = require('node:path');
const fs = require('node:fs/promises');
const { spawn, execFileSync } = require('node:child_process');
const { createWriteStream, writeFileSync } = require('node:fs');
(async () => {
  const root = path.resolve(__dirname, '..');
  const artifacts = path.join(root, '.test-artifacts', String(Date.now()));
  const workspace = path.join(artifacts, '한글 공백 과제');
  const output = path.join(artifacts, '과제 제출');
  // macOS Unix-domain sockets have a short path limit; GitHub's checkout path
  // plus a nested user-data-dir exceeds it. Keep this isolated profile in /tmp.
  const profile = process.platform === 'darwin' ? await fs.mkdtemp('/tmp/ac-profile-') : path.join(artifacts, 'profile');
  await fs.mkdir(path.join(workspace, '4장'), { recursive: true });
  await fs.mkdir(path.join(profile, 'User'), { recursive: true });
  await fs.mkdir(path.join(workspace, '.vscode'), { recursive: true });
  await fs.cp(path.join(root, 'examples', '4장'), path.join(workspace, '4장'), { recursive: true });
  if (process.env.AUTOCAPTURE_SAMPLE) {
    await fs.mkdir(path.join(workspace, '6장'), { recursive: true });
    await fs.copyFile(process.env.AUTOCAPTURE_SAMPLE, path.join(workspace, '6장', 'test.js'));
  }
  const settings = {
    'security.workspace.trust.enabled': false,
    'window.title': '${activeEditorShort} - ${rootName} - ${appName}',
    'workbench.startupEditor': 'none', 'workbench.panel.defaultLocation': 'bottom',
    'window.newWindowDimensions': 'maximized', 'window.zoomLevel': 0,
    'workbench.secondarySideBar.defaultVisibility': 'hidden',
    'workbench.panel.opensMaximized': 'never', 'workbench.enableExperiments': false,
    'telemetry.telemetryLevel': 'off', 'update.mode': 'none',
    'terminal.integrated.enablePersistentSessions': false,
    'assignment.outputFolder': output,
    'assignment.nodePath': process.env.AUTOCAPTURE_BUNDLED_TEST ? 'nonexistent-user-node' : process.execPath,
    'assignment.pythonPath': process.env.AUTOCAPTURE_BUNDLED_TEST ? 'nonexistent-user-python' : process.env.AUTOCAPTURE_PYTHON || (process.platform === 'darwin' ? 'python3' : 'python'),
    'assignment.captureDelayMs': 1200,
    'assignment.imageFormat': 'png'
  };
  await fs.writeFile(path.join(profile, 'User', 'settings.json'), JSON.stringify(settings, null, 2));
  console.log('Integration artifacts:', artifacts);
  // Spawn the executable directly: the stock test-electron Windows shell launcher
  // splits unquoted Korean/space-containing paths on some Node versions.
  const log = createWriteStream(path.join(artifacts, 'host.log'));
  let executable = process.env.VSCODE_EXECUTABLE;
  if (!executable && process.platform === 'darwin') {
    const app = '/Applications/Visual Studio Code.app';
    const binary = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print CFBundleExecutable', path.join(app, 'Contents', 'Info.plist')], {encoding: 'utf8'}).trim();
    executable = path.join(app, 'Contents', 'MacOS', binary);
  }
  executable ||= path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Microsoft VS Code', 'Code.exe');
  const mainPidFile = path.join(artifacts, 'main.pid');
  const child = spawn(executable,
    [workspace, '--user-data-dir', profile, '--extensions-dir', path.join(artifacts, 'extensions'), '--disable-extensions', '--skip-welcome', '--skip-release-notes', '--new-window',
      `--extensionDevelopmentPath=${process.env.AUTOCAPTURE_PACKAGED_ROOT || root}`, `--extensionTestsPath=${path.join(root, 'out', 'test', 'integration', 'index.js')}`],
    { shell: false, env: { ...process.env, ...(process.env.AUTOCAPTURE_BUNDLED_TEST ? {
      PYTHONHOME: path.join(artifacts, 'missing-old-python'), PYTHONPATH: path.join(artifacts, 'missing-old-modules'),
      PATH: process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32') : '/usr/bin:/bin:/usr/sbin:/sbin'
    } : {}), AUTOCAPTURE_WORKSPACE: workspace, AUTOCAPTURE_OUTPUT: output,
      AUTOCAPTURE_MAIN_PID_FILE: mainPidFile } });
  if (child.pid) { writeFileSync(mainPidFile, String(child.pid)); }
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', chunk => { log.write(chunk); const text = chunk.toString(); if (/PASS|AssertionError|Error:|ENOENT/.test(text)) { process.stdout.write(text); } });
  }
  await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => { log.end(); code === 0 ? resolve() : reject(new Error(`Integration host exited ${code}; see ${artifacts}/host.log`)); });
  });
})().catch(error => { console.error(error); process.exitCode = 1; });
