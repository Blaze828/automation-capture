"""Drive only the owned CI Code window's first output-folder dialog.

Does not change or accept any macOS privacy permission.
"""
import os
import sys
import time
import ApplicationServices as ax
import Quartz as q
import objc
from AppKit import NSRunningApplication, NSPasteboard, NSPasteboardTypeString

if os.environ.get('GITHUB_ACTIONS') != 'true':
    raise SystemExit('This helper is restricted to the ephemeral Mac CI desktop.')
pid, destination = int(sys.argv[1]), sys.argv[2]
app = NSRunningApplication.runningApplicationWithProcessIdentifier_(pid)
if not app or app.bundleIdentifier() != 'com.microsoft.VSCode':
    raise SystemExit('Expected the owned VS Code process')
app.activateWithOptions_(3)
root = ax.AXUIElementCreateApplication(pid)
ax.AXUIElementSetAttributeValue(root, 'AXManualAccessibility', True)


def attr(element, key):
    error, value = ax.AXUIElementCopyAttributeValue(element, key, None)
    return value if error == 0 else None


def nodes():
    stack, kept = [root], {}
    while stack and len(kept) < 15000:
        element = stack.pop()
        key = objc.pyobjc_id(element)
        if key in kept:
            continue
        kept[key] = element
        stack.extend(attr(element, 'AXChildren') or [])
    return list(kept.values())


def key(code, flags=0):
    if not app.isActive():
        raise RuntimeError('Owned Code window lost focus')
    for down in (True, False):
        event = q.CGEventCreateKeyboardEvent(None, code, down)
        q.CGEventSetFlags(event, flags)
        q.CGEventPost(q.kCGHIDEventTap, event)
    time.sleep(0.5)


deadline = time.monotonic() + 8
while time.monotonic() < deadline:
    if any('저장 폴더' in str(attr(n, 'AXTitle') or attr(n, 'AXDescription') or attr(n, 'AXValue') or '') for n in nodes()):
        break
    time.sleep(0.2)
else:
    raise RuntimeError('Output-folder status button was not exposed')
key(1, q.kCGEventFlagMaskControl | q.kCGEventFlagMaskAlternate)  # Control+Option+S
deadline = time.monotonic() + 8
while time.monotonic() < deadline:
    if any('이 폴더에 저장' in str(attr(n, 'AXTitle') or attr(n, 'AXDescription') or '') for n in nodes()):
        break
    time.sleep(0.2)
else:
    raise RuntimeError('Native output-folder panel did not finish opening')
if destination == '--cancel':
    key(53)
    print('PASS native folder dialog cancel', flush=True)
    raise SystemExit(0)
key(5, q.kCGEventFlagMaskCommand | q.kCGEventFlagMaskShift)  # Go to Folder
time.sleep(0.7)
# The native panel may host its text field in an AppKit XPC process. Paste the
# path through its standard keyboard UI instead of reading Code's stale AX focus.
pasteboard = NSPasteboard.generalPasteboard()
pasteboard.clearContents()
pasteboard.setString_forType_(destination, NSPasteboardTypeString)
key(9, q.kCGEventFlagMaskCommand)
key(36)
time.sleep(0.7)
key(36)
print('PASS native folder dialog selection:', destination, flush=True)
