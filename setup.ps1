# Campus Navigator - Setup Script for Windows
# Run with: .\setup.ps1

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Campus Navigator - Setup Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Check Python
try {
    $pythonVersion = python --version
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python is not installed. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 14+" -ForegroundColor Red
    exit 1
}

# Backend setup
Write-Host "`n📦 Setting up Backend..." -ForegroundColor Yellow
Set-Location backend

# Create virtual environment
python -m venv venv
Write-Host "✅ Virtual environment created" -ForegroundColor Green

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green

# Create .env from example
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "✅ Created backend .env file" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend .env already exists" -ForegroundColor Yellow
}

Set-Location ..

# Frontend setup
Write-Host "`n📦 Setting up Frontend..." -ForegroundColor Yellow
Set-Location frontend

# Install dependencies
npm install
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green

# Create .env from example
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "✅ Created frontend .env file" -ForegroundColor Green
} else {
    Write-Host "⚠️  Frontend .env already exists" -ForegroundColor Yellow
}

Set-Location ..

Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Configure frontend\.env with your API keys"
Write-Host "2. Run: cd backend; python main.py"
Write-Host "3. In new terminal: cd frontend; npm start"
Write-Host ""
