# Start Campus Navigator - Simplified Single Tunnel
# Uses one ngrok tunnel for frontend with proxy to backend

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Campus Navigator - Mobile HTTPS" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

$rootPath = Get-Location

Write-Host "`n🔧 Starting services..." -ForegroundColor Yellow

# Start Backend first
Write-Host "`n1️⃣ Starting Backend Server..." -ForegroundColor Cyan
$backendScript = Join-Path $rootPath "start-backend.ps1"
Start-Process powershell -ArgumentList "-NoExit", "-File", $backendScript

Start-Sleep -Seconds 5

# Start Frontend
Write-Host "2️⃣ Starting Frontend Server..." -ForegroundColor Cyan
$frontendScript = Join-Path $rootPath "start-frontend.ps1"
Start-Process powershell -ArgumentList "-NoExit", "-File", $frontendScript

Start-Sleep -Seconds 8

# Start ngrok tunnel
Write-Host "3️⃣ Starting HTTPS Tunnel..." -ForegroundColor Cyan
$ngrokScript = Join-Path $rootPath "start-ngrok.ps1"
Start-Process powershell -ArgumentList "-NoExit", "-File", $ngrokScript

Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host "✅ Servers Started!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "`n📱 INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "   1. Look at the ngrok window" -ForegroundColor White
Write-Host "   2. Copy the HTTPS URL (https://xxxx.ngrok-free.app)" -ForegroundColor White
Write-Host "   3. Open that URL on your mobile browser!" -ForegroundColor White
Write-Host "`n✅ No .env changes needed - proxy handles API calls!" -ForegroundColor Green
Write-Host "`n💡 Press Ctrl+C in each window to stop`n" -ForegroundColor Gray
