"""Report TCC without opening a permission dialog on an unattended CI machine."""
import json
import platform
from pathlib import Path
import ApplicationServices as ax
import Quartz

report = {'os': platform.mac_ver()[0], 'architecture': platform.machine(),
          'screenRecording': bool(Quartz.CGPreflightScreenCaptureAccess()),
          'accessibility': bool(ax.AXIsProcessTrusted()),
          'guiCaptureVerified': False}
folder = Path('.test-artifacts')
folder.mkdir(exist_ok=True)
(folder / 'macos-permissions.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
