"""Capture the bound real VS Code window using macOS's native screencapture tool."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from capture import save_capture

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from macos_native import (crop_pixels, ensure_on_screen, frontmost_pid, rect,
                          select_window, verify_window, window_list)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--probe', action='store_true')
    parser.add_argument('--title')
    # hwnd is the shared wire key; on macOS it holds a CGWindowID, never a pointer.
    parser.add_argument('--hwnd', type=int)
    parser.add_argument('--pid', type=int)
    parser.add_argument('--output')
    parser.add_argument('--format', choices=('png', 'jpg', 'webp'), default='png')
    parser.add_argument('--terminal-only', action='store_true')
    args = parser.parse_args()
    if sys.platform != 'darwin':
        raise RuntimeError('이 캡처 도우미는 macOS 전용입니다.')
    from PIL import Image
    if args.probe:
        pid = frontmost_pid()
        window = select_window(window_list(), pid, args.title)
        print(json.dumps({'hwnd': int(window['kCGWindowNumber']), 'pid': pid}))
        return
    if not args.hwnd or not args.pid or not args.output:
        raise RuntimeError('창 ID, 프로세스 ID와 이미지 출력 경로가 필요합니다.')
    before = verify_window(args.hwnd, args.pid)
    bounds = rect(before['kCGWindowBounds'])
    ensure_on_screen(bounds)
    region = None
    if args.terminal_only:
        from terminal_layout_macos import measure_terminal
        region = measure_terminal(args.hwnd, args.pid)['screen']
    # The temporary PNG is private and deleted even if validation/encoding fails.
    with tempfile.TemporaryDirectory(prefix='autocapture-image-') as folder:
        raw = os.path.join(folder, 'window.png')
        result = subprocess.run(['/usr/sbin/screencapture', '-x', '-o', '-l', str(args.hwnd), '-t', 'png', raw],
                                capture_output=True, text=True, timeout=12)
        if result.returncode or not os.path.isfile(raw):
            raise RuntimeError('macOS 창 캡처에 실패했습니다. 화면 기록 권한을 확인하세요. ' + result.stderr.strip())
        after = verify_window(args.hwnd, args.pid)
        if rect(after['kCGWindowBounds']) != bounds:
            raise RuntimeError('캡처 도중 창이 이동하거나 크기가 변경되었습니다.')
        if region is not None:
            from terminal_layout_macos import measure_terminal
            if tuple(measure_terminal(args.hwnd, args.pid)['screen']) != tuple(region):
                raise RuntimeError('캡처 도중 터미널 영역이 변경되었습니다.')
        with Image.open(raw) as source:
            image = source.convert('RGB')
        if region is not None:
            image = image.crop(crop_pixels(bounds, region, image.size))
        save_capture(image.tobytes(), image.size, args.output, args.format)
        print(json.dumps({'output': args.output, 'width': image.width, 'height': image.height}, ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
