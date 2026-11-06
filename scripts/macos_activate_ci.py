"""Bring only the owned CI Development Host to the foreground before GUI tests."""
import os
import sys
import time
from AppKit import (NSRunningApplication, NSApplicationActivateAllWindows,
                    NSApplicationActivateIgnoringOtherApps)

if os.environ.get('GITHUB_ACTIONS') != 'true':
    raise SystemExit('This helper is restricted to GitHub Actions.')
pid = int(sys.argv[1])
deadline = time.monotonic() + 10
while time.monotonic() < deadline:
    app = NSRunningApplication.runningApplicationWithProcessIdentifier_(pid)
    if app is not None and app.bundleIdentifier() in ('com.microsoft.VSCode', 'com.microsoft.VSCodeInsiders'):
        if app.isActive():
            break
        app.activateWithOptions_(NSApplicationActivateAllWindows | NSApplicationActivateIgnoringOtherApps)
    time.sleep(0.25)
else:
    raise SystemExit('The owned VS Code Development Host did not become active.')
