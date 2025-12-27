Write-Host "Starting Backend..." -ForegroundColor Green
Set-Location backend
if (Test-Path "venv\Scripts\Activate.ps1") {
    & ".\venv\Scripts\Activate.ps1"
}
python main.py
