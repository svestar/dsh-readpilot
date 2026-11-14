#!/usr/bin/env python3
"""Keep files small by responsibility, not by cutting a file at a line count.

Limits are per directory and file role: a hook may be larger than a service,
but a view still cannot become a 400-line god file. Scripts are code too,
including the generator's `.mjs` modules and the Python gates.
"""
from pathlib import Path
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
SOURCE_MAX = 300
TEST_MAX = 400
HOOK_MAX = 400
VIEW_MAX = 350

errors: list[str] = []


def lines(path: Path) -> int:
    return len(path.read_text(encoding="utf-8").splitlines())


def is_view(name: str) -> bool:
    return name.endswith(("Screen.ts", "View.ts", "Section.ts", "Overlay.ts"))


def limit_for(relative: str) -> int:
    name = Path(relative).name
    if relative == "index.ts":
        return SOURCE_MAX
    if relative.startswith("src/host/") or relative.startswith("src/shared/"):
        return SOURCE_MAX
    if relative.startswith("src/client/modules/") and name.startswith("use-") and name.endswith(".ts"):
        return HOOK_MAX
    if relative.startswith("src/client/") and is_view(name):
        return VIEW_MAX
    if relative.startswith("src/client/"):
        return SOURCE_MAX
    if relative.startswith("tests/"):
        return TEST_MAX
    if relative.startswith("scripts/") or relative.startswith("examples/"):
        return SOURCE_MAX
    return SOURCE_MAX


def check(path: Path) -> None:
    relative = path.relative_to(ROOT).as_posix()
    count = lines(path)
    limit = limit_for(relative)
    if count > limit:
        errors.append(f"{relative}：{count} 行 > {limit}")


patterns = [
    "index.ts",
    "src/**/*.ts",
    "tests/**/*.ts",
    "tests/**/*.mjs",
    "scripts/**/*.ts",
    "scripts/**/*.mjs",
    "scripts/**/*.py",
    "examples/**/*.ts",
]
seen: set[Path] = set()
for pattern in patterns:
    for path in sorted(ROOT.glob(pattern)):
        if not path.is_file() or path in seen:
            continue
        if "node_modules" in path.parts or "dist" in path.parts:
            continue
        seen.add(path)
        check(path)

if errors:
    print("文件体量检查失败：")
    print("\n".join(f"- {error}" for error in errors))
    print("按目录职责拆分，不要提高上限。")
    sys.exit(1)
print(f"文件体量检查通过：{len(seen)} 个文件")
