#!/usr/bin/env python3
"""Validate Markdown length, the feature registry, and ADR records."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
MAX_CHARS = 1500
FEATURE_DOC_MAX_CHARS = 3000
MAX_FEATURE_ENTRIES = 200
UNLIMITED_PATHS = {"docs/features/index.md"}
UNLIMITED_PREFIXES = ("docs/templates/",)
FEATURE_INDEX = ROOT / "docs" / "features" / "index.md"
FEATURE_DIR = ROOT / "docs" / "features"
DECISIONS_DIR = ROOT / "docs" / "decisions"
REQUIRED_HEADINGS = ("## 行为", "## 接口与代码映射", "## 约束与失败行为", "## 验收与测试")
INDEX_HEADER = ("ID", "名称", "文档路径", "代码路径", "测试路径", "状态")
FEATURE_STATUSES = {"active", "deprecated"}
ADR_STATUSES = {"proposed", "accepted", "superseded"}
PLACEHOLDERS = ("[功能名称]", "[真实名称]", "[简述]", "FTR-NNN", "ADR-NNN", "YYYY-MM-DD")
ID_RE = re.compile(r"^FTR-\d{3,}$")
SYMBOL_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*")
MAPPING_RE = re.compile(r"`([^`\n:]+):([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)`")
ADR_NAME_RE = re.compile(r"^ADR-(\d{3,})-[a-z0-9-]+\.md$")
IGNORED_DIRS = {".git", ".venv", "venv", "node_modules", "dist", "build", "__pycache__"}


def markdown_files():
    return [p for p in ROOT.rglob("*.md") if not any(part in IGNORED_DIRS for part in p.relative_to(ROOT).parts)]


def char_limit(rel_path):
    posix = rel_path.as_posix()
    if posix in UNLIMITED_PATHS or posix.startswith(UNLIMITED_PREFIXES):
        return None
    if posix.startswith(("docs/features/", "docs/decisions/")):
        return FEATURE_DOC_MAX_CHARS
    return MAX_CHARS


def table_cells(line):
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def parse_feature_rows(text, errors):
    lines = text.splitlines()
    for index, line in enumerate(lines):
        cells = table_cells(line)
        if len(cells) < 2 or cells[0] != "ID":
            continue
        if tuple(cells[: len(INDEX_HEADER)]) != INDEX_HEADER:
            errors.append("功能索引表头必须为：" + " | ".join(INDEX_HEADER))
            return []
        rows = []
        for row_line in lines[index + 2 :]:
            if not row_line.strip().startswith("|"):
                break
            row = table_cells(row_line)
            if len(row) < len(INDEX_HEADER):
                errors.append(f"索引行缺少列：{row_line.strip()}")
                continue
            feature_id = row[0].strip("` ")
            if ID_RE.fullmatch(feature_id):
                rows.append((feature_id, *(cell.strip("` ") for cell in row[1 : len(INDEX_HEADER)])))
        return rows
    errors.append("缺少功能索引表头：" + " | ".join(INDEX_HEADER))
    return []


def paths_from_cell(cell):
    return [part.strip().strip("`") for part in cell.split(";") if part.strip() and part.strip() != "-"]


def paragraph_breaks(text):
    breaks = []
    run = 0
    inside_code = False
    for number, line in enumerate(text.splitlines(), 1):
        stripped = line.strip()
        if stripped.startswith("```"):
            inside_code = not inside_code
            run = 0
            continue
        if inside_code or not stripped or line[:1] in (" ", "\t"):
            run = 0
            continue
        if stripped.startswith(("#", "|", "-", "*", ">", "+")) or re.match(r"^\d+[.)]", stripped):
            run = 0
            continue
        run += 1
        if run > 1:
            breaks.append(number)
    return breaks


def check_markdown_hygiene(rel_path, text, errors):
    if text.startswith("\ufeff"):
        errors.append(f"{rel_path} 含 BOM")
    if not text.endswith("\n") or text.endswith("\n\n"):
        errors.append(f"{rel_path} 必须以恰好一个换行结尾")
    for number, line in enumerate(text.splitlines(), 1):
        if line != line.rstrip():
            errors.append(f"{rel_path}:{number} 行尾有多余空白")
    for number in paragraph_breaks(text):
        errors.append(f"{rel_path}:{number} 段落内存在物理折行")


def report_placeholders(path, content, errors):
    for token in PLACEHOLDERS:
        if token in content:
            errors.append(f"{path.relative_to(ROOT)} 残留模板占位符：{token}")


def acceptance_symbols(content):
    marker = "## 验收与测试"
    if marker not in content:
        return []
    body = content.split(marker, 1)[1].split("\n## ", 1)[0]
    return [item for item in re.findall(r"`([^`\n]+)`", body) if SYMBOL_RE.fullmatch(item)]


def check_symbol_mappings(doc_path, content, errors):
    rel_doc = doc_path.relative_to(ROOT)
    for rel_path, symbol in MAPPING_RE.findall(content):
        target = ROOT / rel_path
        if not target.is_file():
            errors.append(f"{rel_doc} 映射的路径不存在：{rel_path}")
            continue
        text = target.read_text(encoding="utf-8")
        if any(part not in text for part in symbol.split(".")):
            errors.append(f"{rel_doc} 映射的符号不存在：{rel_path}:{symbol}")


def adr_status(content):
    match = re.search(r"\*\*状态：\*\*\s*([a-z]+)", content)
    return match.group(1) if match else None


def check_decision_records(errors):
    if not DECISIONS_DIR.is_dir():
        errors.append("缺少 docs/decisions 目录")
        return 0
    ids = []
    for path in sorted(DECISIONS_DIR.glob("*.md")):
        if path.name == "README.md":
            continue
        match = ADR_NAME_RE.fullmatch(path.name)
        if not match:
            errors.append(f"ADR 文件名必须为 ADR-NNN-short-title.md：{path.name}")
            continue
        adr_id = f"ADR-{match.group(1)}"
        ids.append(adr_id)
        content = path.read_text(encoding="utf-8")
        if adr_id not in content:
            errors.append(f"{path.name} 未包含编号 {adr_id}")
        if adr_status(content) not in ADR_STATUSES:
            errors.append(f"{path.name} 的状态必须为 " + " / ".join(sorted(ADR_STATUSES)))
        report_placeholders(path, content, errors)
    for duplicated in sorted({item for item in ids if ids.count(item) > 1}):
        errors.append(f"ADR 编号重复：{duplicated}")
    return len(ids)


def main():
    errors = []
    for path in markdown_files():
        rel_path = path.relative_to(ROOT)
        text = path.read_text(encoding="utf-8")
        limit = char_limit(rel_path)
        if limit is not None and len(text) > limit:
            errors.append(f"超长：{rel_path} = {len(text)} 字符（上限 {limit}）")
        check_markdown_hygiene(rel_path, text, errors)

    if not FEATURE_INDEX.exists():
        errors.append("缺少 docs/features/index.md")
        rows = []
    else:
        rows = parse_feature_rows(FEATURE_INDEX.read_text(encoding="utf-8"), errors)

    ids = [row[0] for row in rows]
    if len(rows) > MAX_FEATURE_ENTRIES:
        errors.append(f"功能索引条目过多：{len(rows)} 项（上限 {MAX_FEATURE_ENTRIES}）")
    for feature_id in sorted({item for item in ids if ids.count(item) > 1}):
        errors.append(f"功能 ID 重复：{feature_id}")

    indexed_docs = set()
    for feature_id, name, doc_cell, source_cell, test_cell, status in rows:
        if not name:
            errors.append(f"{feature_id} 未登记名称")
        docs = paths_from_cell(doc_cell)
        sources = paths_from_cell(source_cell)
        tests = paths_from_cell(test_cell)
        if len(docs) != 1:
            errors.append(f"{feature_id} 必须且只能有一个功能文档路径")
            continue
        doc_path = ROOT / docs[0]
        indexed_docs.add(doc_path.resolve())
        if not doc_path.is_file():
            errors.append(f"{feature_id} 文档不存在：{docs[0]}")
            continue
        content = doc_path.read_text(encoding="utf-8")
        report_placeholders(doc_path, content, errors)
        if feature_id not in content:
            errors.append(f"{docs[0]} 未包含功能 ID {feature_id}")
        for heading in REQUIRED_HEADINGS:
            if heading not in content:
                errors.append(f"{docs[0]} 缺少章节：{heading}")
        for label, paths in (("代码", sources), ("测试", tests)):
            if not paths:
                errors.append(f"{feature_id} 未登记{label}路径")
            for rel_path in paths:
                if not (ROOT / rel_path).exists():
                    errors.append(f"{feature_id} 的{label}路径不存在：{rel_path}")
                if rel_path not in content:
                    errors.append(f"{docs[0]} 未映射{label}路径：{rel_path}")
        check_symbol_mappings(doc_path, content, errors)
        symbols = acceptance_symbols(content)
        if not symbols:
            errors.append(f"{docs[0]} 的验收章节未锚定测试符号")
        else:
            test_texts = [
                (ROOT / rel_path).read_text(encoding="utf-8")
                for rel_path in tests
                if (ROOT / rel_path).is_file()
            ]
            for symbol in symbols:
                if not any(symbol in text for text in test_texts):
                    errors.append(f"{docs[0]} 的测试符号不存在：{symbol}")
        if status not in FEATURE_STATUSES:
            errors.append(f"{feature_id} 状态必须为 " + " / ".join(sorted(FEATURE_STATUSES)))

    if FEATURE_DIR.is_dir():
        for doc_path in FEATURE_DIR.glob("FTR-*.md"):
            if doc_path.resolve() not in indexed_docs:
                errors.append(f"功能文档未登记到索引：{doc_path.relative_to(ROOT)}")

    adr_count = check_decision_records(errors)

    if errors:
        print("文档检查失败：", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"文档检查通过：Markdown 长度合规，索引功能 {len(rows)} 项，ADR {adr_count} 项。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
