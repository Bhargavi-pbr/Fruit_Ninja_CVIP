@echo off
title Fruit Ninja CVIP Hand Gesture Game Launcher
color 0c

echo =====================================================================
echo              FRUIT NINJA CVIP: HAND GESTURE VISION GAME
echo                    CVIP ACADEMIC PROJECT LAUNCHER
echo =====================================================================
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Node.js runtime detected! Starting local HTTP server...
    start "" http://localhost:3000
    node server.js
) else (
    echo [INFO] Node.js not found in PATH. Opening index.html directly in browser...
    start "" "%~dp0index.html"
)

pause
