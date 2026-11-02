#!/usr/bin/env python3
"""从功能文档头部字段生成 docs/features/index.md。"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEATURE_DIR = ROOT / "docs" / "features"
INDEX = FEATURE_DIR / "index.md"
HEADER = (
    "# 功能索引\n\n"
    "每个功能一行；ID 格式为 `FTR-NNN`，名称不超过 12 字。路径相对仓库根目录，多路径以分号分隔。状态仅用 `active` 或 `deprecated`。\n\n"
    "| ID | 名称 | 文档路径 | 代码路径 | 测试路径 | 状态 |\n"
    "|---|---|---|---|---|---|\n"
)
FIELD_RE = re.compile(r"^\s*-\s*\*\*(ID|名称|状态|代码|测试)：\*\*\s*(.*)$", re.MULTILINE)
SPAN_RE = re.compile(r"`([^`\n]+)`")
REQUIRED_FIELDS = ("ID", "名称", "状态", "代码", "测试")
MAX_NAME_CHARS = 12


def first_path(value):
    for span in SPAN_RE.findall(value):
        if re.search(r"[./]", span):
            return span
    return ""


def parse_feature(path):
    fields = dict(FIELD_RE.findall(path.read_text(encoding="utf-8")))
    missing = [name for name in REQUIRED_FIELDS if not fields.get(name)]
    code = first_path(fields.get("代码", ""))
    test = first_path(fields.get("测试", ""))
    if missing or not code or not test:
        detail = "、".join(missing) or "代码或测试路径"
        raise SystemExit(f"{path.relative_to(ROOT)} 头部字段不完整：{detail}")
    name = fields["名称"].strip()
    if len(name) > MAX_NAME_CHARS or "|" in name:
        raise SystemExit(f"{path.relative_to(ROOT)} 的名称必须为 {MAX_NAME_CHARS} 字内的单行文本")
    return {
        "id": fields["ID"].strip("` "),
        "name": name,
        "doc": path.relative_to(ROOT).as_posix(),
        "code": code,
        "test": test,
        "status": fields["状态"],
    }


def render():
    rows = [parse_feature(path) for path in FEATURE_DIR.glob("FTR-*.md")]
    lines = [
        f"| `{row['id']}` | {row['name']} | `{row['doc']}` | `{row['code']}` | `{row['test']}` | {row['status']} |\n"
        for row in sorted(rows, key=lambda row: row["id"])
    ]
    return HEADER + "".join(lines)


def main():
    content = render()
    if "--check" in sys.argv[1:]:
        current = INDEX.read_text(encoding="utf-8") if INDEX.is_file() else ""
        if current != content:
            print("功能索引与文档头部不一致，请运行：uv run --no-project scripts/gen_feature_index.py", file=sys.stderr)
            return 1
        print("功能索引已是最新。")
        return 0
    INDEX.write_text(content, encoding="utf-8")
    print(f"已生成 docs/features/index.md：{content.count('| `FTR-')} 项。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
