# Go Application Example with Training Module Integration

This example demonstrates how to integrate the training module into a complete Go web application.

## 📁 Project Structure

```
go-example/
├── main.go                    # Main application server
├── go.mod                     # Go module dependencies
├── static/                    # Static files (CSS, JS, images)
│   └── app.css               # Application-specific styles
├── templates/                 # HTML templates
│   └── index.html            # Home page template
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites
- Go 1.19 or later
- Docker and Docker Compose
- Training module backend services running

### 1. Start the Backend Services
```bash
# Navigate to the project root
cd /path/to/yolo-training-module

# Build and start the backend services
docker compose up --build -d

# Verify services are running
docker compose ps
```

Expected services:
- **Backend Service**: Port 3000 (API proxy)
- **Training Service**: Port 3001 (Python ML service)

### 2. Run the Go Example Application
```bash
# Navigate to the go-example directory
cd module_integration/examples/go-example

# Install dependencies
go mod tidy

# Run the application
go run main.go
```

### 3. Access the Application
Open your browser and navigate to:
```
http://localhost:8080
```

## 🏗️ Architecture Overview

### Service Flow
```
Go Example App (8080) → Go Backend (3000) → Python Training Service (3001)
        ↓                      ↓                         ↓
    Handles UI           Pure API Proxy          ML Training & Processing
```

### Integration Features
- **Dynamic Modal Loading**: Training module UI loaded dynamically from frontend
- **Service Proxy Chain**: Clean separation of concerns across services  
- **WebSocket Support**: Real-time training progress and logs
- **Asset Proxying**: CSS, JS, and config files served through backend
- **Embedded Templates**: Go templates with embedded static files

### Current Implementation
This example demonstrates a **simplified, production-ready integration** with:

- ✅ **Clean Service Architecture**: Three-tier separation (UI → API → ML)
- ✅ **Dynamic Content Loading**: Modal HTML loaded from shared frontend
- ✅ **Proper Routing**: WebSocket and API requests properly proxied
- ✅ **Minimal Logging**: Reduced console spam for WebSocket connections
- ✅ **Error Handling**: Graceful fallbacks for service unavailability

## 🔧 Customization

### Port Configuration
The application uses the following default ports:
```bash
export PORT=8080                    # Go Example App UI
export TRAINING_SERVICE_URL=http://localhost:3000  # Backend API Service
```

### Environment Variables
```bash
# Optional: Override default ports
export PORT=9000                    # Change Go Example App port
export TRAINING_SERVICE_URL=http://localhost:3000  # Backend service URL
```

### Adding Custom Routes
```go
// Add your application routes before the catch-all home handler
mux.HandleFunc("/api/myapp/", myAppAPIHandler)
mux.HandleFunc("/", server.handleHome)  // Keep this last
```

### Template Customization
Modify `templates/index.html` to match your application's design:
```html
<title>{{.Title}}</title>
<!-- Your custom HTML here -->
<button onclick="openTrainingModal()">Start Training</button>
<!-- Training modal will be injected here -->
{{.ModalHTML}}
```

## 📝 Implementation Notes

### Key Features
- **Self-Contained**: All integration code included in `main.go`
- **Production Ready**: Proper error handling and service separation
- **Minimal Dependencies**: Uses only standard Go libraries + gorilla/websocket
- **Dynamic Loading**: Training module UI loaded from shared frontend assets

### Service Dependencies
1. **Go Backend Service** (port 3000): Must be running via Docker Compose
2. **Python Training Service** (port 3001): ML processing service
3. **Frontend Assets**: Shared CSS/JS/config files served through backend

### Integration Pattern
This example shows the **proxy pattern** where:
- Go Example App serves the UI and handles user interactions
- Go Backend Service acts as an API gateway and asset server
- Python Training Service handles the actual ML computations

For your own applications, you can:
1. **Copy the integration code** from this example
2. **Modify the templates** to match your UI design  
3. **Add your own routes** alongside the training module routes
4. **Customize the service URLs** via environment variables

## 🧪 Testing

### Test the Integration
1. **Start Services**: `docker compose up --build -d` (from project root)
2. **Run Go App**: `go run main.go` (from go-example directory)  
3. **Open Browser**: Navigate to `http://localhost:8080`
4. **Click Training Button**: Opens the training module modal
5. **Test Functionality**: Try model management and training features

### Verify Service Chain
- **Frontend**: http://localhost:8080 (Go Example App)
- **Backend API**: http://localhost:3000 (Go Backend Service)  
- **Training Service**: http://localhost:3001 (Python ML Service)
- **Health Check**: All services should respond to health endpoints

### Common Issues
- **Service Not Available**: Ensure Docker services are running with `docker compose ps`
- **Port Conflicts**: Check if ports 3000, 3001, or 8080 are already in use
- **Frontend Assets**: Verify CSS/JS files load correctly from backend service

This simplified example provides a **clean foundation** for integrating ML training capabilities into your Go web applications!
