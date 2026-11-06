"""Capture only the bound, visible VS Code window. Never fall back to a monitor."""
import argparse
import ctypes
from ctypes import wintypes
import json
import os
import sys


def is_cursor_overlay(class_name, extended_style):
    # Computer Use's click-through cursor indicator covers the desktop with an
    # otherwise transparent surface. It is decoration, not an obstructing app.
    required = 0x00080000 | 0x00000020 | 0x08000000  # LAYERED | TRANSPARENT | NOACTIVATE
    return class_name == "CodexComputerUseCursorOverlay" and extended_style & required == required


def save_capture(rgb, size, output, image_format):
    from PIL import Image
    image = Image.frombytes("RGB", size, rgb)
    if image_format == "png":
        image.save(output, format="PNG")
    else:
        if image_format == "jpg":
            image.save(output, format="JPEG", quality=95, subsampling=0)
        elif image_format == "webp":
            image.save(output, format="WEBP", lossless=True)
        else:
            raise ValueError("지원하지 않는 이미지 형식입니다.")


def main():
    if sys.platform != "win32":
        raise RuntimeError("Windows 10/11 전용 캡처입니다.")
    # Must precede PyGetWindow and mss imports, including mixed-DPI multi-monitor setups.
    user32 = ctypes.WinDLL("user32", use_last_error=True)
    try:
        user32.SetProcessDpiAwarenessContext.argtypes = [wintypes.HANDLE]
        user32.SetProcessDpiAwarenessContext(wintypes.HANDLE(-4))
    except AttributeError:
        ctypes.WinDLL("shcore").SetProcessDpiAwareness(2)
    import pygetwindow as gw
    import mss
    import mss.tools

    parser = argparse.ArgumentParser()
    parser.add_argument("--probe", action="store_true")
    parser.add_argument("--title", default="")
    parser.add_argument("--hwnd", type=int)
    parser.add_argument("--pid", type=int)
    parser.add_argument("--output")
    parser.add_argument("--format", choices=["png", "jpg", "webp"], default="png")
    parser.add_argument("--terminal-only", action="store_true")
    args = parser.parse_args()
    user32.GetForegroundWindow.restype = wintypes.HWND
    user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
    user32.IsWindowVisible.argtypes = [wintypes.HWND]
    user32.IsIconic.argtypes = [wintypes.HWND]
    user32.GetWindowRect.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.RECT)]
    user32.GetWindowTextLengthW.argtypes = [wintypes.HWND]
    user32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
    user32.GetClassNameW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
    user32.GetWindowLongW.argtypes = [wintypes.HWND, ctypes.c_int]
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel32.OpenProcess.restype = wintypes.HANDLE
    kernel32.QueryFullProcessImageNameW.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD)]
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    dwmapi = ctypes.WinDLL("dwmapi")
    dwmapi.DwmGetWindowAttribute.argtypes = [wintypes.HWND, wintypes.DWORD, wintypes.LPVOID, wintypes.DWORD]

    def identity(hwnd):
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        handle = kernel32.OpenProcess(0x1000, False, pid.value)
        if not handle:
            raise RuntimeError("VS Code 창 프로세스를 확인하지 못했습니다.")
        try:
            size = wintypes.DWORD(32768)
            name = ctypes.create_unicode_buffer(size.value)
            if not kernel32.QueryFullProcessImageNameW(handle, 0, name, ctypes.byref(size)):
                raise RuntimeError("창 프로세스 경로를 확인하지 못했습니다.")
            if os.path.basename(name.value).lower() not in ("code.exe", "code - insiders.exe"):
                raise RuntimeError(f"대상 창이 Visual Studio Code가 아닙니다 ({os.path.basename(name.value)}).")
        finally:
            kernel32.CloseHandle(handle)
        return pid.value

    def bounds(hwnd):
        rect = wintypes.RECT()
        if dwmapi.DwmGetWindowAttribute(hwnd, 9, ctypes.byref(rect), ctypes.sizeof(rect)) != 0:
            if not user32.GetWindowRect(hwnd, ctypes.byref(rect)):
                raise RuntimeError("창 경계를 확인하지 못했습니다.")
        return rect.left, rect.top, rect.right, rect.bottom

    hwnd = user32.GetForegroundWindow() if args.probe else args.hwnd
    if not hwnd or not user32.IsWindowVisible(hwnd) or user32.IsIconic(hwnd):
        raise RuntimeError("캡처할 VS Code 창이 없거나 최소화되어 있습니다.")
    # PyGetWindow enumeration independently verifies a real titled desktop window.
    if not any(window._hWnd == hwnd for window in gw.getAllWindows()):
        raise RuntimeError("VS Code 창을 찾지 못했습니다.")
    pid = identity(hwnd)
    title = ctypes.create_unicode_buffer(user32.GetWindowTextLengthW(hwnd) + 1)
    user32.GetWindowTextW(hwnd, title, len(title))
    if args.probe:
        if not args.title or args.title.casefold() not in title.value.casefold():
            raise RuntimeError("활성 VS Code 창의 파일명이 일치하지 않습니다. 원본 JS 탭을 선택하세요. 사용자 지정 window.title에는 ${activeEditorShort}가 필요합니다.")
        print(json.dumps({"hwnd": hwnd, "pid": pid}))
        return
    if pid != args.pid or user32.GetForegroundWindow() != hwnd:
        raise RuntimeError("대상 VS Code 창에서 다른 창으로 전환되었습니다. 다시 캡처하세요.")
    if not args.output:
        raise RuntimeError("이미지 출력 경로가 필요합니다.")
    left, top, right, bottom = bounds(hwnd)
    if right <= left or bottom <= top:
        raise RuntimeError("유효하지 않은 창 크기입니다.")

    def ensure_unobscured():
        blockers = []
        found_target = [False]
        callback_type = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
        def visit(other, _):
            if other == hwnd:
                found_target[0] = True
                return False
            try:
                if user32.IsWindowVisible(other) and not user32.IsIconic(other):
                    class_name = ctypes.create_unicode_buffer(256)
                    user32.GetClassNameW(other, class_name, 256)
                    style = user32.GetWindowLongW(other, -20) & 0xffffffff
                    if is_cursor_overlay(class_name.value, style):
                        return True
                    cloaked = wintypes.DWORD()
                    dwmapi.DwmGetWindowAttribute(other, 14, ctypes.byref(cloaked), ctypes.sizeof(cloaked))
                    if not cloaked.value:
                        a, b, c, d = bounds(other)
                        if min(right, c) > max(left, a) and min(bottom, d) > max(top, b):
                            blockers.append(other)
            except Exception:
                # ctypes callback exceptions must not silently allow an unsafe capture.
                blockers.append(other)
            return True
        callback = callback_type(visit)
        user32.EnumWindows.argtypes = [callback_type, wintypes.LPARAM]
        user32.EnumWindows(callback, 0)
        if blockers or not found_target[0]:
            if os.environ.get('AUTOCAPTURE_CAPTURE_DEBUG'):
                debug = []
                for blocker in blockers:
                    class_name = ctypes.create_unicode_buffer(256)
                    user32.GetClassNameW(blocker, class_name, 256)
                    debug.append({'hwnd': blocker, 'class': class_name.value, 'bounds': bounds(blocker), 'style': hex(user32.GetWindowLongW(blocker, -20) & 0xffffffff)})
                print('Capture blockers: ' + json.dumps(debug), file=sys.stderr)
            raise RuntimeError("VS Code 창 위에 다른 창 또는 대화상자가 겹쳐 있습니다. 닫은 뒤 다시 캡처하세요.")

    ensure_unobscured()
    capture_bounds = (left, top, right, bottom)
    if args.terminal_only:
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "runtime"))
        from terminal_layout import measure_terminal
        capture_bounds = measure_terminal(hwnd)["screen"]
        a, b, c, d = capture_bounds
        if a < left or b < top or c > right or d > bottom or c <= a or d <= b:
            raise RuntimeError("터미널 캡처 영역을 확인하지 못했습니다.")
    with mss.mss() as screen:
        virtual = screen.monitors[0]
        if left < virtual["left"] or top < virtual["top"] or right > virtual["left"] + virtual["width"] or bottom > virtual["top"] + virtual["height"]:
            raise RuntimeError("VS Code 창 일부가 모니터 밖에 있습니다. 창을 화면 안으로 옮기세요.")
        a, b, c, d = capture_bounds
        shot = screen.grab({"left": a, "top": b, "width": c - a, "height": d - b})
        if user32.GetForegroundWindow() != hwnd or identity(hwnd) != pid or bounds(hwnd) != (left, top, right, bottom):
            raise RuntimeError("캡처 도중 창이 이동하거나 포커스가 변경되었습니다.")
        ensure_unobscured()
        save_capture(shot.rgb, shot.size, args.output, args.format)
    print(json.dumps({"output": args.output, "width": shot.width, "height": shot.height}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
