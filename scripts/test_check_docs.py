#!/usr/bin/env python3
"""Regression tests for check_docs.py: each check must reject a bad input."""
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
        "check_docs_under_test", ROOT / "scripts" / "check_docs.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CheckDocsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.checker = load_checker()
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "src").mkdir()
        (self.root / "src" / "sample.ts").write_text(
            "export function targetSymbol() {}\n", encoding="utf-8"
        )
        self.checker.ROOT = self.root
        self.checker.errors = []

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def errors(self) -> list[str]:
        return self.checker.errors

    def test_repository_passes(self) -> None:
        env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
        result = subprocess.run(
            [sys.executable, "scripts/check_docs.py"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=env,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_literal_table_separator_is_rejected(self) -> None:
        path = self.root / "AGENTS.md"
        self.checker.check_hygiene(path, "| a |`n| b |\n")
        self.assertTrue(any("|`n|" in error for error in self.errors()))

    def test_real_table_is_accepted(self) -> None:
        path = self.root / "AGENTS.md"
        self.checker.check_hygiene(path, "| a |\n| b |\n")
        self.assertEqual(self.errors(), [])

    def test_mapping_reference_is_validated(self) -> None:
        self.checker.check_mapping_refs(
            "doc", "| `x` | `src/sample.ts:targetSymbol` | ok |"
        )
        self.assertEqual(self.errors(), [])

        self.checker.errors = []
        self.checker.check_mapping_refs("doc", "`src/sample.ts:missingSymbol`")
        self.assertTrue(any("映射符号不存在" in error for error in self.errors()))

        self.checker.errors = []
        self.checker.check_mapping_refs("doc", "`src/missing.ts:targetSymbol`")
        self.assertTrue(any("映射路径不存在" in error for error in self.errors()))

    def test_mapping_ignores_globs_and_directories(self) -> None:
        self.checker.check_mapping_refs(
            "doc", "`src/**/*.ts:targetSymbol` `src/client/:Thing`"
        )
        self.assertEqual(self.errors(), [])

    def test_narration_is_rejected(self) -> None:
        self.checker.check_narration("doc", "本次修改了实现。")
        self.assertTrue(any("叙述了改动过程" in error for error in self.errors()))

    def test_narration_is_accepted(self) -> None:
        self.checker.check_narration("doc", "阅读器保存进度。")
        self.assertEqual(self.errors(), [])


if __name__ == "__main__":
    unittest.main()
