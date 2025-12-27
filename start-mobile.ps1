# Start Campus Navigator for Mobile Access
# This script starts both backend and frontend with mobile-friendly settings

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Campus Navigator - Mobile Access" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Get local IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*" -and $_.IPAddress -notlike "169.*"} | Select-Object -First 1).IPAddress

if (-not $localIP) {
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*"} | Select-Object -First 1).IPAddress
}

Write-Host "`n📱 Your device IP: $localIP" -ForegroundColor Green
Write-Host "`n🔧 Starting services..." -ForegroundColor Yellow

$currentPath = Get-Location

# Start Backend
Write-Host "`n1️⃣ Starting Backend Server..." -ForegroundColor Cyan
$backendCmd = "Set-Location '$currentPath\backend'; if (Test-Path 'venv\Scripts\Activate.ps1') { & '.\venv\Scripts\Activate.ps1' }; python main.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Start-Sleep -Seconds 3

# Start Frontend with host binding
Write-Host "2️⃣ Starting Frontend Server..." -ForegroundColor Cyan
$frontendCmd = "Set-Location '$currentPath\frontend'; `$env:HOST='0.0.0.0'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Start-Sleep -Seconds 5

Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host "✅ Servers Started!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "`n📱 Access on your mobile device:" -ForegroundColor Yellow
Write-Host "   http://${localIP}:3000" -ForegroundColor Green
Write-Host "`n⚠️  Make sure your phone is on the same WiFi network!" -ForegroundColor Yellow
Write-Host "`n🔒 For HTTPS (required for camera/GPS on mobile):" -ForegroundColor Yellow
Write-Host "   Run: .\start-mobile-https.ps1" -ForegroundColor Cyan
Write-Host "`n   Press Ctrl+C in each window to stop the servers`n" -ForegroundColor Gray
