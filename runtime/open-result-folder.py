"""Open a result directory unless the native file manager already displays it."""
import os
import subprocess
import sys


def same_folder(left, right):
    if not left or not os.path.isabs(left):
        return False
    if os.path.normpath(left) == os.path.normpath(right):
        return True
    try:
        return os.path.samefile(left, right)
    except OSError:
        return False


def open_in_explorer(folder):
    from comtypes import COMError
    from comtypes.client import CreateObject

    shell = CreateObject("Shell.Application", dynamic=True)
    windows = shell.Windows()
    for index in range(windows.Count):
        try:
            current = windows.Item(index).Document.Folder.Self.Path
        except (AttributeError, COMError):
            # A shell item can be virtual or disappear while we enumerate it.
            continue
        if same_folder(current, folder):
            return "already-open"
    shell.Open(folder)
    return "opened"


def open_in_finder(folder):
    import ApplicationServices as ax
    from AppKit import NSRunningApplication
    from Foundation import NSURL

    if ax.AXIsProcessTrusted():
        for app in NSRunningApplication.runningApplicationsWithBundleIdentifier_("com.apple.finder"):
            finder = ax.AXUIElementCreateApplication(app.processIdentifier())
            error, windows = ax.AXUIElementCopyAttributeValue(finder, ax.kAXWindowsAttribute, None)
            if error:
                continue
            for window in windows or []:
                error, value = ax.AXUIElementCopyAttributeValue(window, ax.kAXDocumentAttribute, None)
                if error or not value:
                    continue
                location = NSURL.URLWithString_(str(value))
                if location is not None and location.isFileURL() and same_folder(location.path(), folder):
                    return "already-open"
    # Finder handles reuse when the window's location isn't exposed through Accessibility.
    subprocess.run(["/usr/bin/open", "-b", "com.apple.finder", folder], check=True, timeout=10)
    return "opened"


if __name__ == "__main__":
    folder = os.path.abspath(sys.argv[1])
    if not os.path.isdir(folder):
        raise NotADirectoryError(folder)
    opener = open_in_explorer if sys.platform == "win32" else open_in_finder
    print(opener(folder))
