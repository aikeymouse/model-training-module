# Training Module Go Package

A reusable Go package for integrating the Model Training Module into Go applications.

## Quick Start

### 1. Setup Training Module Backend

Go to your project folder and run:

**macOS/Linux:**
```bash
curl -s https://raw.githubusercontent.com/aikeymouse/model-training-module/main/setup-standalone.sh | bash
cd model-training-module
docker compose pull && docker compose up
```

**Windows:**
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/aikeymouse/model-training-module/main/setup-standalone.ps1" -OutFile "setup.ps1"
.\setup.ps1
cd model-training-module
docker compose pull; docker compose up
```

This will create folders and download the latest docker images (v1.0.4).

### 2. Install Go Module

Update your `go.mod`:

```go
require github.com/aikeymouse/model-training-module/module_integration/examples/go-module v1.0.2
```

### 3. Update HTML Template

Update your `index.html`:

```html
<head>
    <!-- Include the actual training module CSS from container -->
    <link rel="stylesheet" href="/model-training/css/training-module.css">
</head>
<body>
    <!-- Training module button -->
    <button id="mt-open-model-modal-btn" class="btn-primary">Manage Models</button>
    
    <!-- Include modal HTML dynamically from frontend -->
    {{.ModalHTML}}
    
    <!-- Include the actual training module JavaScript from container -->
    <script type="module" src="/model-training/js/model.js"></script>
</body>
```

### 4. Update Go Application

Update your `main.go`:

```go
package main

import (
    "log"
    "net/http"
    "os"
    "html/template"
    "github.com/aikeymouse/model-training-module/module_integration/examples/go-module/trainingmodule"
)

// Server holds the application state and dependencies
type Server struct {
    trainingClient *trainingmodule.Client
    templates      *template.Template
    modalHTML      string
}

func main() {
    // Initialize training module client
    trainingServiceURL := os.Getenv("TRAINING_SERVICE_URL")
    if trainingServiceURL == "" {
        trainingServiceURL = "http://localhost:3000"
    }

    trainingClient := trainingmodule.TrainingModuleClient(trainingmodule.Config{
        ServiceURL:      trainingServiceURL,
        AllowAllOrigins: true, // For development
    })

    // Parse templates
    log.Println("Parsing templates...")
    templates, err := template.ParseGlob("templates/*.html")
    if err != nil {
        log.Fatal("Failed to parse templates:", err)
    }
    log.Printf("Successfully parsed %d templates", len(templates.Templates()))

    server := &Server{
        trainingClient: trainingClient,
        templates:      templates,
    }

    // Load modal HTML from API
    log.Println("Loading modal HTML from Go backend API...")
    modalHTML, err := trainingClient.LoadModalHTML()
    if err != nil {
        log.Printf("Warning: Failed to load modal HTML from API: %v", err)
        modalHTML = ""
    } else {
        log.Println("Successfully loaded modal HTML from API")
    }
    server.modalHTML = modalHTML

    // Create HTTP mux
    mux := http.NewServeMux()

    // Register training module asset proxies
    server.trainingClient.RegisterAssetProxies(mux)

    // Register training module routes
    server.trainingClient.RegisterRoutes(mux, "/model-training")

    // Application routes (put this LAST to catch only the root path)
    mux.HandleFunc("/", server.handleHome)

    // Start server
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("Server starting on port %s", port)
    log.Printf("Training service configured for: %s", trainingServiceURL)
    log.Printf("Open http://localhost:%s to access the application", port)

    if err := http.ListenAndServe(":"+port, mux); err != nil {
        log.Fatal("Server failed to start:", err)
    }
}

// handleHome serves the main application page
func (s *Server) handleHome(w http.ResponseWriter, r *http.Request) {
    // Only handle the exact root path
    if r.URL.Path != "/" {
        http.NotFound(w, r)
        return
    }

    log.Printf("Handling request: %s %s", r.Method, r.URL.Path)

    data := struct {
        Title           string
        TrainingEnabled bool
        ModalHTML       template.HTML
    }{
        Title:           "My Go Application with Training Module",
        TrainingEnabled: true,
        ModalHTML:       template.HTML(s.modalHTML),
    }

    log.Println("Executing index.html template...")
    if err := s.templates.ExecuteTemplate(w, "index.html", data); err != nil {
        http.Error(w, "Failed to render template", http.StatusInternalServerError)
        log.Printf("Template error: %v", err)
        return
    }
    log.Println("Template executed successfully")
}
```

### 5. Start Application

```bash
go run .
```

You should see logs like:
```
2025/08/08 17:46:25 Loading modal HTML from Go backend API...
2025/08/08 17:46:25 Successfully loaded modal HTML from API
2025/08/08 17:46:25 Setting up static file server...
2025/08/08 17:46:25 Server starting on port 8080
2025/08/08 17:46:25 Training service configured for: http://localhost:3000
```

### 6. Test Integration

1. Open http://localhost:8080/
2. Open Dev Tools > Sources
3. You should see `model-training` folder with:
   - `css/training-module.css`
   - `js/model.js` and `js/pipeline-config.js`
4. Click "Manage Models" button to open Model Training Pipeline

## Features

- **Conflict-Safe**: Uses specific route patterns to avoid conflicts with your application
- **Complete API Coverage**: Handles all training module endpoints (`/api/model/*`, `/api/pipeline/*`, etc.)
- **WebSocket Support**: Real-time script execution and training progress
- **Asset Management**: Automatic proxying of CSS, JS, and config files
- **Production Ready**: Clean routes, error handling, and no generic conflicts

## API Configuration

The module registers these routes for you:

**Prefixed Routes (conflict-safe):**
- `/model-training/css/*` - Stylesheets  
- `/model-training/js/*` - JavaScript files
- `/model-training/config/*` - Configuration files
- `/model-training/health` - Health check

**Specific API Routes (frontend compatibility):**
- `/api/models` - Model list
- `/api/model/*` - All model operations (load, test, delete, etc.)
- `/api/pipeline/*` - Pipeline operations (load, save)
- `/api/script/ws/execute` - WebSocket for training execution

## Configuration Options

- `ServiceURL`: URL of the training service backend (default: "http://localhost:3000")
- `AllowAllOrigins`: Whether to allow all origins for WebSocket connections (default: false)

## Example

See the [go-example](../go-example/) directory for a complete working example.

## Version History

- **v1.0.2**: Complete conflict prevention, comprehensive API coverage, asset proxy fixes
- **v1.0.1**: Removed legacy prefix support, production cleanup  
- **v1.0.0**: Initial release

## License

MIT License
