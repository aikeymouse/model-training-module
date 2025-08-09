# Model Training Module - Standalone Setup Script for Windows
# This script downloads all necessary files to run the training module without Git

Write-Host "🚀 Setting up Model Training Module (Standalone)..." -ForegroundColor Green

# Create project directory
New-Item -ItemType Directory -Path "model-training-module" -Force | Out-Null
Set-Location "model-training-module"

Write-Host "📁 Creating directories..." -ForegroundColor Yellow
# Create persistent directories for data - using full paths to ensure creation
$basePath = Get-Location
New-Item -ItemType Directory -Path "$basePath\models" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\logs" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\frontend" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\frontend\config" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\training_scripts" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\training_scripts\data" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\training_scripts\data\cursors" -Force | Out-Null
New-Item -ItemType Directory -Path "$basePath\training_scripts\data\backgrounds" -Force | Out-Null

# Verify directories were created
Write-Host "📋 Verifying directory structure..." -ForegroundColor Yellow
$directories = @(
    "models",
    "logs", 
    "frontend\config",
    "training_scripts\data\cursors",
    "training_scripts\data\backgrounds"
)

foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Write-Host "  ✅ $dir" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Failed to create $dir" -ForegroundColor Red
        exit 1
    }
}

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
Write-Host ""

# Ask user if they want to start Docker containers
Write-Host "🐳 Would you like to start the Docker containers now? [Y/n]" -ForegroundColor Cyan
$response = Read-Host

# Default to yes if no input or if input starts with y/Y
if ([string]::IsNullOrEmpty($response) -or $response -match "^[Yy]") {
    Write-Host ""
    Write-Host "🚀 Starting Docker containers..." -ForegroundColor Green
    
    Write-Host "🛑 Stopping any running training module containers..." -ForegroundColor Yellow
    # Stop any running containers
    & docker compose down 2>$null
    
    Write-Host "🧹 Cleaning up old training module images..." -ForegroundColor Yellow
    # Remove old training module images specifically
    $oldImages = & docker images --filter=reference="aikeymouse/training-module-*" --format "{{.Repository}}:{{.Tag}}" 2>$null
    if ($oldImages) {
        $oldImages | ForEach-Object { & docker rmi $_ 2>$null }
    }
    & docker image prune -f --filter label=project=model-training-module 2>$null
    
    Write-Host "📥 Pulling latest images..." -ForegroundColor Yellow
    & docker compose pull
    
    Write-Host ""
    Write-Host "🏃 Starting containers..." -ForegroundColor Yellow
    Write-Host "📱 Open http://localhost:3000/container when ready" -ForegroundColor Cyan
    Write-Host ""
    
    # Start containers
    & docker compose up
}
else {
    Write-Host ""
    Write-Host "⏸️  Containers not started." -ForegroundColor Yellow
    Write-Host "📋 To start manually, run:" -ForegroundColor Cyan
    Write-Host "   cd model-training-module" -ForegroundColor Gray
    Write-Host "   docker compose pull; docker compose up" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📱 Then open: http://localhost:3000/container" -ForegroundColor Cyan
}
