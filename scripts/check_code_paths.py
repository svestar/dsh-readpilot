#!/usr/bin/env python3
"""Validate feature code-path declarations and print the inventory.

Default mode fails only on broken declarations (missing paths, index drift).
Mapping tables may reference implementation files that the code field omits;
those are reported as warnings so existing docs stay valid. `--strict` turns
them into failures and can be used while tightening a feature.

The gate also compares the symbol annotations repeated by the index with each
FTR's code field, so a path can stay consistent while its symbols drift.
Symbol existence (text-level) and test anchors stay in check_docs.py.
"""
from collections import defaultdict
from pathlib import Path
import argparse
import json
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
PATH_RE = re.compile(r"`((?:[\w.-]+/)*[\w.-]+\.(?:ts|js|mjs|py|md|css|json|yml|yaml))`")
MAPPING_RE = re.compile(
    r"`([^`\n:]+):([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)`"
)
ANNOTATION_RE = re.compile(r"`([^`]+\.(?:ts|js|mjs|py|md|css|json|yml|yaml))`（([^）]*)）")
SYMBOL_RE = re.compile(r"`([^`]+)`")
FILE_SUFFIXES = (".ts", ".js", ".mjs", ".py", ".md", ".css", ".json", ".yml", ".yaml")
ID_RE = re.compile(r"^- \*\*ID：\*\*\s*(FTR-\d+)", re.M)
errors: list[str] = []
warnings: list[str] = []


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def field(text: str, label: str) -> str:
    match = re.search(rf"^- \*\*{label}：\*\*(.*)$", text, re.M)
    return match.group(1) if match else ""


def code_paths(text: str) -> list[str]:
    return PATH_RE.findall(field(text, "代码"))


def annotations_in(text: str) -> dict[str, set[str]]:
    """Symbols declared in ``path``（``symbol``…） annotations."""
    annotations: dict[str, set[str]] = {}
    for relative, inner in ANNOTATION_RE.findall(text):
        symbols = {
            symbol
            for symbol in SYMBOL_RE.findall(inner)
            if not symbol.endswith(FILE_SUFFIXES)
        }
        annotations.setdefault(relative, set()).update(symbols)
    return annotations


def code_annotations(text: str) -> dict[str, set[str]]:
    return annotations_in(field(text, "代码"))


def mapping_paths(text: str) -> list[str]:
    """Backticked `path:symbol` references that should be reachable from the code field."""
    section = text.split("## 接口与代码映射", 1)[-1].split("## ", 1)[0]
    return [
        path
        for path, _ in MAPPING_RE.findall(section)
        if path.startswith("src/") or path == "index.ts"
    ]


def index_rows(text: str) -> dict[str, list[str]]:
    rows: dict[str, list[str]] = {}
    for line in text.splitlines():
        if not line.startswith("| `FTR-"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) >= 6:
            rows[cells[0].strip("`")] = cells
    return rows


def check_feature(path: Path) -> tuple[str, list[str], dict[str, set[str]]]:
    text = read(path)
    matched = ID_RE.search(text)
    feature_id = matched.group(1) if matched else path.name.split("-", 2)[0]
    declared = code_paths(text)
    duplicates = sorted({item for item in declared if declared.count(item) > 1})
    if duplicates:
        warnings.append(f"{path.name} 的代码字段重复：{'、'.join(duplicates)}")
    for relative in declared:
        if not (ROOT / relative).is_file():
            errors.append(f"{path.name} 的代码路径不存在：{relative}")
    for relative in mapping_paths(text):
        if relative not in declared:
            warnings.append(f"{path.name} 的映射路径未登记到代码字段：{relative}")
    return feature_id, declared, code_annotations(text)


def check_index(
    rows: dict[str, list[str]],
    by_feature: dict[str, list[str]],
    annotations: dict[str, dict[str, set[str]]],
) -> None:
    for feature_id, declared in by_feature.items():
        row = rows.get(feature_id)
        if row is None:
            errors.append(f"{feature_id} 未出现在 docs/features/index.md")
            continue
        indexed = set(PATH_RE.findall(row[3]))
        if indexed != set(declared):
            missing = sorted(indexed - set(declared))
            extra = sorted(set(declared) - indexed)
            detail = []
            if missing:
                detail.append(f"索引多出：{'、'.join(missing)}")
            if extra:
                detail.append(f"代码字段多出：{'、'.join(extra)}")
            errors.append(f"{feature_id} 的代码路径与索引不一致（{'；'.join(detail)}）")
        indexed_symbols = annotations_in(row[3])
        declared_symbols = annotations.get(feature_id, {})
        for relative in sorted(indexed & set(declared)):
            index_set = indexed_symbols.get(relative, set())
            doc_set = declared_symbols.get(relative, set())
            if index_set == doc_set:
                continue
            detail = []
            missing = sorted(index_set - doc_set)
            extra = sorted(doc_set - index_set)
            if missing:
                detail.append(f"索引多出：{'、'.join(missing)}")
            if extra:
                detail.append(f"代码字段多出：{'、'.join(extra)}")
            warnings.append(
                f"{feature_id} 的代码符号与索引不一致（{relative}：{'；'.join(detail)}）"
            )
    for feature_id in rows:
        if feature_id not in by_feature:
            errors.append(f"{feature_id} 出现在索引但缺少 FTR 文档")


def inventory(by_feature: dict[str, list[str]]) -> dict[str, list[str]]:
    paths: dict[str, list[str]] = defaultdict(list)
    for feature_id, declared in by_feature.items():
        for relative in declared:
            paths[relative].append(feature_id)
    return {path: sorted(ids) for path, ids in sorted(paths.items())}


def print_inventory(paths: dict[str, list[str]]) -> None:
    print("| 代码路径 | 功能 |")
    print("|---|---|")
    for relative, features in paths.items():
        print(f"| `{relative}` | {'、'.join(features)} |")


def main() -> int:
    parser = argparse.ArgumentParser(description="校验 FTR 代码路径清单；默认只检查，不写文件。")
    parser.add_argument("--list", action="store_true", help="打印代码路径到 FTR 的清单")
    parser.add_argument("--json", action="store_true", help="以 JSON 输出清单与提示")
    parser.add_argument("--warnings", action="store_true", help="打印全部提示")
    parser.add_argument("--strict", action="store_true", help="把提示也作为失败")
    args = parser.parse_args()

    features = sorted((ROOT / "docs" / "features").glob("FTR-*.md"))
    by_feature: dict[str, list[str]] = {}
    annotations: dict[str, dict[str, set[str]]] = {}
    for path in features:
        feature_id, declared, symbols = check_feature(path)
        by_feature[feature_id] = declared
        annotations[feature_id] = symbols
    index_path = ROOT / "docs" / "features" / "index.md"
    if index_path.is_file():
        check_index(index_rows(read(index_path)), by_feature, annotations)
    else:
        errors.append("缺少 docs/features/index.md")

    paths = inventory(by_feature)
    failed = bool(errors) or (args.strict and bool(warnings))
    if args.json:
        print(json.dumps({
            "features": by_feature,
            "paths": paths,
            "warnings": warnings,
            "errors": errors,
        }, ensure_ascii=False, indent=2))
    elif args.list:
        print_inventory(paths)
    if args.warnings or args.strict:
        print("\n".join(f"- {warning}" for warning in warnings), file=sys.stderr)
    if errors:
        print("代码路径检查失败：", file=sys.stderr)
        print("\n".join(f"- {error}" for error in errors), file=sys.stderr)
    elif failed:
        print(f"代码路径检查失败：{len(warnings)} 条提示（--strict）", file=sys.stderr)
    elif not args.json and not args.list:
        suffix = f"；{len(warnings)} 条提示（--warnings 查看）" if warnings else ""
        print(f"代码路径检查通过：{len(by_feature)} 个 FTR，{len(paths)} 个路径{suffix}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
