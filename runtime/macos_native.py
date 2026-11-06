"""macOS window identity/geometry. Imports stay lazy so pure helpers can be tested anywhere."""
import math
import os
import sys
from functools import lru_cache


def rect(bounds):
    x, y = float(bounds['X']), float(bounds['Y'])
    return x, y, x + float(bounds['Width']), y + float(bounds['Height'])


def intersects(a, b):
    return min(a[2], b[2]) > max(a[0], b[0]) and min(a[3], b[3]) > max(a[1], b[1])


def select_window(windows, pid, title):
    # The caller has checked the frontmost application. Non-activating foreign
    # overlays may still precede Code in this list; window capture excludes them.
    visible = [w for w in windows if int(w['kCGWindowOwnerPID']) == pid and w.get('kCGWindowLayer') == 0
               and w.get('kCGWindowAlpha', 1) > 0 and w.get('kCGWindowIsOnscreen', True)]
    if not visible:
        raise RuntimeError('대상 VS Code 창을 전면에 두고 다시 실행하세요.')
    window = visible[0]
    if not title or title.casefold() not in str(window.get('kCGWindowName', '')).casefold():
        raise RuntimeError('활성 VS Code 창의 파일명이 일치하지 않습니다. 원본 JS 탭을 선택하세요. window.title에 ${activeEditorShort}가 필요합니다.')
    return window


def validate_window(windows, window_id, pid, dock_pids=(), cursor_pids=(), cursor_level=None,
                    *, check_occlusion=True):
    target = next((w for w in windows if int(w['kCGWindowNumber']) == window_id), None)
    if (not target or int(target['kCGWindowOwnerPID']) != pid or target.get('kCGWindowLayer') != 0
            or not target.get('kCGWindowIsOnscreen', True) or target.get('kCGWindowAlpha', 1) <= 0):
        raise RuntimeError('캡처할 VS Code 창이 닫혔거나 변경되었습니다.')
    if not check_occlusion:
        # screencapture -l captures this window's backing surface, not the screen
        # rectangle. Other processes' overlays cannot enter the resulting image.
        # Still reject switching to another normal window of the same Code app.
        front = next((w for w in windows if int(w['kCGWindowOwnerPID']) == pid
                      and w.get('kCGWindowLayer') == 0 and w.get('kCGWindowIsOnscreen', True)
                      and w.get('kCGWindowAlpha', 1) > 0), None)
        if front is None or int(front['kCGWindowNumber']) != window_id:
            raise RuntimeError('활성 VS Code 창이 변경되었습니다. 원본 JS 창에서 다시 캡처하세요.')
        return target
    bounds = rect(target['kCGWindowBounds'])
    for window in windows:
        if int(window['kCGWindowNumber']) == window_id:
            break
        # macOS exposes Dock's transparent tracking surface as a full-screen
        # window. It is not an opaque dialog covering the VS Code contents.
        # Identify the actual Dock process; a similarly named app is not exempt.
        if (int(window['kCGWindowOwnerPID']) in dock_pids and window.get('kCGWindowLayer') == 20
                and window.get('kCGWindowName') == 'Dock'):
            continue
        # The hardware cursor can appear in the window list after using a native
        # picker. It is a system surface, not a window obscuring the document.
        if (cursor_level is not None and int(window['kCGWindowOwnerPID']) in cursor_pids
                and window.get('kCGWindowLayer') == cursor_level
                and window.get('kCGWindowName') == 'Cursor'
                and window.get('kCGWindowOwnerName') == 'Window Server'):
            continue
        if (window.get('kCGWindowAlpha', 1) > 0 and window.get('kCGWindowLayer', 0) >= 0
                and intersects(bounds, rect(window['kCGWindowBounds']))):
            if os.environ.get('AUTOCAPTURE_CAPTURE_DEBUG'):
                print('Capture blocker: ' + str(dict(window)), file=sys.stderr)
            raise RuntimeError('VS Code 창 위에 다른 창 또는 대화상자가 겹쳐 있습니다. 닫은 뒤 다시 캡처하세요.')
    return target


def crop_pixels(window, region, image_size):
    """Convert global, top-left AX points into window screenshot pixels (Retina too)."""
    left, top, right, bottom = window
    a, b, c, d = region
    if right <= left or bottom <= top or a < left or b < top or c > right or d > bottom or c <= a or d <= b:
        raise RuntimeError('터미널 캡처 영역을 확인하지 못했습니다.')
    sx, sy = image_size[0] / (right - left), image_size[1] / (bottom - top)
    return (math.floor((a - left) * sx), math.floor((b - top) * sy),
            math.ceil((c - left) * sx), math.ceil((d - top) * sy))


def frontmost_pid():
    from AppKit import NSWorkspace
    app = NSWorkspace.sharedWorkspace().frontmostApplication()
    if app is None or str(app.bundleIdentifier()) not in ('com.microsoft.VSCode', 'com.microsoft.VSCodeInsiders'):
        raise RuntimeError('로컬 Visual Studio Code 창을 전면에 두세요.')
    return int(app.processIdentifier())


def window_list():
    import Quartz as q
    if not q.CGPreflightScreenCaptureAccess():
        q.CGRequestScreenCaptureAccess()
        raise RuntimeError('macOS 화면 기록 권한이 필요합니다. 시스템 설정 → 개인정보 보호 및 보안 → 화면 및 시스템 오디오 기록에서 요청한 앱(VS Code 또는 Python)을 허용하고 VS Code를 완전히 종료한 뒤 다시 여세요.')
    return list(q.CGWindowListCopyWindowInfo(q.kCGWindowListOptionOnScreenOnly | q.kCGWindowListExcludeDesktopElements,
                                           q.kCGNullWindowID) or [])


@lru_cache(maxsize=16)
def is_system_window_server(pid):
    import pwd
    import subprocess
    from pathlib import Path
    try:
        owner, command = subprocess.check_output(['/bin/ps', '-p', str(pid), '-o', 'uid=,comm='],
                                                text=True, timeout=2).strip().split(maxsplit=1)
        return int(owner) == pwd.getpwnam('_windowserver').pw_uid and Path(command).name == 'WindowServer'
    except (KeyError, ValueError, OSError, subprocess.SubprocessError):
        return False


def verify_window(window_id, pid, *, check_occlusion=False):
    from AppKit import NSRunningApplication
    import Quartz as q
    if frontmost_pid() != pid:
        raise RuntimeError('대상 VS Code 창에서 다른 창으로 전환되었습니다.')
    windows = window_list()
    if not check_occlusion:
        return validate_window(windows, window_id, pid, check_occlusion=False)
    dock_pids = {int(app.processIdentifier()) for app in
                 NSRunningApplication.runningApplicationsWithBundleIdentifier_('com.apple.dock')}
    cursor_level = q.CGWindowLevelForKey(q.kCGCursorWindowLevelKey)
    cursor_pids = {int(w['kCGWindowOwnerPID']) for w in windows
                   if w.get('kCGWindowLayer') == cursor_level and w.get('kCGWindowName') == 'Cursor'
                   and w.get('kCGWindowOwnerName') == 'Window Server'
                   and is_system_window_server(int(w['kCGWindowOwnerPID']))}
    return validate_window(windows, window_id, pid, dock_pids, cursor_pids, cursor_level)


def ensure_on_screen(bounds):
    import Quartz as q
    error, displays, _ = q.CGGetActiveDisplayList(32, None, None)
    if error:
        raise RuntimeError('모니터 영역을 확인하지 못했습니다.')
    # Subtract monitor rectangles from the window; a virtual bounding box could
    # incorrectly allow a window extending into a gap between displays.
    remaining = [bounds]
    for display in displays:
        frame = q.CGDisplayBounds(display)
        screen = (frame.origin.x, frame.origin.y,
                  frame.origin.x + frame.size.width, frame.origin.y + frame.size.height)
        pieces = []
        for a, b, c, d in remaining:
            l, t, r, bot = max(a, screen[0]), max(b, screen[1]), min(c, screen[2]), min(d, screen[3])
            if l >= r or t >= bot:
                pieces.append((a, b, c, d))
            else:
                pieces.extend(p for p in ((a, b, c, t), (a, bot, c, d), (a, t, l, bot), (r, t, c, bot))
                              if p[2] > p[0] and p[3] > p[1])
        remaining = pieces
    if remaining:
        raise RuntimeError('VS Code 창 일부가 모니터 밖에 있습니다. 창을 화면 안으로 옮기세요.')
