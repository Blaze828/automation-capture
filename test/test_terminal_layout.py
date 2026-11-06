import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("terminal_layout", Path(__file__).resolve().parents[1] / "runtime" / "terminal_layout.py")
layout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(layout)


class TerminalLayoutTest(unittest.TestCase):
    screen = (200, 650, 1100, 990)
    editor = (200, 40, 1100, 600)
    sash = (200, 598, 1100, 602)

    def test_fitting_output_never_changes_user_height(self):
        for output_rows in (0, 3, 19, 20):
            self.assertIsNone(layout.plan_resize("bottom", self.screen, self.editor, self.sash, 20, output_rows))

    def test_overflow_has_one_target_with_proportional_bottom_margin(self):
        plan = layout.plan_resize("bottom", self.screen, self.editor, self.sash, 20, 25)
        self.assertEqual(plan["start"], [650, 600])
        self.assertEqual(plan["paddingRows"], 3)
        self.assertEqual(plan["end"], [650, 464])  # Eight additional rows, 17 px each.

    def test_huge_output_leaves_room_for_editor_instead_of_repeated_adjustments(self):
        plan = layout.plan_resize("bottom", self.screen, self.editor, self.sash, 20, 500)
        self.assertEqual(plan["paddingRows"], 5)
        self.assertEqual(plan["end"][1], self.editor[1] + 160)

    def test_top_panel_grows_down_without_changing_position(self):
        plan = layout.plan_resize("top", self.screen, self.editor, self.sash, 20, 25)
        self.assertEqual(plan["end"], [650, 736])

    def test_side_panel_keeps_its_position_and_uses_pages_when_too_long(self):
        for position in ("left", "right"):
            self.assertIsNone(layout.plan_resize(position, self.screen, self.editor, self.sash, 20, 80))

    def test_editor_at_minimum_size_is_not_moved_again(self):
        editor = (200, 40, 1100, 180)
        self.assertIsNone(layout.plan_resize("bottom", self.screen, editor, self.sash, 20, 50))


if __name__ == "__main__":
    unittest.main()
