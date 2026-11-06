"""Read Electron's macOS AX tree; resize the existing terminal with one drag."""
import argparse
import json
import os
import sys
import time

from macos_native import rect, verify_window
from terminal_layout import plan_resize


class LayoutUnavailable(RuntimeError):
    pass


def choose_geometry(nodes, focus):
    """Match the focused xterm and its existing panel sash, never another terminal."""
    screens, sashes = [], []
    editor = position = None
    for node in nodes:
        classes, bounds = node['classes'], node['bounds']
        if 'monaco-workbench' in classes:
            position = next((s for s in ('bottom', 'top', 'left', 'right') if 'panel-position-' + s in classes), None)
        if node['identifier'] == 'workbench.parts.editor':
            editor = bounds
        if 'xterm-screen' in classes:
            screens.append(bounds)
        if 'monaco-sash' in classes and 'horizontal' in classes and 'disabled' not in classes:
            sashes.append(bounds)
    candidates = [r for r in screens if focus and r[0] <= focus[0] <= r[2] and r[1] <= focus[1] <= r[3]]
    if not candidates and len(screens) == 1:
        candidates = screens
    if len(candidates) != 1:
        raise LayoutUnavailable('활성 터미널의 접근성 영역을 확인하지 못했습니다. VS Code를 재시작하고 터미널을 선택하세요. REPL 캡처에는 xterm-screen 영역이 필요합니다.')
    screen = candidates[0]
    sash = None
    if editor and position in ('bottom', 'top'):
        edge = editor[3] if position == 'bottom' else editor[1]
        matches = [r for r in sashes if abs((r[1] + r[3]) / 2 - edge) <= 12
                   and min(r[2], screen[2]) - max(r[0], screen[0]) >= min(100, (screen[2] - screen[0]) / 2)]
        if matches:
            sash = min(matches, key=lambda r: abs((r[1] + r[3]) / 2 - edge))
    return {'position': position, 'screen': screen, 'editor': editor, 'sash': sash}


def measure_terminal(window_id, pid):
    import ApplicationServices as ax
    import objc
    if not ax.AXIsProcessTrusted():
        # Show Apple's permission request, but never change the privacy setting.
        ax.AXIsProcessTrustedWithOptions({ax.kAXTrustedCheckOptionPrompt: True})
        raise RuntimeError('macOS 손쉬운 사용 권한이 필요합니다. 시스템 설정 → 개인정보 보호 및 보안 → 손쉬운 사용에서 요청한 앱(VS Code 또는 Python)을 허용하고 다시 실행하세요.')
    window = verify_window(window_id, pid)
    app = ax.AXUIElementCreateApplication(pid)
    ax.AXUIElementSetAttributeValue(app, 'AXManualAccessibility', True)
    time.sleep(0.15)  # Allow Electron to expose its renderer tree on the first request.

    def attr(element, name):
        error, value = ax.AXUIElementCopyAttributeValue(element, name, None)
        return value if error == 0 else None

    def pair(value, kind):
        if value is None:
            return None
        # PyObjC >= 7.3 supplies the manual AXValue wrapper (we require >= 10.3).
        ok, result = ax.AXValueGetValue(value, kind, None)
        return (float(result[0]), float(result[1])) if ok else None

    def bounds(element):
        p, size = pair(attr(element, 'AXPosition'), 1), pair(attr(element, 'AXSize'), 2)
        return (p[0], p[1], p[0] + size[0], p[1] + size[1]) if p and size else None

    root = attr(app, 'AXFocusedWindow')
    expected = rect(window['kCGWindowBounds'])
    actual = bounds(root) if root is not None else None
    if not actual or any(abs(a - b) > 3 for a, b in zip(actual, expected)):
        raise LayoutUnavailable('대상 VS Code 창과 접근성 창의 위치가 일치하지 않습니다.')
    focused = attr(app, 'AXFocusedUIElement')
    focus = bounds(focused) if focused is not None else None
    stack, nodes, visited = [root], [], {}
    while stack:
        element = stack.pop()
        identity = objc.pyobjc_id(element)
        if identity in visited:
            continue
        # Keep CF proxies alive while walking: a released proxy's native address
        # can be reused for a different AX element and must not count as visited.
        visited[identity] = element
        if len(visited) > 12000:
            raise LayoutUnavailable('접근성 요소가 너무 많아 터미널 영역을 확인하지 못했습니다.')
        area = bounds(element)
        if area and area[2] > area[0] and area[3] > area[1]:
            classes = attr(element, 'AXDOMClassList') or []
            if isinstance(classes, str):
                classes = classes.split()
            nodes.append({'classes': list(classes), 'bounds': area,
                          'role': str(attr(element, 'AXRole') or ''),
                          'identifier': str(attr(element, 'AXDOMIdentifier') or attr(element, 'AXIdentifier') or '')})
        stack.extend(attr(element, 'AXChildren') or [])
    verify_window(window_id, pid)
    if os.environ.get('AUTOCAPTURE_LAYOUT_DEBUG'):
        from pathlib import Path
        Path(os.environ['AUTOCAPTURE_LAYOUT_DEBUG']).write_text(json.dumps(nodes), encoding='utf-8')
    return choose_geometry(nodes, focus)


def drag_once(window_id, pid, plan):
    import Quartz as q
    verify_window(window_id, pid)
    old = q.CGEventGetLocation(q.CGEventCreate(None))
    start, end = tuple(plan['start']), tuple(plan['end'])
    pressed = False
    try:
        q.CGEventPost(q.kCGHIDEventTap, q.CGEventCreateMouseEvent(None, q.kCGEventMouseMoved, start, q.kCGMouseButtonLeft))
        q.CGEventPost(q.kCGHIDEventTap, q.CGEventCreateMouseEvent(None, q.kCGEventLeftMouseDown, start, q.kCGMouseButtonLeft))
        pressed = True
        time.sleep(0.04)
        q.CGEventPost(q.kCGHIDEventTap, q.CGEventCreateMouseEvent(None, q.kCGEventLeftMouseDragged, end, q.kCGMouseButtonLeft))
        time.sleep(0.04)
    finally:
        if pressed:
            q.CGEventPost(q.kCGHIDEventTap, q.CGEventCreateMouseEvent(None, q.kCGEventLeftMouseUp, end, q.kCGMouseButtonLeft))
        q.CGWarpMouseCursorPosition(old)
    verify_window(window_id, pid)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--hwnd', type=int, required=True)
    parser.add_argument('--pid', type=int, required=True)
    parser.add_argument('--output-rows', type=int, default=0)
    parser.add_argument('--current-rows', type=int, default=0)
    parser.add_argument('--probe', action='store_true')
    args = parser.parse_args()
    if sys.platform != 'darwin':
        raise RuntimeError('이 도우미는 macOS 전용입니다.')
    try:
        geometry = measure_terminal(args.hwnd, args.pid)
    except LayoutUnavailable as error:
        # Keep the user's layout. The caller's existing output pagination still works.
        if args.probe:
            raise
        print(json.dumps({'resized': False, 'reason': str(error)}, ensure_ascii=False))
        return
    plan = None
    if geometry['editor'] and geometry['sash']:
        plan = plan_resize(geometry['position'], geometry['screen'], geometry['editor'], geometry['sash'],
                           args.current_rows, args.output_rows)
    if plan and not args.probe:
        drag_once(args.hwnd, args.pid, plan)
    print(json.dumps({'resized': bool(plan) and not args.probe, 'geometry': geometry, 'plan': plan}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
