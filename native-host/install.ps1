# ============================================================
# Focus Blocker — Native Host Installer
# Run this ONCE as Administrator (right-click → Run with PowerShell)
# Requires Node.js to be installed (https://nodejs.org)
# ============================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---- 1. Must be admin ----
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: Please right-click install.ps1 and choose 'Run with PowerShell as Administrator'." -ForegroundColor Red
    pause
    exit 1
}

# ---- 2. Check Node.js ----
$nodePath = $null
try { $nodePath = (Get-Command node -ErrorAction Stop).Source } catch {}
if (-not $nodePath) {
    Write-Host "ERROR: Node.js not found. Install it from https://nodejs.org then re-run this script." -ForegroundColor Red
    pause
    exit 1
}
Write-Host "Node.js found at: $nodePath" -ForegroundColor Green

# ---- 3. Get extension ID ----
Write-Host ""
Write-Host "You need your Focus Blocker extension ID." -ForegroundColor Yellow
Write-Host "  1. Open Chrome and go to:  chrome://extensions"
Write-Host "  2. Make sure Developer mode is ON (top-right toggle)"
Write-Host "  3. Find 'Focus Blocker' and copy the ID shown below the title"
Write-Host "     (looks like: abcdefghijklmnopabcdefghijklmnop)"
Write-Host ""
$extensionId = Read-Host "Paste the extension ID here"
$extensionId = $extensionId.Trim()

if ($extensionId.Length -ne 32 -or $extensionId -notmatch '^[a-z]+$') {
    Write-Host "ERROR: That doesn't look like a valid extension ID (should be 32 lowercase letters)." -ForegroundColor Red
    pause
    exit 1
}

# ---- 4. Copy host files ----
$hostDir  = "$env:APPDATA\FocusBlockerHost"
$hostJs   = "$hostDir\host.js"
$hostBat  = "$hostDir\host.bat"
$manifest = "$hostDir\manifest.json"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

New-Item -ItemType Directory -Force -Path $hostDir | Out-Null
Copy-Item -Path "$scriptDir\host.js"  -Destination $hostJs  -Force
Copy-Item -Path "$scriptDir\host.bat" -Destination $hostBat -Force
Write-Host "Host files copied to: $hostDir" -ForegroundColor Green

# ---- 5. Write native messaging manifest ----
$manifestContent = @"
{
  "name": "com.focusblocker.host",
  "description": "Focus Blocker Native Messaging Host",
  "path": "$($hostBat -replace '\\', '\\')",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$extensionId/"
  ]
}
"@
Set-Content -Path $manifest -Value $manifestContent -Encoding UTF8
Write-Host "Native host manifest written." -ForegroundColor Green

# ---- 6. Register in Windows Registry ----
$chromePath = "HKCU:\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.focusblocker.host"
$edgePath   = "HKCU:\SOFTWARE\Microsoft\Edge\NativeMessagingHosts\com.focusblocker.host"

New-Item -Path $chromePath -Force | Out-Null
Set-ItemProperty -Path $chromePath -Name "(Default)" -Value $manifest

New-Item -Path $edgePath -Force | Out-Null
Set-ItemProperty -Path $edgePath -Name "(Default)" -Value $manifest

Write-Host "Registry entries created (Chrome + Edge)." -ForegroundColor Green

# ---- 7. Grant current user write access to hosts file ----
$hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"
$username  = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
icacls $hostsFile /grant "${username}:W" | Out-Null
Write-Host "Write permission granted on hosts file." -ForegroundColor Green

# ---- Done ----
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " Focus Blocker OS host installed successfully!" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next step: go to chrome://extensions and click the"
Write-Host "reload icon on Focus Blocker to activate OS blocking."
Write-Host ""
pause
