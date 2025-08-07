#!/bin/bash

# Model Training Module - Standalone Setup Script
# This script downloads all necessary files to run the training module without Git

echo "🚀 Setting up Model Training Module (Standalone)..."

# Create project directory
mkdir -p model-training-module
cd model-training-module

echo "📁 Creating directories..."
# Create persistent directories for data
mkdir -p models logs frontend/config training_scripts/data/cursors training_scripts/data/backgrounds

echo "📥 Downloading configuration files..."
# Download production Docker Compose file
curl -s -o docker-compose.yml https://raw.githubusercontent.com/aikeymouse/model-training-module/main/docker-compose.prod.yml

# Download sample configuration
curl -s -o frontend/config/training-pipeline.json https://raw.githubusercontent.com/aikeymouse/model-training-module/main/frontend/config/training-pipeline.json

echo "🐍 Downloading training scripts..."
# Download main training scripts
curl -s -o training_scripts/train_yolov8.py https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/train_yolov8.py
curl -s -o training_scripts/generate_dataset.py https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/generate_dataset.py
curl -s -o training_scripts/README.md https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/README.md

# Download some sample cursor images
echo "🖱️  Downloading sample data..."
curl -s -o training_scripts/data/cursors/cursor_sample_1.png https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/data/cursors/cursor_1753718586358033000.png
curl -s -o training_scripts/data/cursors/cursor_sample_2.png https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/data/cursors/cursor_1753719420173123000.png
curl -s -o training_scripts/data/cursors/cursor_sample_3.png https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/data/cursors/cursor_1753719435031479000.png

# Download background images
echo "🖼️  Downloading background images..."
curl -s -o training_scripts/data/backgrounds/background_sample_1.jpg https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/training_scripts/data/backgrounds/screenshot_1753556728055486000.jpg

# Download base YOLO model
echo "🤖 Downloading YOLOv8 base model..."
curl -s -o models/yolov8n.pt https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/models/yolov8n.pt

# Download example trained cursor models
echo "🎯 Downloading example trained models..."
curl -s -o models/cursor_model_20250804_074007.pt https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/models/cursor_model_20250804_074007.pt
curl -s -o models/cursor_model_20250804_074007.html https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/models/cursor_model_20250804_074007.html
curl -s -o models/cursor_model_20250804_074007.txt https://raw.githubusercontent.com/aikeymouse/model-training-module/main/training_service_python/models/cursor_model_20250804_074007.txt

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Start the training module:"
echo "   docker compose pull && docker compose up"
echo ""
echo "2. Open the interface:"
echo "   http://localhost:3000/container"
echo ""
echo "📁 Your directory structure:"
echo "model-training-module/"
echo "├── models/                    # 📁 Your trained models (persistent)"
echo "│   ├── yolov8n.pt           # 🤖 Base YOLOv8 model for training"
echo "│   └── cursor_model_*.pt    # 🎯 Example trained cursor models"
echo "├── logs/                     # 📁 Training logs (persistent)"
echo "├── frontend/config/          # 📁 Configuration files (editable)"
echo "├── training_scripts/         # 🐍 Python scripts and data (editable)"
echo "│   ├── train_yolov8.py      # 🎯 Main training script"
echo "│   ├── generate_dataset.py  # 📊 Dataset generation"
echo "│   └── data/                # 📁 Training data (ready to use)"
echo "│       ├── cursors/         # 🖱️  Sample cursor images"
echo "│       └── backgrounds/     # 🖼️  Sample background images"
echo "└── docker-compose.yml        # 🐳 Container configuration"
