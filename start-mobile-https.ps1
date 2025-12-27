# Start Campus Navigator with HTTPS using ngrok
# This enables camera and geolocation features on mobile

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Campus Navigator - Mobile HTTPS" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Check if ngrok is installed
try {
    $ngrokVersion = ngrok version
    Write-Host "✅ ngrok found" -ForegroundColor Green
} catch {
    Write-Host "❌ ngrok not found. Installing..." -ForegroundColor Yellow
    Write-Host "   Downloading ngrok..." -ForegroundColor Gray
    
    # Install ngrok via npm
    npm install -g ngrok
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n⚠️  Please install ngrok manually:" -ForegroundColor Yellow
        Write-Host "   1. Visit: https://ngrok.com/download" -ForegroundColor Cyan
        Write-Host "   2. Download and extract ngrok.exe" -ForegroundColor Cyan
        Write-Host "   3. Add to PATH or place in project folder" -ForegroundColor Cyan
        Write-Host "   4. Run: ngrok authtoken YOUR_TOKEN (sign up for free)" -ForegroundColor Cyan
        exit 1
    }
}

$currentPath = Get-Location
Write-Host "`n🔧 Starting services..." -ForegroundColor Yellow

# Start Backend
Write-Host "`n1️⃣ Starting Backend Server..." -ForegroundColor Cyan
$backendCmd = "Set-Location '$currentPath\backend'; if (Test-Path 'venv\Scripts\Activate.ps1') { & '.\venv\Scripts\Activate.ps1' }; python main.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Start-Sleep -Seconds 3

# Start Backend ngrok tunnel
Write-Host "2️⃣ Starting Backend HTTPS Tunnel..." -ForegroundColor Cyan
$backendNgrokCmd = "Write-Host '=== BACKEND HTTPS TUNNEL ===' -ForegroundColor Green; Write-Host 'Copy this URL for backend API' -ForegroundColor Yellow; ngrok http 5001"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendNgrokCmd

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "3️⃣ Starting Frontend Server..." -ForegroundColor Cyan
$frontendCmd = "Set-Location '$currentPath\frontend'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Start-Sleep -Seconds 5

# Start Frontend ngrok tunnel  
Write-Host "4️⃣ Starting Frontend HTTPS Tunnel..." -ForegroundColor Cyan
$frontendNgrokCmd = "Write-Host '=== FRONTEND HTTPS TUNNEL ===' -ForegroundColor Green; Write-Host 'Copy this URL to access on mobile!' -ForegroundColor Yellow; ngrok http 3000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendNgrokCmd

Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host "✅ Servers Started!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "`n📱 INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "   1. Look at the ngrok windows" -ForegroundColor White
Write-Host "   2. Copy the HTTPS URL from Frontend ngrok (https://xxxx.ngrok-free.app)" -ForegroundColor White
Write-Host "   3. Copy the HTTPS URL from Backend ngrok" -ForegroundColor White
Write-Host "   4. Update frontend\.env:" -ForegroundColor White
Write-Host "      REACT_APP_API_URL=<backend_ngrok_url>" -ForegroundColor Cyan
Write-Host "   5. Restart frontend (Ctrl+C in frontend window, then run 'npm start')" -ForegroundColor White
Write-Host "   6. Open the Frontend ngrok URL on your mobile!" -ForegroundColor White
Write-Host "`n⚠️  Note: Free ngrok can only run 1 tunnel at a time" -ForegroundColor Yellow
Write-Host "   You may need to upgrade or use alternative method`n" -ForegroundColor Gray
