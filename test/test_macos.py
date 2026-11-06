"""Geometry and binding tests run on Windows too; no macOS GUI is mocked as a pass."""
from pathlib import Path
import os
import sys
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from macos_native import crop_pixels, select_window, validate_window, verify_window
from terminal_layout_macos import choose_geometry, verify_drag_target, LayoutUnavailable
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'python'))
import capture_macos


def window(number=10, pid=20, title='test.js — Visual Studio Code', x=100, layer=0):
    return {'kCGWindowNumber': number, 'kCGWindowOwnerPID': pid, 'kCGWindowName': title,
            'kCGWindowLayer': layer, 'kCGWindowAlpha': 1, 'kCGWindowIsOnscreen': True,
            'kCGWindowBounds': {'X': x, 'Y': 50, 'Width': 1000, 'Height': 800}}


class MacWindowTest(unittest.TestCase):
    def test_binds_only_frontmost_window_and_expected_file(self):
        target = window()
        self.assertEqual(select_window([target, window(11)], 20, 'test.js'), target)
        self.assertEqual(select_window([window(pid=99), target], 20, 'test.js'), target)
        with self.assertRaises(RuntimeError):
            select_window([window(pid=99)], 20, 'test.js')
        with self.assertRaises(RuntimeError):
            select_window([window(title='other.js'), target], 20, 'test.js')

    def test_rejects_closed_reused_or_obscured_window(self):
        for windows, pid in (([], 20), ([window(pid=21)], 20), ([window(11), window()], 20)):
            with self.subTest(windows=windows), self.assertRaises(RuntimeError):
                validate_window(windows, 10, pid)
        self.assertEqual(validate_window([window(11, x=-2000), window()], 10, 20), window())

    def test_retina_crop_keeps_only_terminal_in_global_coordinates(self):
        self.assertEqual(crop_pixels((100, 50, 1100, 850), (200, 600, 1000, 800), (2000, 1600)),
                         (200, 1100, 1800, 1500))
        self.assertEqual(crop_pixels((-1100, -50, -100, 750), (-1000, 500, -200, 700), (1000, 800)),
                         (100, 550, 900, 750))

    def test_crop_rejects_code_or_regions_outside_window(self):
        for region in ((99, 100, 500, 500), (100, 40, 500, 500), (200, 200, 1200, 500), (300, 300, 200, 200)):
            with self.subTest(region=region), self.assertRaises(RuntimeError):
                crop_pixels((100, 50, 1100, 850), region, (2000, 1600))

    def test_hidden_and_menu_windows_are_not_selected(self):
        hidden = window(12)
        hidden['kCGWindowIsOnscreen'] = False
        self.assertEqual(select_window([window(11, layer=24), hidden, window()], 20, 'test.js')['kCGWindowNumber'], 10)

    def test_dock_tracking_surface_does_not_block_real_window_capture(self):
        dock = window(30, pid=300, title='Dock', x=0, layer=20)
        self.assertEqual(validate_window([dock, window()], 10, 20, {300}), window())
        with self.assertRaises(RuntimeError):
            validate_window([dock, window()], 10, 20, {301})
        dialog = window(31, pid=300, title='Actual dialog', layer=20)
        with self.assertRaises(RuntimeError):
            validate_window([dialog, window()], 10, 20, {300})

    def test_only_verified_system_cursor_surface_is_exempt(self):
        cursor = window(40, pid=400, title='Cursor', layer=2147483630)
        cursor['kCGWindowOwnerName'] = 'Window Server'
        self.assertEqual(validate_window([cursor, window()], 10, 20, cursor_pids={400},
                                         cursor_level=2147483630), window())
        for changed, trusted in (({}, {401}), ({'kCGWindowLayer': 20}, {400}),
                                 ({'kCGWindowName': 'Actual dialog'}, {400}),
                                 ({'kCGWindowOwnerName': 'Another app'}, {400})):
            with self.subTest(changed=changed), self.assertRaises(RuntimeError):
                validate_window([{**cursor, **changed}, window()], 10, 20,
                                cursor_pids=trusted, cursor_level=2147483630)

    def test_window_only_capture_ignores_foreign_overlays_at_any_layer(self):
        for layer in (0, 3, 20, 24, 1000, 2147483630):
            overlay = window(99, pid=99, title='Unknown overlay', layer=layer)
            with self.subTest(layer=layer):
                self.assertEqual(validate_window([overlay, window()], 10, 20,
                                                  check_occlusion=False), window())

    def test_window_only_capture_still_rejects_invalid_or_switched_target(self):
        for windows in ([], [window(pid=99)], [window(layer=3)],
                        [{**window(), 'kCGWindowIsOnscreen': False}],
                        [{**window(), 'kCGWindowAlpha': 0}], [window(11), window()]):
            with self.subTest(windows=windows), self.assertRaises(RuntimeError):
                validate_window(windows, 10, 20, check_occlusion=False)

    def test_window_capture_still_rejects_foreground_application_change(self):
        with patch.dict(sys.modules, {'AppKit': SimpleNamespace(NSRunningApplication=object()),
                                     'Quartz': SimpleNamespace()}), \
                patch('macos_native.frontmost_pid', return_value=99):
            with self.assertRaisesRegex(RuntimeError, '다른 창으로 전환'):
                verify_window(10, 20)


class MacTerminalTest(unittest.TestCase):
    def test_drag_requires_actual_target_at_sash_point(self):
        fake = SimpleNamespace(AXUIElementCreateSystemWide=lambda: object(),
            AXUIElementCopyElementAtPosition=lambda *args: (0, object()),
            AXUIElementGetPid=lambda *args: (0, 20))
        with patch.dict(sys.modules, {'ApplicationServices': fake}), \
                patch('terminal_layout_macos.verify_window', return_value=window()):
            self.assertEqual(verify_drag_target(10, 20, (500, 600)), window())
            for error, pid in ((0, 99), (1, 20)):
                fake.AXUIElementGetPid = lambda *args: (error, pid)
                with self.assertRaises(LayoutUnavailable):
                    verify_drag_target(10, 20, (500, 600))
            fake.AXUIElementCopyElementAtPosition = lambda *args: (1, None)
            with self.assertRaises(LayoutUnavailable):
                verify_drag_target(10, 20, (500, 600))

    def nodes(self):
        return [
            {'classes': ['monaco-workbench', 'panel-position-bottom'], 'identifier': '', 'bounds': (0, 0, 1200, 1000)},
            {'classes': [], 'identifier': 'workbench.parts.editor', 'bounds': (200, 50, 1200, 600)},
            {'classes': ['xterm-screen'], 'identifier': '', 'bounds': (200, 650, 1200, 990)},
            {'classes': ['monaco-sash', 'horizontal'], 'identifier': '', 'bounds': (200, 598, 1200, 602)},
        ]

    def test_active_terminal_and_existing_sash_are_selected(self):
        geometry = choose_geometry(self.nodes(), (220, 670, 221, 671))
        self.assertEqual(geometry['screen'], (200, 650, 1200, 990))
        self.assertEqual(geometry['sash'], (200, 598, 1200, 602))
        self.assertEqual(geometry['position'], 'bottom')

    def test_split_terminal_uses_focused_screen_only(self):
        nodes = self.nodes()
        nodes.append({'classes': ['xterm-screen'], 'identifier': '', 'bounds': (1220, 650, 1600, 990)})
        self.assertEqual(choose_geometry(nodes, (1300, 670, 1301, 671))['screen'], (1220, 650, 1600, 990))
        with self.assertRaises(LayoutUnavailable):
            choose_geometry(nodes, None)

    def test_missing_native_screen_never_falls_back_to_full_window_for_repl(self):
        with self.assertRaises(LayoutUnavailable):
            choose_geometry([], None)


class MacCapturePipelineTest(unittest.TestCase):
    def capture(self, output, terminal_only=False, moved=False):
        from PIL import Image
        before, after = window(), window(x=101) if moved else window()

        def screenshot(command, **options):
            self.assertEqual(command[:5], ['/usr/sbin/screencapture', '-x', '-o', '-l', '10'])
            Image.new('RGB', (2000, 1600), (20, 120, 220)).save(command[-1])
            return type('Result', (), {'returncode': 0, 'stderr': ''})()

        args = ['capture_macos.py', '--hwnd', '10', '--pid', '20', '--output', str(output), '--format', output.suffix[1:]]
        if terminal_only:
            args.append('--terminal-only')
        with (patch.object(sys, 'argv', args), patch.object(sys, 'platform', 'darwin'),
              patch.object(capture_macos, 'verify_window', side_effect=[before, after]),
              patch.object(capture_macos, 'ensure_on_screen'),
              patch.object(capture_macos.subprocess, 'run', side_effect=screenshot),
              patch('terminal_layout_macos.measure_terminal', return_value={'screen': (200, 600, 1000, 800)}),
              patch('builtins.print')):
            capture_macos.main()

    def test_native_command_pipeline_encodes_all_formats(self):
        from PIL import Image
        with tempfile.TemporaryDirectory() as folder:
            for ext, expected in [('png', 'PNG'), ('jpg', 'JPEG'), ('webp', 'WEBP')]:
                output = Path(folder) / ('한글 결과.' + ext)
                self.capture(output)
                with Image.open(output) as image:
                    self.assertEqual(image.format, expected)
                    self.assertEqual(image.size, (2000, 1600))

    def test_repl_pipeline_crops_to_retina_terminal_only(self):
        from PIL import Image
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'repl.png'
            self.capture(output, terminal_only=True)
            with Image.open(output) as image:
                self.assertEqual(image.size, (1600, 400))

    def test_window_move_during_capture_publishes_nothing(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'must-not-exist.png'
            with self.assertRaises(RuntimeError):
                self.capture(output, moved=True)
            self.assertFalse(output.exists())

    @unittest.skipUnless(sys.platform == 'darwin', 'requires actual macOS framework bindings')
    def test_installed_macos_framework_bindings(self):
        import ApplicationServices as ax
        import AppKit
        import Quartz
        import objc
        value = ax.AXValueCreate(ax.kAXValueTypeCGPoint, (12, 34))
        ok, point = ax.AXValueGetValue(value, ax.kAXValueTypeCGPoint, None)
        self.assertTrue(ok)
        self.assertEqual(tuple(point), (12, 34))
        app = ax.AXUIElementCreateApplication(os.getpid())
        self.assertGreater(objc.pyobjc_id(app), 0)
        self.assertTrue(callable(Quartz.CGGetActiveDisplayList))
        self.assertTrue(callable(Quartz.CGPreflightScreenCaptureAccess))
        self.assertIsNotNone(AppKit.NSWorkspace.sharedWorkspace())


if __name__ == '__main__':
    unittest.main()
