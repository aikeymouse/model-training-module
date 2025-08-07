#!/bin/bash

# Model Training Module - Standalone Setup Script
# This script downloads all necessary files to run the training module without Git

echo "🚀 Setting up Model Training Module (Standalone)..."

# Create project directory
mkdir -p model-training-module
cd model-training-module

echo "📁 Creating directories..."
# Create persistent directories for data
mkdir -p models logs frontend/config

echo "📥 Downloading configuration files..."
# Download production Docker Compose file
curl -s -o docker-compose.yml https://raw.githubusercontent.com/aikeymouse/model-training-module/main/docker-compose.prod.yml

# Download sample configuration
curl -s -o frontend/config/training-pipeline.json https://raw.githubusercontent.com/aikeymouse/model-training-module/main/frontend/config/training-pipeline.json

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Start the training module:"
echo "   docker compose up"
echo ""
echo "2. Open the interface:"
echo "   http://localhost:3000/container"
echo ""
echo "📁 Your directory structure:"
echo "model-training-module/"
echo "├── models/                    # 📁 Your trained models (persistent)"
echo "├── logs/                     # 📁 Training logs (persistent)"
echo "├── frontend/config/          # 📁 Configuration files (editable)"
echo "└── docker-compose.yml        # 🐳 Container configuration"
