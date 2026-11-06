"""Check the included runtime with poisoned legacy Python settings, not system tools."""
import json
import os
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
bundle = root / 'runtime' / 'bundled'
manifest = json.loads((bundle / 'runtime.json').read_text(encoding='utf-8'))
python = bundle / manifest['python']
node = bundle / manifest['node']
env = {**os.environ, 'PYTHONHOME': str(root / 'missing-old-python'), 'PYTHONPATH': str(root / 'missing-old-site-packages')}
args = ['-E', '-s', '-X', 'utf8']
script = 'import sys,PIL;from pathlib import Path;root=Path(sys.argv[1]).resolve();assert Path(sys.executable).resolve().is_relative_to(root);assert Path(PIL.__file__).resolve().is_relative_to(root);print(sys.version);print("Bundled runtime ignores old Python configuration")'
subprocess.run([str(python), *args, '-c', script, str(bundle)], check=True, env=env)
subprocess.run([str(node), '-p', 'process.version'], check=True)
subprocess.run([str(python), *args, '-m', 'unittest', 'discover', '-s', str(root / 'test'), '-p', 'test_*.py', '-v'], check=True, env=env)
if 'GITHUB_ENV' in os.environ:
    with open(os.environ['GITHUB_ENV'], 'a', encoding='utf-8') as output:
        output.write('AUTOCAPTURE_PYTHON=' + str(python) + '\n')
