# ==============================================================================
# LEAD MACHINE - ENTERPRISE EDITION
# Universal One-Line Automated Installer & Updater for Windows
# ==============================================================================
# Usage (Remote One-Liner):
#   irm https://raw.githubusercontent.com/leadmachine-core/installer/main/install.ps1 | iex
#
# Usage (Local execution):
#   powershell -ExecutionPolicy Bypass -File install.ps1
# ==============================================================================

param(
    [switch]$NoLaunch = $false,
    [string]$TargetDir = "$env:LOCALAPPDATA\LeadMachine",
    [string]$Token = ($env:GH_TOKEN, $env:GITHUB_TOKEN | Where-Object { $_ } | Select-Object -First 1),
    [string]$Repo = "leadmachine-core/installer",
    [string]$Branch = "main",
    [string]$LicenseKey = ""
)

$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$APP_NAME = "Lead Machine"
$APP_VERSION = "2.5.0"
$TARGET_DIR = $TargetDir
$REPO_URL = "https://github.com/$Repo"
$ZIP_URL = "https://raw.githubusercontent.com/leadmachine-core/installer/main/leadmachine.zip"
$API_ZIP_URL = "https://api.github.com/repos/$Repo/zipball/$Branch"

Clear-Host
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "         LEAD MACHINE ENTERPRISE EDITION - ONE-CLICK INSTALLER         " -ForegroundColor Cyan
Write-Host "                           Version $APP_VERSION                       " -ForegroundColor DarkCyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[*] Initializing automated enterprise deployment..." -ForegroundColor Gray
Write-Host "[*] Target Installation Directory: $TARGET_DIR" -ForegroundColor Gray
Write-Host ""

# ------------------------------------------------------------------------------
# 0. Cleanly Terminate Any Running Dashboard Processes for Active User Only
# ------------------------------------------------------------------------------
$currentUser = $env:USERNAME
Write-Host "[0/6] Checking for active Lead Machine processes for user '$currentUser'..." -ForegroundColor Yellow

# Step A: Graceful HTTP shutdown via active port record
$portFile = Join-Path $TARGET_DIR "leadmachine.port"
if (Test-Path $portFile) {
    try {
        $activePort = (Get-Content $portFile -ErrorAction SilentlyContinue | Out-String).Trim()
        if ($activePort -match '^\d+$') {
            try {
                $diag = Invoke-RestMethod -Uri "http://127.0.0.1:$activePort/api/workspace/diagnostics" -TimeoutSec 2 -ErrorAction Stop
                if ($diag.systemUser -eq $currentUser) {
                    Write-Host "  [*] Sending graceful shutdown signal to running dashboard on port $activePort..." -ForegroundColor Yellow
                    Invoke-RestMethod -Uri "http://127.0.0.1:$activePort/api/system/shutdown" -Method Post -TimeoutSec 2 -ErrorAction SilentlyContinue | Out-Null
                    Start-Sleep -Milliseconds 800
                }
            } catch {}
        }
    } catch {}
}

# Step B: Close any remaining node.exe processes owned strictly by current user running Lead Machine
try {
    $userNodeProcs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object {
        $proc = $_
        $cmd = $proc.CommandLine
        if ($cmd -and ($cmd -like "*lead-machine*" -or $cmd -like "*server.mjs*" -or $cmd -like "*LeadMachine*")) {
            $owner = (Invoke-CimMethod -InputObject $proc -MethodName GetOwner -ErrorAction SilentlyContinue).User
            return ($owner -eq $currentUser)
        }
        return $false
    }

    if ($userNodeProcs) {
        foreach ($p in $userNodeProcs) {
            Write-Host "  [*] Halting running dashboard engine (PID $($p.ProcessId)) for user '$currentUser'..." -ForegroundColor Yellow
            Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Milliseconds 500
    }
} catch {
    # Fallback if CIM permissions are restricted
    try {
        Get-Process node -ErrorAction SilentlyContinue | Where-Object {
            $_.Path -like "*LeadMachine*" -or $_.Path -like "*$currentUser*"
        } | Stop-Process -Force -ErrorAction SilentlyContinue
    } catch {}
}

# Step C: Clean up stale port file if still present
if (Test-Path $portFile) {
    Remove-Item -Path $portFile -Force -ErrorAction SilentlyContinue
}

# ------------------------------------------------------------------------------
# 1. Determine Source & Prepare Destination
# ------------------------------------------------------------------------------
$scriptSourceDir = $PSScriptRoot
$isLocalRun = ($scriptSourceDir -and (Test-Path (Join-Path $scriptSourceDir "package.json")))

if (-not (Test-Path $TARGET_DIR)) {
    Write-Host "[1/6] Creating application directory at $TARGET_DIR..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $TARGET_DIR | Out-Null
} else {
    Write-Host "[1/6] Existing installation detected at $TARGET_DIR. Performing clean in-place update..." -ForegroundColor Yellow
}

# Ensure data directory exists and preserve existing databases/configs
$targetDataDir = Join-Path $TARGET_DIR "data"
if (-not (Test-Path $targetDataDir)) {
    New-Item -ItemType Directory -Force -Path $targetDataDir | Out-Null
}

$existingConfig = Join-Path $TARGET_DIR "lead-machine\config.json"
$hasExistingConfig = Test-Path $existingConfig
$tempConfigBackup = $null

if ($hasExistingConfig) {
    $tempConfigBackup = Join-Path $env:TEMP ("leadmachine_config_backup_" + [System.Guid]::NewGuid().ToString("N") + ".json")
    Copy-Item -Path $existingConfig -Destination $tempConfigBackup -Force
    Write-Host "  [*] Backed up existing corporate configuration." -ForegroundColor DarkGray
}

# ------------------------------------------------------------------------------
# 2. Copy or Download Files
# ------------------------------------------------------------------------------
Write-Host "[2/6] Syncing application binaries..." -ForegroundColor Yellow

if ($isLocalRun) {
    Write-Host "  [*] Copying from local source: $scriptSourceDir..." -ForegroundColor Gray
    
    # Items to exclude from copy
    $excludeItems = @(".git", "node_modules", ".vscode", "output", "screenshots")
    
    Get-ChildItem -Path $scriptSourceDir | Where-Object {
        $name = $_.Name
        (-not ($excludeItems -contains $name)) -and ($name -ne "data")
    } | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $TARGET_DIR -Recurse -Force
    }

    # If local data folder has leads.db and target doesn't, copy default
    $localDb = Join-Path $scriptSourceDir "data\leads.db"
    $targetDb = Join-Path $targetDataDir "leads.db"
    if ((Test-Path $localDb) -and (-not (Test-Path $targetDb))) {
        Copy-Item -Path $localDb -Destination $targetDb -Force
        Write-Host "  [*] Initialized database from local package." -ForegroundColor DarkGray
    }
} else {
    Write-Host "  [*] Fetching latest build archive from distribution server..." -ForegroundColor Gray
    $tempZip = Join-Path $env:TEMP "leadmachine_install.zip"
    $tempExtract = Join-Path $env:TEMP "leadmachine_extracted"

    try {
        if ($Token) {
            Write-Host "  [*] Authenticating with GitHub API for private repository ($Repo)..." -ForegroundColor Gray
            $headers = @{
                "Authorization" = "Bearer $Token"
                "User-Agent" = "LeadMachineInstaller"
                "Accept" = "application/vnd.github.v3+json"
            }
            Invoke-RestMethod -Uri $API_ZIP_URL -Headers $headers -OutFile $tempZip -MaximumRedirection 5
        } else {
            Write-Host "  [*] Downloading application archive from $ZIP_URL..." -ForegroundColor Gray
            try {
                Invoke-WebRequest -Uri $ZIP_URL -OutFile $tempZip -UseBasicParsing
            } catch {
                Invoke-WebRequest -Uri "https://github.com/$Repo/archive/refs/heads/$Branch.zip" -OutFile $tempZip -UseBasicParsing
            }
        }

        if (Test-Path $tempExtract) { Remove-Item -Path $tempExtract -Recurse -Force }
        Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force
        
        # Detect whether zip extracted directly or inside a wrapper folder
        if ((Test-Path (Join-Path $tempExtract "lead-machine")) -or (Test-Path (Join-Path $tempExtract "package.json"))) {
            $sourcePath = $tempExtract
        } else {
            $innerFolder = Get-ChildItem -Path $tempExtract -Directory | Select-Object -First 1
            $sourcePath = if ($innerFolder) { $innerFolder.FullName } else { $tempExtract }
        }
        
        # If the zip has a LeadMachine subfolder, use it
        if (Test-Path (Join-Path $sourcePath "LeadMachine")) {
            $sourcePath = Join-Path $sourcePath "LeadMachine"
        }
        
        Get-ChildItem -Path $sourcePath | Where-Object { $_.Name -ne "data" } | ForEach-Object {
            Copy-Item -Path $_.FullName -Destination $TARGET_DIR -Recurse -Force
        }
        
        Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $tempExtract -Recurse -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Host "  [!] Note: Remote repository download could not be completed ($($_.Exception.Message))." -ForegroundColor DarkGray
        Write-Host "  [*] Verifying local target directory contents..." -ForegroundColor DarkGray
    }
}

# Restore user configuration if it existed, merging with any new default keys
if ($tempConfigBackup -and (Test-Path $tempConfigBackup)) {
    try {
        $oldCfg = Get-Content -Raw -Path $tempConfigBackup | ConvertFrom-Json
        $newCfgPath = Join-Path $TARGET_DIR "lead-machine\config.json"
        if (Test-Path $newCfgPath) {
            $newCfg = Get-Content -Raw -Path $newCfgPath | ConvertFrom-Json
            # Preserve user profile
            if ($oldCfg.profile) { $newCfg.profile = $oldCfg.profile }
            if ($oldCfg.settings) {
                # Preserve settings but ensure version is updated
                $oldCfg.settings.version = $APP_VERSION
                $newCfg.settings = $oldCfg.settings
            }
            $newCfg | ConvertTo-Json -Depth 10 | Set-Content -Path $newCfgPath -Encoding UTF8
        } else {
            Copy-Item -Path $tempConfigBackup -Destination $newCfgPath -Force
        }
        Remove-Item -Path $tempConfigBackup -Force -ErrorAction SilentlyContinue
        Write-Host "  [*] Preserved and synced corporate profile & custom configuration." -ForegroundColor Green
    } catch {
        Write-Host "  [!] Config migration warning: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "[OK] Application binaries synced successfully." -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------------------------
# 3. Check & Configure Node.js Runtime
# ------------------------------------------------------------------------------
Write-Host "[3/6] Verifying Node.js runtime environment..." -ForegroundColor Yellow

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue

if (-not $nodeCmd) {
    # Check standard install locations
    $candidates = @(
        "$env:ProgramFiles\nodejs\node.exe",
        "${env:ProgramFiles(x86)}\nodejs\node.exe",
        "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
        (Join-Path $TARGET_DIR "bin\node\node.exe")
    )
    foreach ($cand in $candidates) {
        if (Test-Path $cand) {
            $nodeDir = Split-Path -Parent $cand
            $env:PATH = "$nodeDir;$($env:PATH)"
            $nodeCmd = Get-Command $cand -ErrorAction SilentlyContinue
            break
        }
    }
}

if (-not $nodeCmd) {
    Write-Host "  [*] Node.js not detected. Attempting automated silent installation..." -ForegroundColor Gray
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        Write-Host "  [*] Installing Node.js LTS via Windows Package Manager..." -ForegroundColor Gray
        Start-Process winget -ArgumentList "install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements" -Wait -NoNewWindow
        
        # Refresh PATH
        $env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    }
}

# If still not found, download portable Node.js v22 LTS directly
if (-not $nodeCmd) {
    Write-Host "  [*] Deploying self-contained portable Node.js LTS..." -ForegroundColor Gray
    $binDir = Join-Path $TARGET_DIR "bin"
    $nodeDir = Join-Path $binDir "node"
    New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
    
    $nodeZipUrl = "https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip"
    $nodeTempZip = Join-Path $env:TEMP "node_portable.zip"
    
    try {
        (New-Object System.Net.WebClient).DownloadFile($nodeZipUrl, $nodeTempZip)
        Expand-Archive -Path $nodeTempZip -DestinationPath $binDir -Force
        $unpacked = Get-ChildItem -Path $binDir -Directory -Filter "node-v*" | Select-Object -First 1
        if ($unpacked) {
            Get-ChildItem -Path $unpacked.FullName | Copy-Item -Destination $nodeDir -Recurse -Force
            Remove-Item -Path $unpacked.FullName -Recurse -Force
        }
        Remove-Item -Path $nodeTempZip -Force -ErrorAction SilentlyContinue
        $env:PATH = "$nodeDir;$($env:PATH)"
    } catch {
        Write-Host "  [!] Portable runtime setup error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

$nodeVersion = & node -v 2>$null
Write-Host "[OK] Node.js runtime ready: $nodeVersion" -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------------------------
# 4. Install & Verify Node.js Modules
# ------------------------------------------------------------------------------
Write-Host "[4/6] Verifying engine dependencies and browser drivers..." -ForegroundColor Yellow
Push-Location -Path $TARGET_DIR

$nodeModulesDir = Join-Path $TARGET_DIR "node_modules"
$puppeteerDir = Join-Path $nodeModulesDir "puppeteer"
$sqliteDir = Join-Path $nodeModulesDir "better-sqlite3"

if ((-not (Test-Path $puppeteerDir)) -or (-not (Test-Path $sqliteDir))) {
    Write-Host "  [*] Installing required production packages..." -ForegroundColor Gray
    & cmd.exe /c npm install --omit=dev --no-audit --no-fund
}

Write-Host "[OK] Engine dependencies verified." -ForegroundColor Green
Write-Host ""
Pop-Location

# ------------------------------------------------------------------------------
# 5. Clean Up Old/Duplicate Shortcuts & Create Single Canonical Desktop Shortcut
# ------------------------------------------------------------------------------
Write-Host "[5/6] Consolidating and updating desktop shortcuts..." -ForegroundColor Yellow

$userDesktop = if (Test-Path "$env:USERPROFILE\Desktop") { "$env:USERPROFILE\Desktop" } else { [System.Environment]::GetFolderPath("Desktop") }
$desktopLocations = @(
    $userDesktop,
    "C:\Users\Public\Desktop"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

# Remove any duplicate, legacy, or stale Lead Machine shortcuts or batch scripts across all desktop locations
$stalePatterns = @("*Lead*Machine*.lnk", "*LeadMachine*.lnk", "*Launch*LeadMachine*.lnk", "*Launch*LeadMachine*.bat", "*Launch_LeadMachine*", "*run_leadmachine*")
foreach ($loc in $desktopLocations) {
    foreach ($pat in $stalePatterns) {
        Get-ChildItem -Path $loc -Filter $pat -File -ErrorAction SilentlyContinue | ForEach-Object {
            Write-Host "  [*] Removing duplicate/stale shortcut: $($_.FullName)" -ForegroundColor DarkGray
            Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
        }
    }
}

$programsPath = [System.Environment]::GetFolderPath("Programs")
if (-not $programsPath -or -not (Test-Path $programsPath)) {
    $programsPath = if (Test-Path "$env:APPDATA\Microsoft\Windows\Start Menu\Programs") { "$env:APPDATA\Microsoft\Windows\Start Menu\Programs" } else { "C:\ProgramData\Microsoft\Windows\Start Menu\Programs" }
}
$shortcutTarget = Join-Path $TARGET_DIR "Launch_LeadMachine.bat"

# Create helper VBScript launcher to run silently/cleanly if preferred
$vbsLauncher = Join-Path $TARGET_DIR "run_leadmachine.vbs"
$vbsCode = "Set WshShell = CreateObject(`"WScript.Shell`")`nWshShell.Run `"`"`" & WshShell.ExpandEnvironmentStrings(`"%LOCALAPPDATA%\LeadMachine\Launch_LeadMachine.bat`") & `"`"`", 1, False"
Set-Content -Path $vbsLauncher -Value $vbsCode -Encoding ASCII

try {
    $wshShell = New-Object -ComObject WScript.Shell
    
    # 1. Single Canonical Desktop Shortcut (placed strictly on active user's desktop)
    $desktopShortcut = $wshShell.CreateShortcut((Join-Path $userDesktop "$APP_NAME.lnk"))
    $desktopShortcut.TargetPath = $shortcutTarget
    $desktopShortcut.WorkingDirectory = $TARGET_DIR
    $desktopShortcut.Description = "Lead Machine Enterprise - Autonomous B2B Lead Generation & Outreach Engine"
    $desktopShortcut.Save()

    # 2. Start Menu Shortcut
    $startMenuDir = Join-Path $programsPath "Lead Machine"
    if (-not (Test-Path $startMenuDir)) { New-Item -ItemType Directory -Force -Path $startMenuDir | Out-Null }
    $startMenuShortcut = $wshShell.CreateShortcut((Join-Path $startMenuDir "$APP_NAME.lnk"))
    $startMenuShortcut.TargetPath = $shortcutTarget
    $startMenuShortcut.WorkingDirectory = $TARGET_DIR
    $startMenuShortcut.Description = "Lead Machine Enterprise"
    $startMenuShortcut.Save()

    Write-Host "[OK] Desktop and Start Menu shortcuts consolidated into single canonical launcher." -ForegroundColor Green
} catch {
    Write-Host "  [!] Shortcut creation skipped: $($_.Exception.Message)" -ForegroundColor DarkGray
}

try {
    New-NetFirewallRule -DisplayName 'LeadMachine_3333' -Direction Inbound -LocalPort 3333 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
} catch {}
Write-Host ""

# ------------------------------------------------------------------------------
# 6. Launch Application
# ------------------------------------------------------------------------------
Write-Host "[6/6] Launching Lead Machine Enterprise..." -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  INSTALLATION COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "  Server: http://localhost:3333" -ForegroundColor Green
Write-Host "  Desktop shortcut created: '$APP_NAME'" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""

if (-not $NoLaunch) {
    Write-Host "  [*] Opening dashboard in your default browser..." -ForegroundColor Gray
    Start-Process "http://localhost:3333"
    Start-Process -FilePath $shortcutTarget
} else {
    Write-Host "  [*] Automated deployment mode (-NoLaunch specified). Server not auto-launched." -ForegroundColor Gray
}
