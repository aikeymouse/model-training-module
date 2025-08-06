# YOLO Training Module

A containerized YOLO model training system with real-time monitoring, configurable pipelines, and a modern web interface. Train custom object detection models with live feedback and professional-grade tooling.

## 🚀 Quick Overview

**What it does:** Train YOLO models through a web interface with real-time output streaming and configurable multi-stage pipelines.

**Key Technologies:** Docker Compose, Go backend, Python FastAPI, WebSocket communication, PTY-based output streaming.

**Perfect for:** Custom object detection, cursor tracking, educational projects, rapid prototyping, and production ML workflows.

## 📁 Project Structure

```
yolo-training-module/
├── docker-compose.yml          # Multi-service orchestration
├── README.md                   # This overview documentation
├── backend_go/                 # Go HTTP server and WebSocket proxy
│   ├── main.go                # Static file server and WebSocket routing
│   └── Dockerfile             # Go build configuration
├── frontend/                   # Web interface
│   ├── index.html             # Main application interface
│   ├── config/
│   │   ├── training-pipeline.json  # Pipeline configuration
│   │   └── README.md          # 📖 Configuration documentation
│   ├── css/style.css          # Application styling
│   └── js/                    # Frontend JavaScript modules
└── training_service_python/    # Python training service
    ├── main_v8.py             # FastAPI backend server
    ├── README.md              # 📖 API documentation
    ├── models/                # Model storage directory
    ├── logs/                  # Training execution logs
    ├── training_scripts/      # Core training scripts
    │   └── README.md          # 📖 Training scripts documentation
    └── requirements.txt       # Python dependencies
```

## 📚 Documentation Index

- **[API Reference](training_service_python/README.md)** - Complete FastAPI backend documentation
- **[Training Scripts](training_service_python/training_scripts/README.md)** - Dataset generation and model training guides  
- **[Pipeline Configuration](frontend/config/README.md)** - JSON configuration system documentation

##  Quick Start

### Prerequisites
- Docker and Docker Compose
- 8GB+ RAM (recommended)
- Modern web browser

### Get Started in 2 Minutes

1. **Clone and Start:**
   ```bash
   git clone https://github.com/aikeymouse/model-training-module.git
   cd model-training-module
   docker compose up --build
   ```

2. **Open Interface:**
   - Navigate to `http://localhost:8080` (Go Example App)
   - Backend API available at `http://localhost:3000`
   - Training service at `http://localhost:3001`
   - Click "Manage Models" to open training interface

3. **Train Your First Model:**
   - Adjust training parameters (epochs, synthetic images)
   - Click "Train New Model"
   - Watch real-time training progress

That's it! Your trained model will be automatically saved and available for testing.

## 🔌 System Architecture

### Overview
```
┌─────────────────┐    WebSocket     ┌──────────────────┐    HTTP/WS     ┌─────────────────────┐
│   Web Browser   │ ◄──────────────► │   Go Backend     │ ◄────────────► │  Python Training    │
│                 │                  │  (Port 8080)     │                │  Service (Port 8000)│
│ - Training UI   │                  │ - Static Files   │                │ - FastAPI           │
│ - Real-time Logs│                  │ - WebSocket Proxy│                │ - Model Training    │
└─────────────────┘                  └──────────────────┘                └─────────────────────┘
```

### Key Technologies
- **PTY-based Output**: True real-time log streaming without buffering
- **WebSocket Proxy**: Go backend routes WebSocket connections to Python service
- **Docker Socket Mounting**: Direct container communication with host Docker daemon
- **Dynamic Configuration**: JSON-based pipeline definitions with variable substitution

### Docker Services
- **backend**: Go HTTP server (static files + WebSocket proxy)
- **training_service**: Python FastAPI (model training + script execution)

## 🎯 Use Cases

- **Custom Object Detection** - Train models for specific domains and use cases
- **Cursor Tracking** - Specialized models for UI automation and screen interaction  
- **Educational Projects** - Learn YOLO training with visual feedback and real-time monitoring
- **Rapid Prototyping** - Quick model iteration and testing with immediate results
- **Production ML Workflows** - Standardized training pipelines for teams and automation
- **Research & Development** - Systematic approach to model experimentation

## �️ Customization

### Environment Variables
```bash
# Service configuration
PYTHON_SERVICE_URL=http://training_service:8000
DEBUG=true

# Storage directories
MODELS_DIR=/app/models
LOGS_DIR=/app/logs
```

### Custom Pipelines
Modify `frontend/config/training-pipeline.json` to add:
- New training stages and scripts
- Custom variable types and UI controls  
- Project-specific configurations

See the [Pipeline Configuration Guide](frontend/config/README.md) for detailed customization options.

## � Troubleshooting

### Common Issues

| Issue | Quick Fix |
|-------|-----------|
| Config file not found | Check `frontend/config/training-pipeline.json` exists |
| WebSocket connection failed | Verify `docker compose ps` shows both services running |
| Script execution error | Check script paths in training service container |
| Model loading issues | Verify model file permissions and integrity |

### Debug Commands
```bash
# Check service status
docker compose ps

# View logs
docker compose logs backend
docker compose logs training_service

# Test endpoints
curl http://localhost:3000/api/models
curl http://localhost:3000/config/training-pipeline.json

# Access containers
docker compose exec backend sh
docker compose exec training_service bash
```

### Complete Reset
```bash
docker compose down -v --remove-orphans
docker compose build --no-cache
docker compose up -d
```

For detailed troubleshooting, see the specific documentation:
- [API Issues](training_service_python/README.md#troubleshooting)
- [Configuration Problems](frontend/config/README.md#validation--testing)
- [Training Script Errors](training_service_python/training_scripts/README.md#troubleshooting)

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup
```bash
git clone https://github.com/aikeymouse/model-training-module.git
cd model-training-module
git checkout -b feature/your-feature
docker compose up --build
```

### Guidelines
- **Go Backend**: Follow `gofmt` standards and add proper error handling
- **Python Service**: Use PEP 8, type hints, and comprehensive docstrings  
- **Frontend**: Modern ES6+, clear naming, responsive design
- **Configuration**: Validate JSON, provide defaults, maintain compatibility

### Areas for Contribution
- Enhanced variable types and UI controls
- Model versioning and comparison features
- Performance optimizations and testing
- Documentation improvements and examples

See detailed contribution guidelines in individual component README files.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

**Key Points:**
- ✅ Commercial use permitted
- ✅ Modification and distribution allowed  
- ⚠️ License notice required

## 🙏 Acknowledgments

Built with excellent open-source technologies:
- **[Ultralytics YOLO](https://github.com/ultralytics/ultralytics)** - Object detection framework
- **[FastAPI](https://fastapi.tiangolo.com/)** - Modern Python web framework
- **[Docker](https://www.docker.com/)** - Containerization platform
- **[Go](https://golang.org/)** & **[Python](https://python.org/)** - Core programming languages

---

**Ready to train your own YOLO models?** 🚀  
Start with `docker compose up --build` and open `http://localhost:8080` for the Go example app!