# ==============================================================================
# Lead Machine - Windows Autonomous Launcher (PowerShell)
# ==============================================================================

param(
    [switch]$Repair = $false,
    [switch]$Update = $false
)

$ErrorActionPreference = "Continue"

# Resolve script directory and project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }
$appRoot = Split-Path -Parent $scriptDir
if (-not (Test-Path (Join-Path $appRoot "lead-machine\server.mjs"))) {
    $appRoot = $scriptDir
}
Set-Location -Path $appRoot

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          WELCOME TO LEAD MACHINE - AUTONOMOUS OUTREACH              " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if running inside unextracted ZIP
if (-not (Test-Path (Join-Path $appRoot "lead-machine\server.mjs"))) {
    Write-Host "[ERROR] YOU ARE RUNNING DIRECTLY INSIDE THE ZIP FILE!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Windows opened this file from a temporary preview without extracting." -ForegroundColor Yellow
    Write-Host "The application files cannot be found." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "HOW TO FIX THIS (takes 10 seconds):" -ForegroundColor White
    Write-Host "1. Close this window."
    Write-Host "2. Right-click the downloaded zip file."
    Write-Host "3. Click 'Extract All...' and then click 'Extract'."
    Write-Host "4. Open the extracted folder and double-click Launch_LeadMachine.bat."
    Write-Host ""
    Write-Host "Press Enter to exit..." -ForegroundColor Gray
    Read-Host
    exit 1
}

# 1b. Self-Healing & Auto-Update Engine
$requiredCoreFiles = @(
    "lead-machine\paths.mjs",
    "lead-machine\server.mjs",
    "lead-machine\migration.mjs",
    "lead-machine\db_migration.mjs",
    "lead-machine\auth.mjs",
    "lead-machine\hunter.mjs",
    "lead-machine\orchestrator.mjs",
    "lead-machine\resource_governor.mjs",
    "lead-machine\worker.mjs",
    "lead-machine\extractor_sync.mjs",
    "lead-machine\reachability.mjs",
    "lead-machine\url_importer.mjs",
    "lead-machine\public\index.html",
    "lead-machine\public\style.css",
    "lead-machine\public\app.js"
)

function Repair-LeadMachineFiles {
    param([string[]]$targetFiles)
    Write-Host "[*] Automatically downloading runtime repairs from GitHub..." -ForegroundColor Cyan
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $rawBase = "https://raw.githubusercontent.com/leadmachine-core/installer/main"
    $wc = New-Object System.Net.WebClient
    foreach ($rf in $targetFiles) {
        $destFile = Join-Path $appRoot $rf
        $destFolder = Split-Path -Parent $destFile
        if (-not (Test-Path $destFolder)) {
            New-Item -ItemType Directory -Force -Path $destFolder | Out-Null
        }
        $cb = [int](Get-Date -UFormat %s)
        $remoteUrl = "$rawBase/$($rf.Replace('\', '/'))?_cb=$cb"
        try {
            Write-Host "  -> Restoring $rf..." -ForegroundColor Gray
            $wc.DownloadFile($remoteUrl, $destFile)
        } catch {
            Write-Host "  [!] Could not download $($rf): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Explicit repair flag triggered
if ($Repair -or $Update) {
    Write-Host "[*] Repair / Update flag active. Re-syncing all core engine files..." -ForegroundColor Yellow
    Repair-LeadMachineFiles -targetFiles $requiredCoreFiles
    Write-Host "[OK] Engine files refreshed." -ForegroundColor Green
    Write-Host ""
}

# Pre-flight check: Detect missing core modules (e.g. paths.mjs) before launching Node
$missingCoreFiles = @()
foreach ($rf in $requiredCoreFiles) {
    if (-not (Test-Path (Join-Path $appRoot $rf))) {
        $missingCoreFiles += $rf
    }
}

if ($missingCoreFiles.Count -gt 0) {
    Write-Host "[!] Missing core runtime files detected: $($missingCoreFiles -join ', ')" -ForegroundColor Yellow
    Repair-LeadMachineFiles -targetFiles $missingCoreFiles
    Write-Host "[OK] Self-healing repair complete." -ForegroundColor Green
    Write-Host ""
}

# 2. Check / Locate Node.js
Write-Host "[1/4] Checking Node.js runtime..." -ForegroundColor Yellow

# Fast check common install paths first (avoids slow Get-Command PATH crawl)
$candidates = @(
    (Join-Path $appRoot "bin\node\node.exe"),
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
    "$env:ProgramFiles\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe"
)
foreach ($cand in $candidates) {
    if (Test-Path $cand) {
        $nodeExe = $cand
        $dir = Split-Path -Parent $cand
        $npmCmd = Join-Path $dir "npm.cmd"
        $npxCmd = Join-Path $dir "npx.cmd"
        $env:PATH = "$dir;$($env:PATH)"
        break
    }
}

# Fallback: check system PATH if not in standard locations
if (-not $nodeExe) {
    $systemNode = Get-Command node -ErrorAction SilentlyContinue
    if ($systemNode) {
        try {
            $testVer = & node -v 2>$null
            if ($testVer -match "^v\d+") {
                $nodeExe = "node"
                $npmCmd = "npm"
                $npxCmd = "npx"
            }
        } catch {}
    }
}

# If still not found, download portable Node.js v22 LTS (Zero Admin, Zero UAC needed!)
if (-not $nodeExe) {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "  [*] Node.js runtime not found on your system." -ForegroundColor Green
    Write-Host "  [*] Automatically downloading portable Node.js (one-time setup)..." -ForegroundColor Green
    Write-Host "      (No administrator password or installer needed!)" -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host ""

    $binDir = Join-Path $appRoot "bin"
    $nodeDir = Join-Path $binDir "node"
    if (-not (Test-Path $nodeDir)) {
        New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
    }

    $zipUrl = "https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip"
    $tempZip = Join-Path $env:TEMP "node_portable.zip"

    try {
        Write-Host "Downloading portable Node.js LTS (~33MB) from nodejs.org..." -ForegroundColor Gray
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($zipUrl, $tempZip)

        Write-Host "Extracting portable runtime..." -ForegroundColor Gray
        Expand-Archive -Path $tempZip -DestinationPath $binDir -Force
        $extractedFolder = Get-ChildItem -Path $binDir -Directory -Filter "node-v*" | Select-Object -First 1
        if ($extractedFolder) {
            Get-ChildItem -Path $extractedFolder.FullName | Copy-Item -Destination $nodeDir -Recurse -Force
            Remove-Item -Path $extractedFolder.FullName -Recurse -Force
        }
        Remove-Item -Path $tempZip -Force

        $cand = Join-Path $nodeDir "node.exe"
        if (Test-Path $cand) {
            $nodeExe = $cand
            $npmCmd = Join-Path $nodeDir "npm.cmd"
            $npxCmd = Join-Path $nodeDir "npx.cmd"
            $env:PATH = "$nodeDir;$($env:PATH)"
        }
    } catch {
        Write-Host "Auto-download encountered an issue: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    if (-not $nodeExe) {
        Write-Host "[ERROR] Could not set up Node.js automatically." -ForegroundColor Red
        Write-Host "Opening official Node.js installer in your browser..." -ForegroundColor Yellow
        Start-Process "https://nodejs.org/en/download"
        Write-Host "Please run the installer, then press Enter here to continue..." -ForegroundColor White
        Read-Host
        $systemNode = Get-Command node -ErrorAction SilentlyContinue
        if ($systemNode) {
            $nodeExe = "node"
            $npmCmd = "npm"
            $npxCmd = "npx"
        } else {
            Write-Host "[ERROR] Node.js still not detected. Please restart this file after installing." -ForegroundColor Red
            Read-Host
            exit 1
        }
    }
}

$nodeVersion = & $nodeExe -v
Write-Host "[OK] Node.js ready: $nodeVersion" -ForegroundColor Green
Write-Host ""

# 3. Check / Auto-Install Project Dependencies
Write-Host "[2/4] Checking project dependencies..." -ForegroundColor Yellow
$puppeteerDir = Join-Path $appRoot "node_modules\puppeteer"
$sqliteDir = Join-Path $appRoot "node_modules\better-sqlite3"
if ((-not (Test-Path $puppeteerDir)) -or (-not (Test-Path $sqliteDir))) {
    Write-Host "Packages missing or incomplete. Installing automatically..." -ForegroundColor Gray
    Write-Host "(This runs once and takes ~15-30 seconds)" -ForegroundColor Gray
    & $npmCmd install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Retrying npm install..." -ForegroundColor Yellow
        & $npmCmd install --force
    }
}
Write-Host "[OK] All dependencies ready." -ForegroundColor Green
Write-Host ""

# 4. Check Browser Automation Engine (Chrome / Edge)
Write-Host "[3/4] Ensuring browser automation engine is ready..." -ForegroundColor Yellow
$browserFound = $false
$browserCandidates = @(
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
)
foreach ($bp in $browserCandidates) {
    if (Test-Path $bp) {
        $browserFound = $true
        Write-Host "[OK] Detected browser engine: $bp" -ForegroundColor Green
        break
    }
}
if (-not $browserFound) {
    Write-Host "Installing Chrome automation engine via Puppeteer..." -ForegroundColor Gray
    & $npxCmd puppeteer browsers install chrome | Out-Null
    Write-Host "[OK] Chrome automation engine ready." -ForegroundColor Green
}
Write-Host ""

# 5. Ensure Isolated User Directory Exists
$userAppData = if ($env:LOCALAPPDATA) { "$env:LOCALAPPDATA\LeadMachine" } else { "$env:USERPROFILE\AppData\Local\LeadMachine" }
if (-not (Test-Path $userAppData)) {
    New-Item -ItemType Directory -Force -Path $userAppData | Out-Null
}
$portFile = Join-Path $userAppData "leadmachine.port"

# 6. Launch Web Dashboard & Auto-Open Browser
Write-Host "[4/4] Initializing user outbound cockpit..." -ForegroundColor Yellow

# Check if an instance is already active for this Windows user
if (Test-Path $portFile) {
    $activeUserPort = (Get-Content $portFile -ErrorAction SilentlyContinue).Trim()
    if ($activeUserPort -match '^\d+$') {
        $tcpActive = Get-NetTCPConnection -LocalPort $activeUserPort -State Listen -ErrorAction SilentlyContinue
        if ($tcpActive) {
            # Verify that the server on this port is actually running under THIS Windows user account
            $isOwnInstance = $false
            try {
                $diag = Invoke-RestMethod -Uri "http://localhost:$activeUserPort/api/workspace/diagnostics" -TimeoutSec 2 -ErrorAction Stop
                if ($diag -and $diag.systemUser -eq $env:USERNAME) {
                    $isOwnInstance = $true
                }
            } catch {}

            if ($isOwnInstance) {
                Write-Host ""
                Write-Host "[*] Active Lead Machine process detected on port $activeUserPort." -ForegroundColor Yellow
                Write-Host "    Closing existing background instance to launch fresh engine..." -ForegroundColor Cyan
                try {
                    Invoke-RestMethod -Uri "http://localhost:$activeUserPort/api/system/shutdown" -Method Post -TimeoutSec 2 -ErrorAction SilentlyContinue | Out-Null
                    Start-Sleep -Milliseconds 800
                } catch {}

                # Force stop any lingering node process owned by current user running Lead Machine
                try {
                    $userProcs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object {
                        $cmd = $_.CommandLine
                        if ($cmd -and ($cmd -like "*lead-machine*" -or $cmd -like "*server.mjs*" -or $cmd -like "*LeadMachine*")) {
                            $owner = (Invoke-CimMethod -InputObject $_ -MethodName GetOwner -ErrorAction SilentlyContinue).User
                            return ($owner -eq $env:USERNAME)
                        }
                        return $false
                    }
                    foreach ($p in $userProcs) {
                        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
                    }
                    Start-Sleep -Milliseconds 500
                } catch {}
            }
        }
    }
    # Clean up stale or foreign port file
    Remove-Item $portFile -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  Dashboard will open in your browser automatically." -ForegroundColor Cyan
Write-Host "  Keep this window open while Lead Machine is active." -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Ensure port file is clean before launching so background opener only picks up the new port
if (Test-Path $portFile) {
    Remove-Item $portFile -Force -ErrorAction SilentlyContinue
}

# Start Node server with low-RAM optimization (384MB heap bound) and IPv4 priority
$serverScript = Join-Path $appRoot "lead-machine\server.mjs"

# Lightweight one-shot browser launcher (exits immediately after opening browser; 0 MB lingering RAM)
$browserScript = "for (`$i=0; `$i -lt 50; `$i++) { Start-Sleep -Milliseconds 250; if (Test-Path '$portFile') { `$p = (Get-Content '$portFile' -ErrorAction SilentlyContinue | Out-String).Trim(); if (`$p -match '^\d+$') { Start-Process `"http://localhost:`$p`"; break } } }"
Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"$browserScript`""

$bootTime = Get-Date
& $nodeExe --max-old-space-size=384 --dns-result-order=ipv4first $serverScript
$exitCode = $LASTEXITCODE
$bootDuration = (Get-Date) - $bootTime

# If server crashed within 8 seconds on startup, run automatic self-healing repair and retry
if ($exitCode -ne 0 -and $bootDuration.TotalSeconds -lt 8) {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Red
    Write-Host "  [!] Server stopped unexpectedly during startup (Exit Code: $exitCode)." -ForegroundColor Red
    Write-Host "  [*] Initiating automatic self-healing repair from GitHub release..." -ForegroundColor Yellow
    Write-Host "======================================================================" -ForegroundColor Yellow
    Write-Host ""
    Repair-LeadMachineFiles -targetFiles $requiredCoreFiles
    Write-Host ""
    Write-Host "[*] Retrying Lead Machine engine startup..." -ForegroundColor Cyan
    & $nodeExe --max-old-space-size=384 --dns-result-order=ipv4first $serverScript
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Yellow
Write-Host "  Lead Machine has stopped." -ForegroundColor Yellow
Write-Host "  Press Enter to exit this window..." -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Yellow
Read-Host
