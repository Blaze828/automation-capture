"""Real non-activating overlay fixture, restricted to the owned macOS CI session."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

if sys.platform != 'darwin' or os.environ.get('GITHUB_ACTIONS') != 'true':
    raise SystemExit('This fixture is restricted to macOS GitHub Actions.')

parser = argparse.ArgumentParser()
parser.add_argument('receipt')
parser.add_argument('--check', nargs='+')
args = parser.parse_args()
receipt = Path(args.receipt)

if args.check:
    from PIL import Image
    info = json.loads(receipt.read_text(encoding='utf-8'))
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
    from macos_native import intersects, rect, validate_window
    import Quartz as q
    windows = q.CGWindowListCopyWindowInfo(q.kCGWindowListOptionOnScreenOnly, 0)
    target = validate_window(windows, info['windowId'], info['codePid'], check_occlusion=False)
    overlay = next(w for w in windows if int(w['kCGWindowOwnerPID']) == info['pid']
                   and w.get('kCGWindowName') == 'AutoCapture CI overlay')
    assert windows.index(overlay) < windows.index(target), 'overlay is above the bound Code window'
    assert intersects(rect(overlay['kCGWindowBounds']), rect(target['kCGWindowBounds']))
    try:
        validate_window([overlay, target], info['windowId'], info['codePid'])
    except RuntimeError as error:
        assert '겹쳐' in str(error), 'old global overlap policy rejects this real fixture'
    else:
        raise AssertionError('fixture must reproduce the old overlap rejection')
    raw = receipt.with_suffix('.png')
    # AppKit can shift a window when joining a fullscreen space. Sample the
    # compositor's actual bounds, inset from antialiased borders.
    bounds = overlay['kCGWindowBounds']
    region = [int(bounds['X']) + 4, int(bounds['Y']) + 4,
              int(bounds['Width']) - 8, int(bounds['Height']) - 8]
    subprocess.run(['/usr/sbin/screencapture', '-x', '-R', ','.join(map(str, region)), str(raw)], check=True)
    def magenta(image):
        # The display's ICC profile can change exact channel values.
        return sum(r > 160 and g < 110 and b > 160 for r, g, b in image.convert('RGB').get_flattened_data())
    with Image.open(raw) as image:
        fraction = magenta(image) / (image.width * image.height)
        assert fraction > 0.9, f'overlay really covers the on-screen region (magenta fraction {fraction:.3f})'
    for path in args.check:
        with Image.open(path) as image:
            assert magenta(image) < image.width * image.height * 0.001, 'window-only image excludes foreign overlay'
    print('PASS real overlay visible on screen but excluded from normal and REPL window captures')
    raise SystemExit(0)

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from macos_native import frontmost_pid, select_window, window_list
from AppKit import (NSApplication, NSApplicationActivationPolicyAccessory, NSPanel,
                    NSWindowStyleMaskBorderless, NSWindowStyleMaskNonactivatingPanel,
                    NSBackingStoreBuffered, NSStatusWindowLevel, NSColor, NSScreen,
                    NSWindowCollectionBehaviorCanJoinAllSpaces, NSWindowCollectionBehaviorFullScreenAuxiliary)

app = NSApplication.sharedApplication()
app.setActivationPolicy_(NSApplicationActivationPolicyAccessory)
code_pid = frontmost_pid()
window = select_window(window_list(), code_pid, 'Mac 창 캡처.js')
bounds = window['kCGWindowBounds']
x, y, width, height = int(bounds['X']) + 220, int(bounds['Y']) + 110, 240, 160
screen_height = NSScreen.screens()[0].frame().size.height
panel = NSPanel.alloc().initWithContentRect_styleMask_backing_defer_(
    ((x, screen_height - y - height), (width, height)),
    NSWindowStyleMaskBorderless | NSWindowStyleMaskNonactivatingPanel, NSBackingStoreBuffered, False)
panel.setTitle_('AutoCapture CI overlay')
panel.setLevel_(NSStatusWindowLevel)
panel.setBackgroundColor_(NSColor.colorWithSRGBRed_green_blue_alpha_(1, 0, 1, 1))
panel.setOpaque_(True)
panel.setHasShadow_(False)
panel.setHidesOnDeactivate_(False)
panel.setIgnoresMouseEvents_(True)
panel.setCollectionBehavior_(NSWindowCollectionBehaviorCanJoinAllSpaces | NSWindowCollectionBehaviorFullScreenAuxiliary)
panel.orderFrontRegardless()
receipt.write_text(json.dumps({'pid': os.getpid(), 'codePid': code_pid, 'windowId': int(window['kCGWindowNumber']),
                               'region': [x, y, width, height]}), encoding='utf-8')
app.run()
