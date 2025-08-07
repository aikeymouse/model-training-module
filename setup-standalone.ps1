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
New-Item -ItemType Directory -Path "training_scripts\data\cursors" -Force | Out-Null
New-Item -ItemType Directory -Path "training_scripts\data\backgrounds" -Force | Out-Null

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

Write-Host "🐍 Downloading training scripts..." -ForegroundColor Yellow
# Download main training scripts
try {
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/train_yolov8.py" -OutFile "training_scripts\train_yolov8.py" -UseBasicParsing
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/generate_dataset.py" -OutFile "training_scripts\generate_dataset.py" -UseBasicParsing
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/README.md" -OutFile "training_scripts\README.md" -UseBasicParsing
    Write-Host "✅ Downloaded training scripts" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download training scripts: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🖱️  Downloading sample data..." -ForegroundColor Yellow
# Download some sample cursor images
try {
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/data/cursors/cursor_1753718586358033000.png" -OutFile "training_scripts\data\cursors\cursor_sample_1.png" -UseBasicParsing
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/data/cursors/cursor_1753719420173123000.png" -OutFile "training_scripts\data\cursors\cursor_sample_2.png" -UseBasicParsing
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/data/cursors/cursor_1753719435031479000.png" -OutFile "training_scripts\data\cursors\cursor_sample_3.png" -UseBasicParsing
    Write-Host "✅ Downloaded sample cursor data" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download sample cursor data: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🖼️  Downloading background images..." -ForegroundColor Yellow
# Download background images
try {
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/data/backgrounds/screenshot_1753556728055486000.jpg" -OutFile "training_scripts\data\backgrounds\background_sample_1.jpg" -UseBasicParsing
    Write-Host "✅ Downloaded background images" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download background images: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🤖 Downloading YOLOv8 base model..." -ForegroundColor Yellow
# Download base YOLO model
try {
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/models/yolov8n.pt" -OutFile "models\yolov8n.pt" -UseBasicParsing
    Write-Host "✅ Downloaded YOLOv8 base model" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download YOLOv8 model: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🎯 Downloading example trained models..." -ForegroundColor Yellow
# Download example trained cursor models
try {
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/models/cursor_model_20250804_074007.pt" -OutFile "models\cursor_model_20250804_074007.pt" -UseBasicParsing
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/models/cursor_model_20250804_074007.html" -OutFile "models\cursor_model_20250804_074007.html" -UseBasicParsing
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/models/cursor_model_20250804_074007.txt" -OutFile "models\cursor_model_20250804_074007.txt" -UseBasicParsing
    Write-Host "✅ Downloaded example trained models" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download example models: $_" -ForegroundColor Red
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
Write-Host "│   ├── yolov8n.pt           # 🤖 Base YOLOv8 model for training" -ForegroundColor Gray
Write-Host "│   └── cursor_model_*.pt    # 🎯 Example trained cursor models" -ForegroundColor Gray
Write-Host "├── logs/                     # 📁 Training logs (persistent)" -ForegroundColor Gray
Write-Host "├── frontend/config/          # 📁 Configuration files (editable)" -ForegroundColor Gray
Write-Host "├── training_scripts/         # 🐍 Python scripts and data (editable)" -ForegroundColor Gray
Write-Host "│   ├── train_yolov8.py      # 🎯 Main training script" -ForegroundColor Gray
Write-Host "│   ├── generate_dataset.py  # 📊 Dataset generation" -ForegroundColor Gray
Write-Host "│   └── data/                # 📁 Training data (ready to use)" -ForegroundColor Gray
Write-Host "│       ├── cursors/         # 🖱️  Sample cursor images" -ForegroundColor Gray
Write-Host "│       └── backgrounds/     # 🖼️  Sample background images" -ForegroundColor Gray
Write-Host "└── docker-compose.yml        # 🐳 Container configuration" -ForegroundColor Gray
