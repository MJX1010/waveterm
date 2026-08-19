# Copyright 2026, Command Line Inc.
# SPDX-License-Identifier: Apache-2.0

[CmdletBinding()]
param(
    [string]$Repo = "",
    [string]$Upstream = "upstream",
    [string]$Branch = "main",
    [switch]$NoStash,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Repo)) {
    $Repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message"
}

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )
    $display = "git " + ($Args -join " ")
    if ($DryRun) {
        Write-Host "DRY-RUN $display"
        return
    }
    & git -C $Repo @Args
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed: $display"
    }
}

function Get-GitOutput {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )
    $output = & git -C $Repo @Args 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw ($output -join "`n")
    }
    return $output
}

if (!(Test-Path -LiteralPath $Repo)) {
    throw "Repo path does not exist: $Repo"
}

$isWorkTree = (Get-GitOutput @("rev-parse", "--is-inside-work-tree") | Select-Object -First 1)
if ($isWorkTree -ne "true") {
    throw "Not a git worktree: $Repo"
}

$currentBranch = (Get-GitOutput @("branch", "--show-current") | Select-Object -First 1)
if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    throw "Detached HEAD is not supported by this sync script"
}

$remoteUrl = (Get-GitOutput @("remote", "get-url", $Upstream) | Select-Object -First 1)
Write-Step "Repo: $Repo"
Write-Step "Current branch: $currentBranch"
Write-Step "Merging $Upstream/$Branch from $remoteUrl"

$status = @(Get-GitOutput @("status", "--porcelain"))
$needsStash = $status.Count -gt 0
$stashCreated = $false
$stashMessage = "fork-sync-$Branch-$(Get-Date -Format yyyyMMddHHmmss)"

if ($needsStash) {
    if ($NoStash) {
        throw "Working tree has local changes. Commit them or rerun without -NoStash."
    }
    Write-Step "Stashing local changes"
    Invoke-Git @("stash", "push", "--include-untracked", "-m", $stashMessage)
    $stashCreated = $true
}

try {
    Write-Step "Fetching upstream"
    Invoke-Git @("fetch", $Upstream, $Branch)

    Write-Step "Merging upstream branch"
    Invoke-Git @("merge", "--no-edit", "$Upstream/$Branch")
} catch {
    Write-Error $_
    Write-Host "Resolve the issue, then run git merge --continue or git merge --abort as appropriate."
    if ($stashCreated) {
        Write-Host "Your pre-sync changes are saved in git stash. Run git stash list to inspect them."
    }
    exit 1
}

if ($stashCreated) {
    Write-Step "Restoring stashed local changes"
    Invoke-Git @("stash", "pop")
}

Write-Step "Sync complete"
