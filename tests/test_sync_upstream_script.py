#!/usr/bin/env python3
# Copyright 2026, Command Line Inc.
# SPDX-License-Identifier: Apache-2.0

import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


class SyncUpstreamScriptTest(unittest.TestCase):
    def setUp(self):
        self.repo_root = Path(__file__).resolve().parents[1]
        self.script_path = self.repo_root / "scripts" / "sync-upstream.ps1"
        self.powershell = shutil.which("powershell") or shutil.which("pwsh")

    def run_cmd(self, args, cwd):
        subprocess.run(args, cwd=cwd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    def test_dry_run_preserves_dirty_worktree_and_merges_upstream(self):
        if self.powershell is None:
            self.skipTest("PowerShell is not available")
        if not self.script_path.exists():
            self.fail(f"missing sync script: {self.script_path}")

        tmp_parent = Path(os.environ.get("TEST_TMPDIR", tempfile.gettempdir()))
        with tempfile.TemporaryDirectory(dir=tmp_parent) as tmpdir:
            repo = Path(tmpdir)
            self.run_cmd(["git", "init"], repo)
            self.run_cmd(["git", "config", "user.email", "test@example.com"], repo)
            self.run_cmd(["git", "config", "user.name", "Test User"], repo)
            (repo / "README.md").write_text("initial\n", encoding="utf-8")
            self.run_cmd(["git", "add", "README.md"], repo)
            self.run_cmd(["git", "commit", "-m", "init"], repo)
            self.run_cmd(["git", "remote", "add", "upstream", "https://github.com/wavetermdev/waveterm.git"], repo)
            (repo / "local.txt").write_text("local change\n", encoding="utf-8")

            result = subprocess.run(
                [
                    self.powershell,
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    str(self.script_path),
                    "-Repo",
                    str(repo),
                    "-DryRun",
                ],
                cwd=repo,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )

        self.assertIn("DRY-RUN git stash push --include-untracked", result.stdout)
        self.assertIn("DRY-RUN git fetch upstream main", result.stdout)
        self.assertIn("DRY-RUN git merge --no-edit upstream/main", result.stdout)

    def test_dry_run_uses_script_repo_by_default(self):
        if self.powershell is None:
            self.skipTest("PowerShell is not available")
        if not self.script_path.exists():
            self.fail(f"missing sync script: {self.script_path}")

        result = subprocess.run(
            [
                self.powershell,
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(self.script_path),
                "-DryRun",
            ],
            cwd=self.repo_root,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        self.assertIn(f"Repo: {self.repo_root}", result.stdout)
        self.assertIn("DRY-RUN git fetch upstream main", result.stdout)


if __name__ == "__main__":
    unittest.main()
