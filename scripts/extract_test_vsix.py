"""Extract a packaged extension to a space/Korean path for actual installed-file tests."""
import json
from pathlib import Path
import platform
import sys
import zipfile

sys.stdout.reconfigure(encoding='utf-8')

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
target = sys.argv[1]
destination = root / '.test-artifacts' / '설치 파일 (공백)' / target
destination.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(root / 'dist' / f'js-assignment-autocapture-{version}-{target}.vsix') as archive:
    for name in archive.namelist():
        if not (destination / name).resolve().is_relative_to(destination.resolve()):
            raise RuntimeError('Unsafe archive entry')
    archive.extractall(destination)
extension = destination / 'extension'
manifest = json.loads((extension / 'runtime' / 'bundled' / 'runtime.json').read_text(encoding='utf-8'))
for key in ('node', 'python'):
    executable = extension / 'runtime' / 'bundled' / manifest[key]
    if sys.platform == 'darwin':
        executable.chmod(0o755)
    if not executable.is_file():
        raise RuntimeError('Missing bundled executable')
if 'GITHUB_ENV' in __import__('os').environ:
    with open(__import__('os').environ['GITHUB_ENV'], 'a', encoding='utf-8') as f:
        f.write('AUTOCAPTURE_PACKAGED_ROOT=' + str(extension) + '\n')
        f.write('AUTOCAPTURE_PYTHON=' + str(extension / 'runtime' / 'bundled' / manifest['python']) + '\n')
        f.write('AUTOCAPTURE_BUNDLED_TEST=1\n')
print('Testing packaged extension:', extension)
