# Fruit Ninja CVIP Hand Gesture Game - PowerShell Launcher
$Host.UI.RawUI.WindowTitle = "Fruit Ninja CVIP Hand Gesture Launcher"

Write-Host "=====================================================================" -ForegroundColor Red
Write-Host "             FRUIT NINJA CVIP: HAND GESTURE VISION GAME              " -ForegroundColor Yellow
Write-Host "                   CVIP ACADEMIC PROJECT LAUNCHER                    " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Red
Write-Host ""

$node = Get-Command node -ErrorAction SilentlyContinue

if ($node) {
    Write-Host "[OK] Node.js runtime detected! Starting local HTTP server at http://localhost:3000..." -ForegroundColor Green
    Start-Process "http://localhost:3000"
    node server.js
} else {
    Write-Host "[INFO] Node.js not detected in PATH. Opening index.html directly..." -ForegroundColor Yellow
    Start-Process "$PSScriptRoot\index.html"
}
