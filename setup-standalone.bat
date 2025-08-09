@echo off
setlocal EnableDelayedExpansion

REM Model Training Module - Standalone Setup Script for Windows
REM This script downloads all necessary files to run the training module without Git

echo 🚀 Setting up Model Training Module (Standalone)...

REM Create project directory
mkdir "model-training-module" 2>nul
cd "model-training-module"

echo 📁 Creating directories...
REM Create persistent directories for data
mkdir "models" 2>nul
mkdir "logs" 2>nul
mkdir "frontend" 2>nul
mkdir "frontend\config" 2>nul
mkdir "training_scripts" 2>nul
mkdir "training_scripts\data" 2>nul
mkdir "training_scripts\data\cursors" 2>nul
mkdir "training_scripts\data\backgrounds" 2>nul

echo 📥 Downloading configuration files...
REM Download production Docker Compose file
powershell -Command "try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/aikeymouse/model-training-module/main/docker-compose.prod.yml' -OutFile 'docker-compose.yml' -UseBasicParsing; Write-Host '✅ Downloaded docker-compose.yml' } catch { Write-Host '❌ Failed to download docker-compose.yml' -ForegroundColor Red; exit 1 }"
if errorlevel 1 goto :error

REM Download sample configuration
powershell -Command "try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/aikeymouse/model-training-module/main/frontend/config/training-pipeline.json' -OutFile 'frontend\config\training-pipeline.json' -UseBasicParsing; Write-Host '✅ Downloaded training-pipeline.json' } catch { Write-Host '❌ Failed to download training-pipeline.json' -ForegroundColor Red; exit 1 }"
if errorlevel 1 goto :error

echo 🐍 Downloading training scripts...
REM Download main training scripts
powershell -Command "try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/train_yolov8.py' -OutFile 'training_scripts\train_yolov8.py' -UseBasicParsing; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/generate_dataset.py' -OutFile 'training_scripts\generate_dataset.py' -UseBasicParsing; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/README.md' -OutFile 'training_scripts\README.md' -UseBasicParsing; Write-Host '✅ Downloaded training scripts' } catch { Write-Host '❌ Failed to download training scripts' -ForegroundColor Red; exit 1 }"
if errorlevel 1 goto :error

echo 🖱️  Downloading sample data...
REM Download some sample cursor images
powershell -Command "try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/data/cursors/cursor_1753718586358033000.png' -OutFile 'training_scripts\data\cursors\cursor_sample_1.png' -UseBasicParsing; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/data/cursors/cursor_1753719420173123000.png' -OutFile 'training_scripts\data\cursors\cursor_sample_2.png' -UseBasicParsing; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/data/cursors/cursor_1753719435031479000.png' -OutFile 'training_scripts\data\cursors\cursor_sample_3.png' -UseBasicParsing; Write-Host '✅ Downloaded sample cursor data' } catch { Write-Host '❌ Failed to download sample cursor data' -ForegroundColor Red; exit 1 }"
if errorlevel 1 goto :error

echo 🖼️  Downloading background images...
REM Download background images
powershell -Command "try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/data/backgrounds/screenshot_1753556728055486000.jpg' -OutFile 'training_scripts\data\backgrounds\background_sample_1.jpg' -UseBasicParsing; Write-Host '✅ Downloaded background images' } catch { Write-Host '❌ Failed to download background images' -ForegroundColor Red; exit 1 }"
if errorlevel 1 goto :error

echo 🤖 Downloading YOLOv8 base model...
REM Download base YOLO model
powershell -Command "try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/models/yolov8n.pt' -OutFile 'models\yolov8n.pt' -UseBasicParsing; Write-Host '✅ Downloaded YOLOv8 base model' } catch { Write-Host '❌ Failed to download YOLOv8 model' -ForegroundColor Red; exit 1 }"
if errorlevel 1 goto :error

echo 🎯 Downloading example trained models...
REM Download example trained cursor models
powershell -Command "try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/models/cursor_model_20250804_074007.pt' -OutFile 'models\cursor_model_20250804_074007.pt' -UseBasicParsing; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/models/cursor_model_20250804_074007.html' -OutFile 'models\cursor_model_20250804_074007.html' -UseBasicParsing; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/models/cursor_model_20250804_074007.txt' -OutFile 'models\cursor_model_20250804_074007.txt' -UseBasicParsing; Write-Host '✅ Downloaded example trained models' } catch { Write-Host '❌ Failed to download example models' -ForegroundColor Red; exit 1 }"
if errorlevel 1 goto :error

echo.
echo ✅ Setup complete!
echo.
echo 🎯 Next steps:
echo 📁 Your directory structure:
echo model-training-module/
echo ├── models/                    # 📁 Your trained models (persistent)
echo │   ├── yolov8n.pt           # 🤖 Base YOLOv8 model for training
echo │   └── cursor_model_*.pt    # 🎯 Example trained cursor models
echo ├── logs/                     # 📁 Training logs (persistent)
echo ├── frontend/config/          # 📁 Configuration files (editable)
echo ├── training_scripts/         # 🐍 Python scripts and data (editable)
echo │   ├── train_yolov8.py      # 🎯 Main training script
echo │   ├── generate_dataset.py  # 📊 Dataset generation
echo │   └── data/                # 📁 Training data (ready to use)
echo │       ├── cursors/         # 🖱️  Sample cursor images
echo │       └── backgrounds/     # 🖼️  Sample background images
echo └── docker-compose.yml        # 🐳 Container configuration
echo.

REM Docker functionality disabled for testing
echo 🐳 Docker startup is currently disabled for testing
echo 📋 To start manually when ready, run:
echo    cd model-training-module
echo    docker compose pull ^&^& docker compose up
echo.
echo 📱 Then open: http://localhost:3000/container

goto :end

:error
echo ❌ Setup failed due to download error
exit /b 1

:end
pause
