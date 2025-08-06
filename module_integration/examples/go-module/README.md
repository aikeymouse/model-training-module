# Training Module Go Package

A reusable Go package for integrating the Model Training Module into Go applications.

## Installation

```bash
go get github.com/aikeymouse/model-training-module/module_integration/go-module
```

## Usage

```go
package main

import (
    "net/http"
    "github.com/aikeymouse/model-training-module/module_integration/go-module/trainingmodule"
)

func main() {
    // Initialize the training module client
    client := trainingmodule.TrainingModuleClient(trainingmodule.Config{
        ServiceURL:      "http://localhost:3000", // Your training service URL
        AllowAllOrigins: true,                    // For development
    })

    // Create HTTP mux
    mux := http.NewServeMux()

    // Register training module routes
    client.RegisterRoutes(mux, "/training-module")
    client.RegisterAssetProxies(mux)
    client.RegisterWebSocketProxy(mux, "/api/script/ws/execute")

    // Load modal HTML (optional)
    modalHTML, err := client.LoadModalHTML()
    if err != nil {
        // Handle error or continue without modal
    }

    // Your other routes...
    mux.HandleFunc("/", yourHomeHandler)

    // Start server
    http.ListenAndServe(":8080", mux)
}
```

## Features

- **Easy Integration**: Simple constructor with configuration options
- **Complete API Proxying**: Handles all training module API endpoints
- **WebSocket Support**: Built-in WebSocket proxying for real-time script execution
- **Asset Management**: Automatic proxying of frontend assets (CSS, JS, config files)
- **Health Checks**: Built-in health monitoring for the training service
- **Production Ready**: Configurable CORS, error handling, and logging

## Configuration Options

- `ServiceURL`: URL of the training service backend (default: "http://localhost:3000")
- `AllowAllOrigins`: Whether to allow all origins for WebSocket connections (default: false)

## Example

See the [go-example](../go-example/) directory for a complete working example.

## License

MIT License
