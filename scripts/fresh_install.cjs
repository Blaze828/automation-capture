// Verify the public installer as an ordinary installed extension in a new profile.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {spawn, execFileSync} = require('node:child_process');

(async () => {
  const root = path.resolve(__dirname, '..');
  const version = process.env.AUTOCAPTURE_RELEASE_VERSION || '0.7.1';
  const target = `${process.platform}-${process.arch}`;
  const artifacts = path.join(root, '.test-artifacts', `fresh-${target}-${Date.now()}`);
  await fs.mkdir(artifacts, {recursive: true});
  const name = `js-assignment-autocapture-${version}-${target}.vsix`;
  const release = await fetch(`https://api.github.com/repos/Blaze828/automation-capture/releases/tags/v${version}`);
  if (!release.ok) { throw new Error(`Public release API: ${release.status}`); }
  const asset = (await release.json()).assets.find(item => item.name === name);
  if (!asset?.digest?.startsWith('sha256:')) { throw new Error('Missing release asset or digest'); }
  const download = await fetch(asset.browser_download_url);
  if (!download.ok) { throw new Error(`Anonymous download: ${download.status}`); }
  const payload = Buffer.from(await download.arrayBuffer());
  const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
  if (`sha256:${sha256}` !== asset.digest || payload.length !== asset.size) { throw new Error('Public installer digest mismatch'); }
  const vsix = path.join(artifacts, name);
  await fs.writeFile(vsix, payload);
  const profile = process.platform === 'darwin' ? await fs.mkdtemp('/tmp/ac-fresh-') : path.join(artifacts, '새 사용자 프로필');
  const extensions = path.join(artifacts, '확장 설치 (공백)');
  await fs.mkdir(extensions);
  const executable = process.env.VSCODE_EXECUTABLE;
  if (!executable) { throw new Error('Set VSCODE_EXECUTABLE to the isolated VS Code executable'); }
  const cli = process.env.AUTOCAPTURE_VSCODE_CLI || path.resolve(path.dirname(executable),
    process.platform === 'darwin' ? '../Resources/app/out/cli.js' : 'resources/app/out/cli.js');
  const cliArgs = [cli, '--user-data-dir', profile, '--extensions-dir', extensions];
  const cliEnv = {...process.env, ELECTRON_RUN_AS_NODE: '1'};
  const installation = execFileSync(executable, [...cliArgs, '--install-extension', vsix, '--force'],
    {env: cliEnv, encoding: 'utf8', timeout: 180000, windowsHide: true});
  await fs.writeFile(path.join(artifacts, 'installation.log'), installation);
  const listed = execFileSync(executable, [...cliArgs, '--list-extensions', '--show-versions'],
    {env: cliEnv, encoding: 'utf8', timeout: 60000, windowsHide: true});
  if (!listed.toLowerCase().includes(`blaze828.js-assignment-autocapture@${version}`)) { throw new Error(`Extension was not installed: ${listed}`); }
  const matches = [];
  for (const entry of await fs.readdir(extensions, {withFileTypes: true})) {
    if (!entry.isDirectory()) { continue; }
    const location = path.join(extensions, entry.name);
    const pkg = JSON.parse(await fs.readFile(path.join(location, 'package.json'), 'utf8'));
    if (pkg.publisher === 'Blaze828' && pkg.name === 'js-assignment-autocapture' && pkg.version === version) { matches.push(location); }
  }
  if (matches.length !== 1) { throw new Error('Expected exactly one installed target extension'); }
  const installed = matches[0];
  const runtime = JSON.parse(await fs.readFile(path.join(installed, 'runtime/bundled/runtime.json'), 'utf8'));
  if (runtime.target !== target) { throw new Error('Installed architecture mismatch'); }
  const driver = path.join(artifacts, 'test-driver');
  await fs.mkdir(driver);
  await fs.writeFile(path.join(driver, 'package.json'), JSON.stringify({name: 'autocapture-test-driver',
    publisher: 'verification', version: '0.0.0', engines: {vscode: '^1.100.0'}, main: './index.cjs'}));
  await fs.writeFile(path.join(driver, 'index.cjs'), 'exports.activate=()=>{};exports.deactivate=()=>{};');
  const env = {...process.env, AUTOCAPTURE_ARTIFACTS: artifacts, AUTOCAPTURE_PROFILE: profile,
    AUTOCAPTURE_INSTALLED_EXTENSIONS: extensions, AUTOCAPTURE_TEST_DRIVER: driver,
    AUTOCAPTURE_PACKAGED_ROOT: installed, AUTOCAPTURE_BUNDLED_TEST: '1',
    AUTOCAPTURE_PYTHON: path.join(installed, 'runtime/bundled', runtime.python)};
  const receipt = {version, target, installed, profile, artifacts, sha256, installation: listed.trim(),
    downloadedAnonymously: true, installedByVsCode: true, phases: []};
  await fs.writeFile(path.join(artifacts, 'installation.json'), JSON.stringify(receipt, null, 2));
  console.log('PASS clean VS Code installation:', artifacts);
  console.log('Installed payload:', installed);
  for (const phase of ['setup', 'api', ...(process.platform === 'win32' && process.env.GITHUB_ACTIONS ? [] : ['gui'])]) {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(root, 'scripts/integration.cjs')], {cwd: root, stdio: 'inherit',
        env: {...env, AUTOCAPTURE_FRESH_PHASE: phase,
          ...(phase === 'setup' ? {} : {AUTOCAPTURE_REUSE_PROFILE: '1'}),
          AUTOCAPTURE_API_ONLY: phase === 'api' ? '1' : ''}});
      child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error(`Fresh ${phase} exited ${code}`)));
    });
    receipt.phases.push(phase);
    await fs.writeFile(path.join(artifacts, 'installation.json'), JSON.stringify(receipt, null, 2));
  }
  console.log('PASS installed extension verification:', target, receipt.phases.join(', '));
})().catch(error => {console.error(error);process.exitCode=1;});
