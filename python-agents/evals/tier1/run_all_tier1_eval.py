"""
Run all Tier 1 eval suites for beta python-agents.

This executes deterministic Tier 1 scripts in sequence and returns non-zero
if any suite fails.

Run from `python-agents/`:
  python3 evals/tier1/run_all_tier1_eval.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def _run_script(script_relpath: str) -> int:
    script_path = (ROOT / script_relpath).resolve()
    print(f"[RUN] {script_relpath}")
    result = subprocess.run([sys.executable, str(script_path)], cwd=str(ROOT), check=False)
    if result.returncode == 0:
        print(f"[PASS] {script_relpath}")
    else:
        print(f"[FAIL] {script_relpath} (exit={result.returncode})")
    return result.returncode


def main() -> int:
    scripts = [
        "evals/tier1/run_tier1_eval.py",
        "evals/tier1/alias_normalization_snapshot_eval.py",
        "evals/tier1/alpha_parity_eval.py",
    ]

    failures = 0
    for relpath in scripts:
        exit_code = _run_script(relpath)
        if exit_code != 0:
            failures += 1

    total = len(scripts)
    passed = total - failures
    print(f"tier1 all suites done: {passed}/{total} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

