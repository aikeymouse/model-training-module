# Model Training Module - Standalone Setup Script for Windows
# This script downloads all necessary files to run the training module without Git

Write-Host "🚀 Setting up Model Training Module (Standalone)..." -ForegroundColor Green

# Create project directory
New-Item -ItemType Directory -Path "model-training-module" -Force | Out-Null
Set-Location "model-training-module"

Write-Host "📁 Creating directories..." -ForegroundColor Yellow
# Create persistent directories for data
New-Item -ItemType Directory -Path "models" -Force | Out-Null
New-Item -ItemType Directory -Path "logs" -Force | Out-Null
New-Item -ItemType Directory -Path "frontend\config" -Force | Out-Null

Write-Host "📥 Downloading configuration files..." -ForegroundColor Yellow
# Download production Docker Compose file
try {
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/aikeymouse/model-training-module/main/docker-compose.prod.yml" -OutFile "docker-compose.yml" -UseBasicParsing
    Write-Host "✅ Downloaded docker-compose.yml" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download docker-compose.yml: $_" -ForegroundColor Red
    exit 1
}

# Download sample configuration
try {
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/aikeymouse/model-training-module/main/frontend/config/training-pipeline.json" -OutFile "frontend\config\training-pipeline.json" -UseBasicParsing
    Write-Host "✅ Downloaded training-pipeline.json" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download training-pipeline.json: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Cyan
Write-Host "1. Start the training module:" -ForegroundColor White
Write-Host "   docker compose up" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Open the interface:" -ForegroundColor White
Write-Host "   http://localhost:3000/container" -ForegroundColor Gray
Write-Host ""
Write-Host "📁 Your directory structure:" -ForegroundColor Cyan
Write-Host "model-training-module/" -ForegroundColor White
Write-Host "├── models/                    # 📁 Your trained models (persistent)" -ForegroundColor Gray
Write-Host "├── logs/                     # 📁 Training logs (persistent)" -ForegroundColor Gray
Write-Host "├── frontend/config/          # 📁 Configuration files (editable)" -ForegroundColor Gray
Write-Host "└── docker-compose.yml        # 🐳 Container configuration" -ForegroundColor Gray
