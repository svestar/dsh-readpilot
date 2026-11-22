#!/usr/bin/env python3
"""Regression tests for check_code_paths.py: warnings and hard errors stay distinct."""
import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True


def load_checker():
    spec = importlib.util.spec_from_file_location(
        "check_code_paths_under_test", ROOT / "scripts" / "check_code_paths.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CheckCodePathsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.checker = load_checker()
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "docs" / "features").mkdir(parents=True)
        (self.root / "src").mkdir()
        (self.root / "src" / "sample.ts").write_text("export function target() {}\n", encoding="utf-8")
        (self.root / "src" / "other.ts").write_text("export function other() {}\n", encoding="utf-8")
        self.checker.ROOT = self.root
        self.checker.errors = []
        self.checker.warnings = []

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def feature(self, code: str, mapping: str = "", name: str = "FTR-001-sample.md") -> Path:
        path = self.root / "docs" / "features" / name
        path.write_text(
            f"""# 功能

- **ID：** FTR-001
- **名称：** 示例
- **状态：** active
- **代码：** {code}
- **测试：** `tests/sample.test.ts`

## 行为

行为。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
{mapping}

## 约束与失败行为

无。

## 验收与测试

- 正常路径：示例（`target`）。
""",
            encoding="utf-8",
        )
        return path

    def test_mapping_path_outside_code_field_is_a_warning(self) -> None:
        path = self.feature(
            "`src/sample.ts`（`target`）",
            "| `other` | `src/other.ts:other` | 其他 |",
        )
        self.checker.check_feature(path)
        self.assertEqual(self.checker.errors, [])
        self.assertTrue(any("未登记到代码字段" in warning for warning in self.checker.warnings))

    def test_broken_code_path_is_an_error(self) -> None:
        path = self.feature("`src/missing.ts`")
        self.checker.check_feature(path)
        self.assertTrue(any("代码路径不存在" in error for error in self.checker.errors))

    def test_duplicate_code_path_is_a_warning(self) -> None:
        path = self.feature("`src/sample.ts`；`src/sample.ts`")
        self.checker.check_feature(path)
        self.assertTrue(any("重复" in warning for warning in self.checker.warnings))

    def test_index_drift_is_an_error(self) -> None:
        rows = self.checker.index_rows(
            "| `FTR-001` | 示例 | `docs/features/FTR-001-sample.md` | `src/other.ts` | `tests/sample.test.ts` | active |"
        )
        self.checker.check_index(rows, {"FTR-001": ["src/sample.ts"]})
        self.assertTrue(any("索引不一致" in error for error in self.checker.errors))

    def test_repository_passes_strict(self) -> None:
        env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
        result = subprocess.run(
            [sys.executable, "scripts/check_code_paths.py", "--strict"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=env,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
