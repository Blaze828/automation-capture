"""Measure the existing VS Code terminal and, only on overflow, drag its sash once."""
import argparse
import ctypes
from ctypes import wintypes
import json
import math
import time


def plan_resize(position, screen, editor, sash, current_rows, output_rows):
    """Return one destination coordinate. Never shrink or change panel position."""
    if current_rows <= 0 or output_rows <= current_rows or position not in ("bottom", "top"):
        return None
    row_height = (screen[3] - screen[1]) / current_rows
    if row_height <= 0:
        return None
    # About 12% breathing room, with a small, predictable 2–5 line margin.
    padding = max(2, min(5, math.ceil(output_rows * 0.12)))
    growth = min(math.ceil((output_rows + padding - current_rows) * row_height),
                 max(0, editor[3] - editor[1] - 160))
    if growth <= 0:
        return None
    x = (sash[0] + sash[2]) // 2
    y = (sash[1] + sash[3]) // 2
    return {"start": [x, y], "end": [x, y - growth if position == "bottom" else y + growth],
            "paddingRows": padding}


def prepare_dpi():
    user = ctypes.WinDLL("user32", use_last_error=True)
    user.SetProcessDpiAwarenessContext.argtypes = [wintypes.HANDLE]
    user.SetProcessDpiAwarenessContext(wintypes.HANDLE(-4))
    return user


def rectangle(element):
    rect = element.CurrentBoundingRectangle
    return (rect.left, rect.top, rect.right, rect.bottom)


def measure_terminal(hwnd):
    import comtypes.client
    comtypes.client.GetModule("UIAutomationCore.dll")
    from comtypes.gen.UIAutomationClient import CUIAutomation, IUIAutomation
    automation = comtypes.client.CreateObject(CUIAutomation, interface=IUIAutomation)
    root = automation.ElementFromHandle(hwnd)
    elements = root.FindAll(4, automation.CreateTrueCondition())
    terminals, screens, sashes = [], [], []
    editor = None
    position = None
    focused = automation.GetFocusedElement()
    focus_rect = rectangle(focused)
    for index in range(elements.Length):
        element = elements.GetElement(index)
        if element.CurrentIsOffscreen:
            continue
        classes = element.CurrentClassName.split()
        bounds = rectangle(element)
        if bounds[2] <= bounds[0] or bounds[3] <= bounds[1]:
            continue
        if "monaco-workbench" in classes:
            position = next((side for side in ("bottom", "top", "left", "right") if f"panel-position-{side}" in classes), None)
        if element.CurrentAutomationId == "workbench.parts.editor":
            editor = bounds
        if "terminal" in classes and "xterm" in classes:
            terminals.append(bounds)
        if "xterm-screen" in classes:
            screens.append(bounds)
        if "monaco-sash" in classes and "horizontal" in classes and "disabled" not in classes:
            sashes.append(bounds)
    # Focus is deliberately placed in the owned terminal before measuring.
    def contains(outer, inner):
        return outer[0] <= inner[0] <= outer[2] and outer[1] <= inner[1] <= outer[3]
    candidates = [screen for screen in screens if contains(screen, focus_rect)]
    if not candidates and len(screens) == 1:
        candidates = screens
    if len(candidates) != 1:
        raise RuntimeError("활성 터미널 영역을 확인하지 못했습니다. 터미널을 선택한 뒤 다시 캡처하세요.")
    screen = candidates[0]
    sash = None
    if editor and position in ("bottom", "top"):
        boundary = editor[3] if position == "bottom" else editor[1]
        matches = [rect for rect in sashes if abs((rect[1] + rect[3]) / 2 - boundary) <= 12
                   and min(rect[2], screen[2]) - max(rect[0], screen[0]) >= min(100, (screen[2] - screen[0]) / 2)]
        if matches:
            sash = min(matches, key=lambda rect: abs((rect[1] + rect[3]) / 2 - boundary))
    return {"position": position, "screen": screen, "editor": editor, "sash": sash}


def verify_window(user, hwnd, pid):
    user.GetForegroundWindow.restype = wintypes.HWND
    user.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
    actual = wintypes.DWORD()
    user.GetWindowThreadProcessId(hwnd, ctypes.byref(actual))
    if actual.value != pid or user.GetForegroundWindow() != hwnd:
        raise RuntimeError("대상 VS Code 창에서 다른 창으로 전환되어 크기 조절을 취소했습니다.")


def drag_once(user, hwnd, pid, start, end):
    class MouseInput(ctypes.Structure):
        _fields_ = [("dx", wintypes.LONG), ("dy", wintypes.LONG), ("mouseData", wintypes.DWORD),
                    ("dwFlags", wintypes.DWORD), ("time", wintypes.DWORD), ("dwExtraInfo", ctypes.c_size_t)]
    class InputUnion(ctypes.Union):
        _fields_ = [("mi", MouseInput), ("padding", ctypes.c_byte * (32 if ctypes.sizeof(ctypes.c_void_p) == 8 else 24))]
    class Input(ctypes.Structure):
        _fields_ = [("type", wintypes.DWORD), ("union", InputUnion)]
    user.SendInput.argtypes = [wintypes.UINT, ctypes.POINTER(Input), ctypes.c_int]
    user.SetCursorPos.argtypes = [ctypes.c_int, ctypes.c_int]
    user.WindowFromPoint.argtypes = [wintypes.POINT]
    user.WindowFromPoint.restype = wintypes.HWND
    user.GetAncestor.argtypes = [wintypes.HWND, wintypes.UINT]
    user.GetAncestor.restype = wintypes.HWND
    previous = wintypes.POINT()
    user.GetCursorPos(ctypes.byref(previous))
    def button(flags):
        event = Input()
        event.union.mi.dwFlags = flags
        if user.SendInput(1, ctypes.byref(event), ctypes.sizeof(event)) != 1:
            raise ctypes.WinError(ctypes.get_last_error())
    verify_window(user, hwnd, pid)
    pointed = user.WindowFromPoint(wintypes.POINT(*start))
    if user.GetAncestor(pointed, 2) != hwnd:
        raise RuntimeError("터미널 경계 위에 다른 창이 겹쳐 크기를 조절하지 않았습니다.")
    pressed = False
    try:
        user.SetCursorPos(*start)
        button(2)  # LEFTDOWN
        pressed = True
        time.sleep(0.04)
        verify_window(user, hwnd, pid)
        user.SetCursorPos(*end)
        time.sleep(0.04)
    finally:
        if pressed:
            button(4)  # LEFTUP
        user.SetCursorPos(previous.x, previous.y)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--hwnd", type=int, required=True)
    parser.add_argument("--pid", type=int, required=True)
    parser.add_argument("--current-rows", type=int, required=True)
    parser.add_argument("--output-rows", type=int, required=True)
    parser.add_argument("--probe", action="store_true")
    args = parser.parse_args()
    user = prepare_dpi()
    verify_window(user, args.hwnd, args.pid)
    layout = measure_terminal(args.hwnd)
    plan = None
    if layout["editor"] and layout["sash"]:
        plan = plan_resize(layout["position"], layout["screen"], layout["editor"], layout["sash"],
                           args.current_rows, args.output_rows)
    if plan and not args.probe:
        drag_once(user, args.hwnd, args.pid, plan["start"], plan["end"])
    print(json.dumps({"resized": bool(plan) and not args.probe, "layout": layout, "plan": plan}))


if __name__ == "__main__":
    try:
        main()
    except Exception as failure:
        import sys
        print(str(failure), file=sys.stderr)
        sys.exit(1)
