#!/usr/bin/env python3
"""Print release notes for a tag from CHANGELOG.md."""
import re
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: release_notes.py <tag>", file=sys.stderr)
        return 2
    tag = sys.argv[1].strip()
    version = tag[1:] if tag.startswith("v") else tag
    changelog = Path("CHANGELOG.md")
    if not changelog.is_file():
        print(f"安装：`npm install dsh-readpilot@{version}`\n\nSee the repository for release notes.")
        return 0
    text = changelog.read_text(encoding="utf-8")
    heading = re.search(rf"^##\s+{re.escape(version)}(?:\s|$).*$", text, re.MULTILINE)
    if not heading:
        print(f"安装：`npm install dsh-readpilot@{version}`\n\nSee CHANGELOG.md for details.")
        return 0
    body = text[heading.end():]
    next_heading = re.search(r"^##\s+", body, re.MULTILINE)
    if next_heading:
        body = body[:next_heading.start()]
    print(f"安装：`npm install dsh-readpilot@{version}`\n\n{body.strip()}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
