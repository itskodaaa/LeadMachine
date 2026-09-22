@echo off
title Lead Machine
setlocal enabledelayedexpansion

:: 1. Check if running directly in an extracted LeadMachine directory
if exist "%~dp0lead-machine\launch.ps1" (
    cd /d "%~dp0"
    powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0lead-machine\launch.ps1"
    goto :done
)

:: 2. Check if installed in current user's %LOCALAPPDATA%\LeadMachine
if exist "%LOCALAPPDATA%\LeadMachine\lead-machine\launch.ps1" (
    cd /d "%LOCALAPPDATA%\LeadMachine"
    powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -File "%LOCALAPPDATA%\LeadMachine\lead-machine\launch.ps1"
    goto :done
)

:: 3. If files are missing, run automatic 1-click self-repair / install
echo ======================================================================
echo   LEAD MACHINE - AUTOMATED SETUP AND SELF-HEALING REPAIR
echo ======================================================================
echo.
echo Initializing Lead Machine for your Windows user profile...
echo Downloading latest verified release from GitHub...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/leadmachine-core/installer/main/install.ps1 | iex"

:done
pause


