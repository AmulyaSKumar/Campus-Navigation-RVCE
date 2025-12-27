Write-Host "========================================" -ForegroundColor Yellow
Write-Host "   BACKEND NGROK - Copy this URL!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting ngrok tunnel for backend on port 5001..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""
ngrok http 5001
Read-Host -Prompt "Press Enter to exit"
