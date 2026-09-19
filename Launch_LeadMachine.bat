@echo off
title Lead Machine
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0lead-machine\launch.ps1"
pause


