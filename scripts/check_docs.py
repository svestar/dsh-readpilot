#!/usr/bin/env python3
"""Documentation gate for the plugin template.

Beyond headings and length, this gate checks that the facts a feature document
points at exist: every file it cites is on disk, and every acceptance anchor is
defined in the test files that document itself declares. A stale path or a
borrowed anchor is how docs and code drift apart unnoticed.
"""
from pathlib import Path
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
README_MAX = 5000
AGENTS_MAX = 2000
DOC_MAX = 3000
FEATURE_HEADINGS = ("## 行为", "## 接口与代码映射", "## 约束与失败行为", "## 验收与测试")
ADR_HEADINGS = ("## 背景", "## 决策", "## 后果")
INDEX_HEADER = "| ID | 名称 | 文档路径 | 代码路径 | 测试路径 | 状态 |"
ROADMAP_HEADER = "| ID | 功能 | 解决什么问题 | 验收线索 | 优先级 | 排期 | 状态 |"
# Backticked repo-relative file paths, as used by the `代码`/`测试` fields and the index.
PATH_RE = re.compile(r"`((?:[\w.-]+/)*[\w.-]+\.(?:ts|js|mjs|py|md))`")
ANCHOR_RE = re.compile(r"（`([a-z0-9_]+)`）")
errors: list[str] = []


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def check_hygiene(path: Path, text: str) -> None:
    rel = path.relative_to(ROOT).as_posix()
    if not text.endswith("\n") or text.endswith("\n\n"):
        errors.append(f"{rel} 必须恰好一个结尾换行")
    if "\r" in text:
        errors.append(f"{rel} 必须使用 LF 换行")


def check_length(path: Path, limit: int) -> None:
    length = len(read(path))
    if length > limit:
        errors.append(f"{path.relative_to(ROOT).as_posix()} 超长：{length} > {limit}")


def field(text: str, label: str) -> str:
    match = re.search(rf"^- \*\*{label}：\*\*(.*)$", text, re.M)
    return match.group(1) if match else ""


def paths_in(text: str) -> list[str]:
    return PATH_RE.findall(text)


def check_paths(owner: str, text: str) -> list[str]:
    declared = paths_in(text)
    for relative in declared:
        if not (ROOT / relative).is_file():
            errors.append(f"{owner} 引用的文件不存在：{relative}")
    return declared


def check_index_row(line: str) -> None:
    cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
    if len(cells) < 6:
        errors.append(f"功能索引行格式不正确：{line.strip()}")
        return
    for label, cell in (("文档路径", cells[2]), ("代码路径", cells[3]), ("测试路径", cells[4])):
        declared = paths_in(cell)
        if not declared:
            errors.append(f"功能索引 {cells[0]} 缺少{label}")
        for relative in declared:
            if not (ROOT / relative).is_file():
                errors.append(f"功能索引 {cells[0]} 的{label}不存在：{relative}")


def anchor_defined(anchor: str, text: str) -> bool:
    """The anchor must be a real test name or function, not a substring."""
    test = re.search(rf"(?:^|\n)\s*(?:test|it)\(\s*['\"`]{re.escape(anchor)}", text)
    function = re.search(rf"(?:^|\n)\s*(?:async\s+)?function\s+{re.escape(anchor)}\b", text)
    return bool(test or function)


def check_roadmap() -> None:
    path = ROOT / "docs/roadmap.md"
    if not path.is_file():
        errors.append("缺少 docs/roadmap.md")
        return
    text = read(path)
    check_hygiene(path, text)
    if ROADMAP_HEADER not in text:
        errors.append("路线图表头不匹配")
        return
    for line in text.splitlines():
        if line.startswith("| `RDM-"):
            cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
            if len(cells) != 7:
                errors.append(f"路线图行格式不正确：{line.strip()}")


def main() -> int:
    for name in ("README.md", "AGENTS.md", "LICENSE", "docs/features/index.md", "docs/roadmap.md", "docs/quality-gates.md"):
        if not (ROOT / name).is_file():
            errors.append(f"缺少 {name}")
    if errors:
        print("\n".join(errors))
        return 1

    check_length(ROOT / "README.md", README_MAX)
    check_length(ROOT / "AGENTS.md", AGENTS_MAX)
    for path in [ROOT / "README.md", ROOT / "AGENTS.md", *sorted((ROOT / "docs").rglob("*.md"))]:
        if path.is_file():
            check_hygiene(path, read(path))

    features = sorted((ROOT / "docs/features").glob("FTR-*.md"))
    index = ROOT / "docs/features/index.md"
    index_text = read(index)
    if INDEX_HEADER not in index_text:
        errors.append("功能索引表头不匹配")
    check_hygiene(index, index_text)
    for line in index_text.splitlines():
        if line.startswith("| `") and not line.startswith("| `ID"):
            check_index_row(line)

    seen_ids: set[str] = set()
    for path in features:
        name = path.name
        check_length(path, DOC_MAX)
        text = read(path)
        check_hygiene(path, text)
        for heading in FEATURE_HEADINGS:
            if heading not in text:
                errors.append(f"{name} 缺少 {heading}")
        if name not in index_text:
            errors.append(f"{name} 未登记到索引")

        ids = re.findall(r"^- \*\*ID：\*\*\s*(FTR-\d+)", text, re.M)
        if len(ids) != 1:
            errors.append(f"{name} 必须恰好声明一个 FTR ID")
        else:
            feature_id = ids[0]
            if feature_id in seen_ids:
                errors.append(f"FTR ID 重复：{feature_id}")
            seen_ids.add(feature_id)
            if not name.startswith(f"{feature_id}-"):
                errors.append(f"{name} 的文件名不以 {feature_id}- 开头")

        check_paths(name, field(text, "代码"))
        test_files = check_paths(name, field(text, "测试"))
        if not test_files:
            errors.append(f"{name} 的「测试」字段没有声明测试文件")

        acceptance = text.split("## 验收与测试", 1)[-1]
        anchors = ANCHOR_RE.findall(acceptance)
        if not anchors:
            errors.append(f"{name} 验收没有测试锚点")
        searchable = "\n".join(read(ROOT / relative) for relative in test_files if (ROOT / relative).is_file())
        for anchor in anchors:
            if not anchor_defined(anchor, searchable):
                errors.append(f"{name} 的锚点没有在声明的测试文件中定义：{anchor}")

    for path in sorted((ROOT / "docs/decisions").glob("ADR-*.md")):
        check_length(path, DOC_MAX)
        text = read(path)
        check_hygiene(path, text)
        for heading in ADR_HEADINGS:
            if heading not in text:
                errors.append(f"{path.name} 缺少 {heading}")
        check_paths(path.name, field(text, "代码"))

    check_roadmap()

    if errors:
        print("文档检查失败：")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    print(f"文档检查通过：{len(features)} 个 FTR")
    return 0


if __name__ == "__main__":
    sys.exit(main())
