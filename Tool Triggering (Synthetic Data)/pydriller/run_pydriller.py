#!/usr/bin/env python3
"""pydriller runner -- branch TS-174.

Mines this repository's own history for the three signals the history-tool
family is assigned to produce: churn, change coupling and ownership.

The history is synthetic but structurally real -- see README, "History design".
Ownership is carried in Co-authored-by trailers, so a tool that counts only the
author field will report a single contributor and be wrong.

    pip install pydriller
"""
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REPORTS = os.path.join(REPO_ROOT, "reports")


def via_pydriller():
    from pydriller import Repository  # noqa: WPS433

    churn = Counter()
    touched_per_commit = []
    authors = Counter()
    commits = 0

    for commit in Repository(REPO_ROOT).traverse_commits():
        commits += 1
        authors[commit.author.email] += 1
        for trailer in re.findall(r"Co-authored-by:\s*.+?<(.+?)>", commit.msg, re.IGNORECASE):
            authors[trailer.strip()] += 1
        files = []
        for mod in commit.modified_files:
            name = mod.new_path or mod.old_path
            if not name:
                continue
            files.append(name)
            churn[name] += (mod.added_lines or 0) + (mod.deleted_lines or 0)
        touched_per_commit.append(files)
    return commits, churn, touched_per_commit, authors, "pydriller"


def via_git():
    """Fallback so the runner still produces the metric without pydriller."""
    log = subprocess.check_output(
        # Record layout:  <sha>  <email>  <full body>  <numstat>.
        # The body is MULTI-LINE, so it needs its own terminator. An earlier
        # revision used "%H%x01%ae%x01%B%x02" and then split each record on the
        # first newline, treating everything after the commit SUBJECT as
        # numstat. The Co-authored-by: trailers -- the entire point of the
        # ownership metric -- landed in the stats half and were never counted,
        # and the commit total collapsed to 1. reports/history.json was still
        # written, still derived from a real git log, and still wrong.
        ["git", "-C", REPO_ROOT, "log",
         "--pretty=format:%x02%H%x01%ae%x01%B%x03", "--numstat"],
        text=True, errors="replace",
    )
    churn = Counter()
    touched_per_commit = []
    authors = Counter()
    commits = 0

    for block in log.split("\x02"):
        if not block.strip():
            continue
        head, _, stats = block.partition("\x03")
        parts = head.split("\x01")
        if len(parts) < 3:
            continue
        commits += 1
        authors[parts[1]] += 1
        for trailer in re.findall(r"Co-authored-by:\s*.+?<(.+?)>", parts[2], re.IGNORECASE):
            authors[trailer.strip()] += 1
        files = []
        for line in stats.splitlines():
            cols = line.split("\t")
            if len(cols) == 3 and cols[0].isdigit() and cols[1].isdigit():
                files.append(cols[2])
                churn[cols[2]] += int(cols[0]) + int(cols[1])
        if files:
            touched_per_commit.append(files)
    return commits, churn, touched_per_commit, authors, "git (pydriller not installed)"


def main() -> int:
    try:
        commits, churn, touched, authors, backend = via_pydriller()
    except ImportError:
        commits, churn, touched, authors, backend = via_git()

    coupling = defaultdict(int)
    for files in touched:
        uniq = sorted(set(files))
        for i in range(len(uniq)):
            for j in range(i + 1, len(uniq)):
                coupling[(uniq[i], uniq[j])] += 1

    total_commits = sum(authors.values()) or 1
    ownership = {a: round(100 * n / total_commits, 1) for a, n in authors.most_common()}
    top_coupling = sorted(coupling.items(), key=lambda kv: kv[1], reverse=True)[:10]

    os.makedirs(REPORTS, exist_ok=True)
    with open(os.path.join(REPORTS, "history.json"), "w", encoding="utf-8") as handle:
        json.dump({
            "backend": backend,
            "commits": commits,
            "churn": churn.most_common(15),
            "coupling": [{"pair": list(p), "co_changes": n} for p, n in top_coupling],
            "ownership_pct": ownership,
        }, handle, indent=2)

    print(f"[pydriller] backend: {backend}")
    print(f"[pydriller] commits analysed: {commits}")
    print("[pydriller] top churn:")
    for name, lines in churn.most_common(5):
        print(f"    {lines:6d}  {name}")
    print("[pydriller] top change coupling:")
    for (left, right), n in top_coupling[:5]:
        print(f"    {n:3d}x  {left}  <->  {right}")
    print("[pydriller] ownership (author field + Co-authored-by trailers):")
    for who, pct in list(ownership.items())[:6]:
        print(f"    {pct:5.1f}%  {who}")

    if len(ownership) < 2:
        print("[pydriller] FAIL: only one contributor found -- trailers were not counted", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
