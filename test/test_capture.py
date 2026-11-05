import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("capture", Path(__file__).resolve().parents[1] / "python" / "capture.py")
capture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(capture)


class CursorOverlayTest(unittest.TestCase):
    def test_identifies_known_click_through_indicator(self):
        self.assertTrue(capture.is_cursor_overlay("CodexComputerUseCursorOverlay", 0x080800A8))

    def test_other_app_windows_are_never_exempt(self):
        for name in ("Chrome_WidgetWin_1", "Notepad", "tooltips_class32", ""):
            self.assertFalse(capture.is_cursor_overlay(name, 0x080800A8))

    def test_matching_name_requires_all_decorative_window_flags(self):
        required = 0x08080020
        for flag in (0x08000000, 0x00080000, 0x00000020):
            self.assertFalse(capture.is_cursor_overlay("CodexComputerUseCursorOverlay", required & ~flag))


if __name__ == "__main__":
    unittest.main()
