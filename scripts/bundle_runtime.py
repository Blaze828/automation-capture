"""Build native, relocatable Python + capture packages + Node inside the VSIX.

Runs only on the build machine. End users do not run pip or download a runtime.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'runtime' / 'bundled'
NODE_VERSION = '22.23.4'
PYTHON_VERSION = '3.13'
PYTHON_ARGS = ['-E', '-s', '-X', 'utf8']


def run(args, **options):
    return subprocess.run([str(a) for a in args], check=True, **options)


def download(url, destination):
    with urllib.request.urlopen(url, timeout=90) as response, open(destination, 'wb') as output:
        shutil.copyfileobj(response, output)


def native_target():
    machine = platform.machine().lower()
    architecture = 'arm64' if machine in ('arm64', 'aarch64') else 'x64'
    return ('win32' if sys.platform == 'win32' else sys.platform) + '-' + architecture


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', default=native_target())
    parser.add_argument('--uv', default=os.environ.get('AUTOCAPTURE_UV', 'uv'))
    parser.add_argument('--rebuild', action='store_true')
    args = parser.parse_args()
    if args.target != native_target() or args.target not in ('win32-x64', 'darwin-x64', 'darwin-arm64'):
        raise RuntimeError('Build the runtime on the matching Windows/Mac architecture.')
    requirement_hash = hashlib.sha256((ROOT / 'python' / 'requirements.txt').read_bytes()).hexdigest()
    marker = DEST / 'runtime.json'
    if marker.exists() and not args.rebuild:
        data = json.loads(marker.read_text(encoding='utf-8'))
        if data['target'] == args.target and data['nodeVersion'] == NODE_VERSION and data['requirementsSha256'] == requirement_hash:
            print('Using existing reviewed runtime:', args.target)
            return
        raise RuntimeError('Runtime inputs changed. Rebuild with --rebuild.')
    if DEST.exists():
        # This is a fixed, generated directory owned by this builder, never a user's venv.
        assert DEST.resolve() == (ROOT / 'runtime' / 'bundled').resolve()
        assert DEST.resolve().is_relative_to(ROOT.resolve())
        if not args.rebuild:
            raise RuntimeError('Incomplete bundle exists. Use --rebuild.')
        shutil.rmtree(DEST)
    work_root = ROOT / '.test-artifacts'
    work_root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='runtime-build-', dir=work_root) as scratch:
        scratch = Path(scratch)
        env = {**os.environ, 'UV_PYTHON_INSTALL_DIR': str(scratch / 'managed'),
               'UV_PYTHON_INSTALL_BIN': '0', 'UV_NO_CONFIG': '1', 'UV_NO_PROGRESS': '1',
               'UV_CACHE_DIR': str(work_root / 'uv-cache')}
        run([args.uv, 'python', 'install', PYTHON_VERSION, '--no-bin', '--install-dir', scratch / 'managed'], env=env)
        located = Path(run([args.uv, 'python', 'find', '--managed-python', PYTHON_VERSION],
                           env=env, capture_output=True, text=True, encoding='utf-8').stdout.strip()).resolve()
        original = located.parent if sys.platform == 'win32' else located.parent.parent
        if not original.is_relative_to((scratch / 'managed').resolve()):
            raise RuntimeError('Python was not installed in the private build directory.')
        for item in original.rglob('*'):
            if item.is_symlink() and not item.resolve().is_relative_to(original.resolve()):
                raise RuntimeError('Python distribution contains an external symlink: ' + str(item))
        DEST.mkdir(parents=True)
        # Dereference internal links: VSIX/Windows ZIP extractors need regular files.
        shutil.copytree(original, DEST / 'python', symlinks=False)
        python_rel = 'python/python.exe' if sys.platform == 'win32' else 'python/bin/python3'
        python = DEST / python_rel
        site = DEST / ('python/Lib/site-packages' if sys.platform == 'win32' else 'python/lib/python3.13/site-packages')
        run([args.uv, 'pip', 'install', '--python', python, '--target', site,
             '-r', ROOT / 'python' / 'requirements.txt'], env=env)
        version = run([python, *PYTHON_ARGS, '-c', 'import platform;print(platform.python_version())'],
                      capture_output=True, text=True).stdout.strip()
        node_platform = 'win-x64' if sys.platform == 'win32' else args.target
        archive_name = f'node-v{NODE_VERSION}-{node_platform}'
        filename = archive_name + ('.zip' if sys.platform == 'win32' else '.tar.gz')
        base = f'https://nodejs.org/dist/v{NODE_VERSION}/'
        with urllib.request.urlopen(base + 'SHASUMS256.txt', timeout=30) as response:
            checksums = dict(line.split()[::-1] for line in response.read().decode().splitlines() if line.strip())
        archive = scratch / filename
        download(base + filename, archive)
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        if digest != checksums[filename]:
            raise RuntimeError('Node archive checksum mismatch.')
        node_rel = 'node/node.exe' if sys.platform == 'win32' else 'node/bin/node'
        node = DEST / node_rel
        node.parent.mkdir(parents=True)
        # Extract only named files instead of trusting arbitrary archive paths.
        if sys.platform == 'win32':
            with zipfile.ZipFile(archive) as z:
                node.write_bytes(z.read(archive_name + '/node.exe'))
                (DEST / 'node' / 'LICENSE').write_bytes(z.read(archive_name + '/LICENSE'))
        else:
            with tarfile.open(archive, 'r:gz') as tar:
                node.write_bytes(tar.extractfile(archive_name + '/bin/node').read())
                (DEST / 'node' / 'LICENSE').write_bytes(tar.extractfile(archive_name + '/LICENSE').read())
        if sys.platform != 'win32':
            node.chmod(0o755)
            python.chmod(0o755)
        run([node, '--version'])
        modules = 'PIL, mss, pygetwindow, comtypes' if sys.platform == 'win32' else 'PIL, AppKit, Quartz, ApplicationServices'
        run([python, *PYTHON_ARGS, '-c', 'import ' + modules + '; print("Bundled capture imports OK")'])
        (DEST / 'THIRD_PARTY_NOTICES.md').write_text('''# Bundled runtimes

Python is distributed by Astral's python-build-standalone project:
https://github.com/astral-sh/python-build-standalone
Python and dependency licenses are preserved in the python distribution and package .dist-info directories.

Node.js: https://nodejs.org/ — license in node/LICENSE.
Capture package versions and licenses are recorded in their Python package metadata.
''', encoding='utf-8')
        marker.write_text(json.dumps({'schema': 1, 'target': args.target, 'python': python_rel,
            'node': node_rel, 'pythonVersion': version, 'nodeVersion': NODE_VERSION,
            'requirementsSha256': requirement_hash, 'nodeArchiveSha256': digest}, indent=2), encoding='utf-8')
        print('Self-contained bundle ready:', args.target, 'Python', version, 'Node', NODE_VERSION)


if __name__ == '__main__':
    main()
