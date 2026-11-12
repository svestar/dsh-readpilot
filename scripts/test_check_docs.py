#!/usr/bin/env python3
"""回归测试 check_docs.py：每条校验路径都必须能拒绝一个非法输入。"""
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECKER = "scripts/check_docs.py"
GENERATOR = "scripts/gen_feature_index.py"
FIXTURE_FILES = (
    "AGENTS.md",
    "docs/README.md",
    "docs/quality-gates.md",
    "docs/roadmap.md",
    "docs/decisions/README.md",
    "docs/templates/adr.md",
    "docs/templates/feature.md",
    "scripts/check_docs.py",
    "scripts/gen_feature_index.py",
)


def run_script(root, *args):
    result = subprocess.run(
        [sys.executable, *args],
        cwd=root,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env={**os.environ, "PYTHONIOENCODING": "utf-8"},
    )
    return result.returncode, result.stdout + result.stderr


def build_fixture():
    tmp = tempfile.TemporaryDirectory()
    root = Path(tmp.name)
    for rel_path in FIXTURE_FILES:
        target = root / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / rel_path, target)
    # Tests append their own RDM rows; the real roadmap may already use those IDs.
    roadmap = root / "docs" / "roadmap.md"
    roadmap.write_text(
        "\n".join(line for line in roadmap.read_text(encoding="utf-8").splitlines() if not line.strip().startswith("| RDM-")) + "\n",
        encoding="utf-8",
    )
    (root / "docs" / "features").mkdir(parents=True, exist_ok=True)
    code, output = run_script(root, GENERATOR)
    if code != 0:
        raise RuntimeError(f"无法在测试夹具中生成索引：{output}")
    return tmp, root


class CheckDocsGateTest(unittest.TestCase):
    """在临时迷你仓库上运行真实门禁脚本。"""

    def setUp(self):
        self._tmp, self.root = build_fixture()

    def tearDown(self):
        self._tmp.cleanup()

    def run_checker(self):
        return run_script(self.root, CHECKER)

    def assert_rejected(self, message):
        code, output = self.run_checker()
        self.assertEqual(code, 1, f"应失败却通过：\n{output}")
        self.assertIn(message, output)

    def append_index_row(self, row):
        path = self.root / "docs" / "features" / "index.md"
        path.write_text(path.read_text(encoding="utf-8").rstrip() + "\n" + row + "\n", encoding="utf-8")

    def write_feature(self, min_chars, acceptance="- 调用后返回 0（`test_ok`）。\n"):
        (self.root / "src").mkdir(parents=True, exist_ok=True)
        (self.root / "tests").mkdir(parents=True, exist_ok=True)
        (self.root / "src" / "app.py").write_text("def main():\n    return 0\n", encoding="utf-8")
        (self.root / "tests" / "test_app.py").write_text("def test_ok():\n    assert True\n", encoding="utf-8")
        content = (
            "# 演示功能\n\n"
            "- **ID：** FTR-002\n"
            "- **名称：** 演示功能\n"
            "- **状态：** active\n"
            "- **代码：** `src/app.py`\n"
            "- **测试：** `tests/test_app.py`\n\n"
            "## 行为\n\n"
            "## 接口与代码映射\n\n"
            "| 入口/符号 | 位置 | 职责 |\n|---|---|---|\n| main | `src/app.py:main` | 返回 0 |\n\n"
            "## 约束与失败行为\n\n无。\n\n"
            "## 验收与测试\n\n" + acceptance
        )
        if len(content) < min_chars:
            padding = "补充说明。" * ((min_chars - len(content)) // 5 + 1)
            content = content.replace("## 行为\n\n", "## 行为\n\n" + padding + "\n\n", 1)
        (self.root / "docs" / "features" / "FTR-002.md").write_text(content.rstrip("\n") + "\n", encoding="utf-8")
        self.append_index_row("| FTR-002 | 演示功能 | docs/features/FTR-002.md | src/app.py | tests/test_app.py | active |")

    def append_roadmap_row(self, row):
        path = self.root / "docs" / "roadmap.md"
        path.write_text(path.read_text(encoding="utf-8").rstrip() + "\n" + row + "\n", encoding="utf-8")

    def write_adr(self, number, status="accepted", successor=None, sections=True):
        content = f"# ADR-{number}：演示决策\n\n- **状态：** {status}\n- **日期：** 2026-01-01\n"
        if successor:
            content += f"- **取代者：** {successor}\n"
        if sections:
            content += "\n## 背景\n\n演示背景。\n\n## 决策\n\n演示决策。\n\n## 后果\n\n演示后果。\n"
        (self.root / "docs" / "decisions" / f"ADR-{number}-demo.md").write_text(content, encoding="utf-8")

    def test_rejects_bad_index_header(self):
        path = self.root / "docs" / "features" / "index.md"
        text = path.read_text(encoding="utf-8").replace("| ID |", "| 功能 ID |", 1)
        path.write_text(text, encoding="utf-8")
        self.assert_rejected("缺少功能索引表头")

    def test_rejects_index_row_with_missing_column(self):
        self.append_index_row("| FTR-001 | docs/features/FTR-001.md | src/app.py | tests/test_app.py |")
        self.assert_rejected("索引行缺少列")

    def test_rejects_bad_roadmap_header(self):
        path = self.root / "docs" / "roadmap.md"
        text = path.read_text(encoding="utf-8").replace("| 优先级 |", "| 优先 |", 1)
        path.write_text(text, encoding="utf-8")
        self.assert_rejected("路线图表头必须为")

    def test_rejects_roadmap_row_with_missing_column(self):
        self.append_roadmap_row("| RDM-999 | 演示 | 问题 | 结果 | P1 | next |")
        self.assert_rejected("路线图行缺少列")

    def test_rejects_unknown_roadmap_priority(self):
        self.append_roadmap_row("| RDM-999 | 演示 | 问题 | 结果 | P9 | next | candidate |")
        self.assert_rejected("的优先级必须为")

    def test_rejects_unknown_roadmap_status(self):
        self.append_roadmap_row("| RDM-999 | 演示 | 问题 | 结果 | P1 | next | done |")
        self.assert_rejected("的状态必须为")

    def test_rejects_roadmap_with_absolute_date(self):
        self.append_roadmap_row("| RDM-999 | 演示 | 问题 | 结果 | P1 | 2026-12-01 | candidate |")
        self.assert_rejected("不写具体日期")

    def test_rejects_duplicate_roadmap_id(self):
        self.append_roadmap_row("| RDM-001 | 演示 | 问题 | 结果 | P1 | next | candidate |")
        self.append_roadmap_row("| RDM-001 | 演示二 | 问题 | 结果 | P1 | next | candidate |")
        self.assert_rejected("路线图 ID 重复：RDM-001")

    def test_accepts_valid_roadmap_item(self):
        self.append_roadmap_row("| RDM-001 | 演示 | 问题 | 结果 | P1 | next | candidate |")
        code, output = self.run_checker()
        self.assertEqual(code, 0, output)

    def test_rejects_bad_adr_name(self):
        (self.root / "docs" / "decisions" / "note.md").write_text("# ADR-001：演示\n", encoding="utf-8")
        self.assert_rejected("ADR 文件名必须为")

    def test_rejects_unknown_adr_status(self):
        path = self.root / "docs" / "decisions" / "ADR-001-demo.md"
        path.write_text("# ADR-001：演示\n\n- **状态：** active\n", encoding="utf-8")
        self.assert_rejected("的状态必须为")

    def test_rejects_placeholder_in_adr(self):
        path = self.root / "docs" / "decisions" / "ADR-002-demo.md"
        path.write_text("# ADR-NNN：演示\n\n- **状态：** proposed\n", encoding="utf-8")
        self.assert_rejected("残留模板占位符：ADR-NNN")

    def test_rejects_oversized_rule_document(self):
        path = self.root / "AGENTS.md"
        path.write_text(path.read_text(encoding="utf-8") + "x" * 600, encoding="utf-8")
        self.assert_rejected("超长：AGENTS.md")

    def test_readme_limit_is_2000(self):
        path = self.root / "README.md"
        path.write_text("# README\n" + "x" * 1990 + "\n", encoding="utf-8")
        code, output = self.run_checker()
        self.assertEqual(code, 0, output)
        path.write_text("# README\n" + "x" * 1991 + "\n", encoding="utf-8")
        self.assert_rejected("上限 2000")

    def test_usage_limit_is_3000(self):
        path = self.root / "USAGE.md"
        path.write_text("# USAGE\n" + "x" * 2990 + "\n", encoding="utf-8")
        code, output = self.run_checker()
        self.assertEqual(code, 0, output)
        path.write_text("# USAGE\n" + "x" * 2992 + "\n", encoding="utf-8")
        self.assert_rejected("上限 3000")

    def test_changelog_limit_is_3000(self):
        path = self.root / "CHANGELOG.md"
        path.write_text("# Changelog\n" + "x" * 2987 + "\n", encoding="utf-8")
        code, output = self.run_checker()
        self.assertEqual(code, 0, output)
        path.write_text("# Changelog\n" + "x" * 2990 + "\n", encoding="utf-8")
        self.assert_rejected("上限 3000")

    def test_accepts_feature_document_within_limit(self):
        self.write_feature(2000)
        code, output = self.run_checker()
        self.assertEqual(code, 0, output)

    def test_rejects_oversized_feature_document(self):
        self.write_feature(3500)
        self.assert_rejected("上限 3000")

    def test_rejects_acceptance_without_symbol(self):
        self.write_feature(1000, acceptance="- 调用后返回 0。\n")
        self.assert_rejected("验收条目未锚定测试符号")

    def test_rejects_one_unanchored_acceptance_entry(self):
        self.write_feature(1000, acceptance="- 调用后返回 0（`test_ok`）。\n- 界面上看过了。\n")
        self.assert_rejected("验收条目未锚定测试符号：界面上看过了")

    def test_rejects_feature_without_mapping_entry(self):
        self.write_feature(1000)
        path = self.root / "docs" / "features" / "FTR-002.md"
        path.write_text(
            path.read_text(encoding="utf-8").replace("| main | `src/app.py:main` | 返回 0 |\n", ""),
            encoding="utf-8",
        )
        self.assert_rejected("接口映射章节没有")

    def test_rejects_change_narration(self):
        self.write_feature(1000)
        path = self.root / "docs" / "features" / "FTR-002.md"
        path.write_text(path.read_text(encoding="utf-8") + "\n本次修改调整了行为。\n", encoding="utf-8")
        self.assert_rejected("叙述了改动过程")

    def test_rejects_adr_without_required_sections(self):
        self.write_adr("001", sections=False)
        self.assert_rejected("缺少章节：## 后果")

    def test_rejects_superseded_adr_without_successor(self):
        self.write_adr("001", status="superseded")
        self.assert_rejected("未写取代者")

    def test_rejects_superseded_adr_with_missing_successor(self):
        self.write_adr("001", status="superseded", successor="ADR-002")
        self.assert_rejected("取代者不存在：ADR-002")

    def test_rejects_feature_referencing_superseded_adr(self):
        self.write_adr("001", status="superseded", successor="ADR-002")
        self.write_adr("002")
        self.write_feature(1000)
        path = self.root / "docs" / "features" / "FTR-002.md"
        path.write_text(path.read_text(encoding="utf-8") + "\n约束见 ADR-001。\n", encoding="utf-8")
        self.assert_rejected("引用了已取代的 ADR-001")

    def test_rejects_reused_acceptance_anchor(self):
        self.write_feature(1000, acceptance="- 调用后返回 0（`test_ok`）。\n- 再次调用后返回 0（`test_ok`）。\n")
        self.assert_rejected("验收重复使用同一测试符号：test_ok")

    def test_rejects_prefix_only_acceptance_symbol(self):
        self.write_feature(1000, acceptance="- 调用后返回 0（`test_ok`）。\n")
        (self.root / "tests" / "test_app.py").write_text("def test_ok_extra():\n    assert True\n", encoding="utf-8")
        self.assert_rejected("验收条目未锚定测试符号")

    def test_rejects_prefix_only_mapped_symbol(self):
        self.write_feature(1000)
        (self.root / "src" / "app.py").write_text("def main_extra():\n    return 0\n", encoding="utf-8")
        self.assert_rejected("映射的符号不存在：src/app.py:main")

    def test_rejects_missing_mapped_symbol(self):
        self.write_feature(1000)
        path = self.root / "docs" / "features" / "FTR-002.md"
        path.write_text(path.read_text(encoding="utf-8").replace("src/app.py:main", "src/app.py:missing"), encoding="utf-8")
        self.assert_rejected("映射的符号不存在：src/app.py:missing")

    def test_rejects_unknown_acceptance_symbol(self):
        self.write_feature(1000, acceptance="- 调用后返回 0（`test_missing`）。\n")
        self.assert_rejected("验收条目未锚定测试符号")

    def test_rejects_anchor_outside_trailing_group(self):
        self.write_feature(1000, acceptance="- 调用 `test_ok` 后返回 0。\n")
        self.assert_rejected("验收条目未锚定测试符号")

    def test_rejects_bom(self):
        path = self.root / "AGENTS.md"
        path.write_text("\ufeff" + path.read_text(encoding="utf-8"), encoding="utf-8")
        self.assert_rejected("含 BOM")

    def test_rejects_missing_final_newline(self):
        path = self.root / "AGENTS.md"
        path.write_text(path.read_text(encoding="utf-8").rstrip("\n"), encoding="utf-8")
        self.assert_rejected("必须以恰好一个换行结尾")

    def test_rejects_trailing_whitespace(self):
        path = self.root / "AGENTS.md"
        path.write_text(path.read_text(encoding="utf-8").rstrip("\n") + " \n", encoding="utf-8")
        self.assert_rejected("行尾有多余空白")

    def test_rejects_wrapped_paragraph(self):
        path = self.root / "AGENTS.md"
        text = path.read_text(encoding="utf-8")
        path.write_text(text.replace("每个事实只写一处，其余位置只放链接。", "每个事实只写一处，\n其余位置只放链接。"), encoding="utf-8")
        self.assert_rejected("段落内存在物理折行")


class RepositoryGateTest(unittest.TestCase):
    """直接校验当前仓库：门禁通过且索引新鲜。"""

    def test_repository_passes(self):
        code, output = run_script(ROOT, CHECKER)
        self.assertEqual(code, 0, output)

    def test_index_matches_feature_documents(self):
        code, output = run_script(ROOT, GENERATOR, "--check")
        self.assertEqual(code, 0, output)


class FeatureIndexGeneratorTest(unittest.TestCase):
    def setUp(self):
        self._tmp, self.root = build_fixture()

    def tearDown(self):
        self._tmp.cleanup()

    def test_rejects_overlong_feature_name(self):
        path = self.root / "docs" / "features" / "FTR-002.md"
        path.write_text(
            "# 演示功能\n\n"
            "- **ID：** FTR-002\n"
            "- **名称：** 名称超长的功能用来测试长度上限\n"
            "- **状态：** active\n"
            "- **代码：** `src/app.py`\n"
            "- **测试：** `tests/test_app.py`\n",
            encoding="utf-8",
        )
        code, output = run_script(self.root, GENERATOR)
        self.assertEqual(code, 1, output)
        self.assertIn("的名称必须为 12 字内", output)

    def test_check_rejects_stale_index(self):
        path = self.root / "docs" / "features" / "index.md"
        lines = path.read_text(encoding="utf-8").splitlines()
        path.write_text("\n".join(lines[:-1]) + "\n", encoding="utf-8")
        code, output = run_script(self.root, GENERATOR, "--check")
        self.assertEqual(code, 1, output)
        self.assertIn("不一致", output)


if __name__ == "__main__":
    unittest.main(verbosity=2)
