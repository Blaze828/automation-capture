// Runs under the real cmd.exe terminal. Control/status files never appear in its output.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const request = JSON.parse(fs.readFileSync(process.env.AUTOCAPTURE_REQUEST, 'utf8'));
const metaPath = path.join(request.folder, 'state.json');
const controlPath = path.join(request.folder, 'control.json');
const outputPath = path.join(request.folder, 'output.txt');
let child;
let done = request.replay === true;
let stopped = false;
let code = null;
let signal = null;
let error;
let ack = 0;
let size = 0;
let tail = '';
let truncated = false;
let finishing = false;

function publish() {
  // Windows does not reliably deliver SIGWINCH while the capture host is idle.
  // Refresh Node's cached console dimensions before reporting them to the extension.
  if (process.stdout.isTTY && typeof process.stdout._refreshSize === 'function') { process.stdout._refreshSize(); }
  const state = { nonce: request.nonce, ready: true, done, stopped, code, signal, error, ack,
    pid: child?.pid, hostPid: process.pid, shellPid: process.ppid,
    columns: process.stdout.columns || 100, rows: process.stdout.rows || 20,
    truncated, tail };
  const temp = metaPath + '.tmp';
  try {
    fs.writeFileSync(temp, JSON.stringify(state));
    fs.renameSync(temp, metaPath);
    return true;
  } catch (failure) {
    if (['EPERM', 'EACCES', 'EBUSY'].includes(failure.code)) { return false; }
    throw failure;
  }
}
function output(text) {
  tail = (tail + text).slice(-32000);
  if (size < 1000000) {
    const retained = text.slice(0, 1000000 - size);
    fs.appendFileSync(outputPath, retained, 'utf8');
    size += retained.length;
    if (retained.length < text.length) { truncated = true; }
    process.stdout.write(retained);
  } else { truncated = true; }
}
function stop() {
  if (done || stopped || !child?.pid) { return; }
  stopped = true;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, shell: false });
    killer.on('error', () => child.kill());
    killer.on('close', exit => { if (exit !== 0) { child.kill(); } });
  } else { child.kill('SIGKILL'); }
}
process.on('SIGINT', stop);
process.on('SIGBREAK', stop);
fs.writeFileSync(outputPath, '');
// Clear visible content AND scrollback, so another file's output cannot reflow into the capture.
process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
if (request.replay) {
  output(request.text || '');
} else {
  const executable = request.nodePath === 'node' ? 'node' : JSON.stringify(request.nodePath);
  output(`${path.dirname(request.source)}>${executable} ${JSON.stringify(path.basename(request.source))}\n\n`);
  const env = { ...process.env };
  for (const key of Object.keys(env)) { if (key.startsWith('AUTOCAPTURE_')) { delete env[key]; } }
  child = spawn(request.nodePath, [request.source], {
    cwd: path.dirname(request.source), env, shell: false, windowsHide: true,
    stdio: ['inherit', 'pipe', 'pipe']
  });
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', output); child.stderr.on('data', output);
  child.on('error', failure => { error = failure.message; });
  child.on('close', (exitCode, exitSignal) => {
    code = exitCode; signal = exitSignal; done = true;
    // Keep the host alive only through capture so resizing/replay can use the real console.
    // Do not append a completion banner or an exit code to the user's output.
    if (!publish()) { return; }
  });
}
publish();
const timer = setInterval(() => {
  try {
    if (fs.existsSync(controlPath)) {
      const control = JSON.parse(fs.readFileSync(controlPath, 'utf8'));
      if (control.nonce === request.nonce && control.seq > ack) {
        if (control.stop) { stop(); }
        if (typeof control.display === 'string') {
          process.stdout.write('\x1b[2J\x1b[3J\x1b[H' + control.display.replace(/\r?\n/g, '\r\n'));
        }
        ack = control.seq;
        if (control.finish && done) { finishing = true; }
      }
    }
    if (!publish()) { return; }
    if (finishing) {
      clearInterval(timer);
      // Leave the real cmd.exe prompt alive for normal manual commands.
      process.stdout.write('\r\n');
      process.exit(0);
    }
  } catch (failure) {
    // Windows readers can briefly hold the destination during an atomic replacement.
    if (!['ENOENT', 'EPERM', 'EACCES', 'EBUSY'].includes(failure.code) && !(failure instanceof SyntaxError)) {
      process.stderr.write(`CMD capture host: ${failure.message}\n`);
      stop(); clearInterval(timer); process.exit(1);
    }
  }
}, 60);
