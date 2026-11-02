#!/usr/bin/env python3
"""将仓库规则打包成可复现的 zip 产物，并验证解压后门禁可运行。"""
import hashlib
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist" / "agent-maintainability-rules.zip"
PACKAGE_PATTERNS = (
    "AGENTS.md",
    "docs/**/*.md",
    "scripts/*.py",
    ".github/workflows/*.yml",
)
EXCLUDED_PATTERNS = ("docs/features/FTR-*.md",)
FIXED_TIMESTAMP = (1980, 1, 1, 0, 0, 0)
CHECKS = (
    ("scripts/gen_feature_index.py", "--check"),
    ("scripts/check_docs.py",),
    ("scripts/test_check_docs.py",),
)


def collect():
    files = set()
    for pattern in PACKAGE_PATTERNS:
        files.update(path for path in ROOT.glob(pattern) if path.is_file())
    for pattern in EXCLUDED_PATTERNS:
        files.difference_update(ROOT.glob(pattern))
    return sorted(files, key=lambda path: path.relative_to(ROOT).as_posix())


def stage(files, staging):
    for path in files:
        target = staging / path.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)


def reset_index(staging):
    result = subprocess.run(
        [sys.executable, "scripts/gen_feature_index.py"],
        cwd=staging,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env={**os.environ, "PYTHONIOENCODING": "utf-8"},
    )
    if result.returncode != 0:
        raise SystemExit(f"无法为产物重建索引：{result.stdout}{result.stderr}")


def write_archive(staging):
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    entries = sorted((path for path in staging.rglob("*") if path.is_file()), key=lambda path: path.relative_to(staging).as_posix())
    with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in entries:
            info = zipfile.ZipInfo(path.relative_to(staging).as_posix(), FIXED_TIMESTAMP)
            info.external_attr = 0o644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, path.read_bytes())


def verify():
    with tempfile.TemporaryDirectory() as name:
        root = Path(name)
        with zipfile.ZipFile(OUTPUT) as archive:
            archive.extractall(root)
        for command in CHECKS:
            result = subprocess.run(
                [sys.executable, *command],
                cwd=root,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                env={**os.environ, "PYTHONIOENCODING": "utf-8"},
            )
            if result.returncode != 0:
                raise SystemExit(f"解压后校验失败：{' '.join(command)}\n{result.stdout}{result.stderr}")


def digest():
    value = hashlib.sha256()
    with OUTPUT.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 16), b""):
            value.update(chunk)
    return value.hexdigest()


def main():
    files = collect()
    if not files:
        raise SystemExit("未找到需要打包的规则文件")
    with tempfile.TemporaryDirectory() as name:
        staging = Path(name)
        stage(files, staging)
        reset_index(staging)
        write_archive(staging)
    verify()
    print(f"已生成 {OUTPUT.relative_to(ROOT)}：{len(files)} 个文件，{OUTPUT.stat().st_size} 字节，sha256 {digest()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
