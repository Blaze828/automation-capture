"""Decline only the hosted CI agent's unrelated local-network prompt.

Never grants Screen Recording, Accessibility, or any other OS permission.
Runs only in the ephemeral GitHub macOS GUI test, not in the extension.
"""
import os
import time
import ApplicationServices as ax
from AppKit import NSWorkspace

if os.environ.get('GITHUB_ACTIONS') != 'true':
    raise SystemExit('This helper is restricted to GitHub Actions.')


def attr(element, name):
    error, value = ax.AXUIElementCopyAttributeValue(element, name, None)
    return value if error == 0 else None


deadline = time.monotonic() + 300
while time.monotonic() < deadline:
    for app in NSWorkspace.sharedWorkspace().runningApplications():
        if app.localizedName() != 'UserNotificationCenter':
            continue
        root = ax.AXUIElementCreateApplication(app.processIdentifier())
        for window in attr(root, 'AXWindows') or []:
            nodes, stack = [], [window]
            while stack and len(nodes) < 500:
                element = stack.pop()
                nodes.append(element)
                stack.extend(attr(element, 'AXChildren') or [])
            text = ' '.join(str(attr(n, key) or '') for n in nodes for key in ('AXTitle', 'AXDescription', 'AXValue'))
            if 'hosted-compute' not in text or 'local network' not in text:
                continue
            for node in nodes:
                title = str(attr(node, 'AXTitle') or attr(node, 'AXDescription') or '').replace('’', "'")
                if attr(node, 'AXRole') == 'AXButton' and title == "Don't Allow":
                    ax.AXUIElementPerformAction(node, 'AXPress')
                    print("Declined hosted-compute local-network prompt", flush=True)
    time.sleep(0.5)
