import importlib.util
from pathlib import Path
import unittest
import tempfile

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


class ImageFormatTest(unittest.TestCase):
    def test_saves_real_png_jpeg_and_lossless_webp(self):
        from PIL import Image
        rgb = bytes([20, 120, 220] * 64 * 32)
        with tempfile.TemporaryDirectory() as directory:
            for extension, expected in (("png", "PNG"), ("jpg", "JPEG"), ("webp", "WEBP")):
                with self.subTest(format=extension):
                    output = Path(directory) / f"한글 결과.{extension}"
                    capture.save_capture(rgb, (64, 32), str(output), extension)
                    with Image.open(output) as image:
                        self.assertEqual(image.format, expected)
                        self.assertEqual(image.size, (64, 32))
                        self.assertEqual(image.mode, "RGB")
                        if extension != "jpg":
                            self.assertEqual(image.tobytes(), rgb)
                        else:
                            self.assertTrue(all(abs(a - b) <= 2 for a, b in zip(image.getpixel((32, 16)), (20, 120, 220))))


if __name__ == "__main__":
    unittest.main()
