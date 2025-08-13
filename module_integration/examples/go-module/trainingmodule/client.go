// Package trainingmodule provides easy integration with the Model Training Module
// for Go applications. It handles API proxying, WebSocket connections, and
// provides a simple interface to embed training capabilities.
package trainingmodule

import (
	"io"
	"net/http"
	"strings"

	"github.com/gorilla/websocket"
)

// Client represents a training module integration client
type Client struct {
	ServiceURL string
	upgrader   websocket.Upgrader
}

// Config holds configuration options for the training module client
type Config struct {
	ServiceURL      string
	AllowAllOrigins bool
}

// TrainingModuleClient creates a new training module integration client
func TrainingModuleClient(config Config) *Client {
	if config.ServiceURL == "" {
		config.ServiceURL = "http://localhost:3000"
	}

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return config.AllowAllOrigins
		},
	}

	return &Client{
		ServiceURL: config.ServiceURL,
		upgrader:   upgrader,
	}
}

// RegisterRoutes registers the training module routes with the provided mux
func (c *Client) RegisterRoutes(mux *http.ServeMux, pathPrefix string) {
	// Only register health check - API routes are handled by RegisterAssetProxies with specific patterns
	mux.HandleFunc(pathPrefix+"/health", c.handleHealthCheck)
}

// RegisterAssetProxies registers handlers for frontend assets (CSS, JS, config)
func (c *Client) RegisterAssetProxies(mux *http.ServeMux) {
	// Register WebSocket proxy for training execution - both prefixed and non-prefixed
	mux.HandleFunc("/model-training/api/script/ws/execute", c.handleWebSocketProxy)
	mux.HandleFunc("/api/script/ws/execute", c.handleWebSocketProxy) // For frontend JS compatibility

	// Register frontend asset routes with /model-training prefix only
	mux.HandleFunc("/model-training/", c.handleAssetProxy)
	mux.HandleFunc("/model-training/css/", c.handleAssetProxy)
	mux.HandleFunc("/model-training/js/", c.handleAssetProxy)

	// Register specific API endpoints used by frontend JavaScript (non-generic to avoid conflicts)
	mux.HandleFunc("/api/models", c.handleAPIProxy)                      // Specific endpoint
	mux.HandleFunc("/api/model/", c.handleAPIProxy)                      // All /api/model/* endpoints
	mux.HandleFunc("/api/pipeline/", c.handleAPIProxy)                   // All /api/pipeline/* endpoints
	mux.HandleFunc("/api/dataset/", c.handleAPIProxy)                    // All /api/dataset/* endpoints
	mux.HandleFunc("/config/training-pipeline.json", c.handleAssetProxy) // Specific config file
}

// LoadModalHTML fetches modal HTML from the training service API
func (c *Client) LoadModalHTML() (string, error) {
	url := c.ServiceURL + "/api/model/modal-html"

	resp, err := http.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", nil // Return empty if not found
	}

	content, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	return string(content), nil
}

// handleAPIProxy proxies API calls to the backend service
func (c *Client) handleAPIProxy(w http.ResponseWriter, r *http.Request) {
	// Don't proxy WebSocket upgrade requests - they should be handled by the WebSocket handler
	if r.Header.Get("Upgrade") == "websocket" {
		http.NotFound(w, r)
		return
	}

	// Remove the pathPrefix and forward to Go backend service
	targetPath := strings.TrimPrefix(r.URL.Path, "/model-training")
	targetURL := c.ServiceURL + targetPath

	c.proxyRequest(w, r, targetURL)
} // handleHealthCheck proxies health check to the backend service
func (c *Client) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	targetURL := c.ServiceURL + "/health"

	resp, err := http.Get(targetURL)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte(`{"status": "unavailable", "error": "Go backend service not reachable"}`))
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// handleAssetProxy proxies frontend assets from the backend service
func (c *Client) handleAssetProxy(w http.ResponseWriter, r *http.Request) {
	// Strip the /model-training prefix if present before forwarding to backend
	targetPath := r.URL.Path
	targetPath = strings.TrimPrefix(targetPath, "/model-training")
	targetURL := c.ServiceURL + targetPath

	// Set proper MIME types based on file extension
	if strings.HasSuffix(r.URL.Path, ".css") {
		w.Header().Set("Content-Type", "text/css")
	} else if strings.HasSuffix(r.URL.Path, ".js") {
		w.Header().Set("Content-Type", "application/javascript")
	} else if strings.HasSuffix(r.URL.Path, ".json") {
		w.Header().Set("Content-Type", "application/json")
	}

	c.proxyRequest(w, r, targetURL)
}

// handleWebSocketProxy proxies WebSocket connections to the backend service
func (c *Client) handleWebSocketProxy(w http.ResponseWriter, r *http.Request) {
	// Upgrade the connection to WebSocket
	conn, err := c.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Use the same path for backend connection
	backendPath := "/api/script/ws/execute"

	// Convert HTTP URL to WebSocket URL more robustly
	backendURL := c.ServiceURL
	if strings.HasPrefix(backendURL, "http://") {
		backendURL = strings.Replace(backendURL, "http://", "ws://", 1)
	} else if strings.HasPrefix(backendURL, "https://") {
		backendURL = strings.Replace(backendURL, "https://", "wss://", 1)
	} else {
		// If no protocol, assume ws://
		backendURL = "ws://" + backendURL
	}
	backendURL += backendPath

	backendConn, _, err := websocket.DefaultDialer.Dial(backendURL, nil)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("Failed to connect to backend service"))
		return
	}
	defer backendConn.Close()

	// Proxy messages between client and backend
	go func() {
		for {
			messageType, message, err := conn.ReadMessage()
			if err != nil {
				break
			}
			if err := backendConn.WriteMessage(messageType, message); err != nil {
				break
			}
		}
	}()

	for {
		messageType, message, err := backendConn.ReadMessage()
		if err != nil {
			break
		}
		if err := conn.WriteMessage(messageType, message); err != nil {
			break
		}
	}
}

// proxyRequest is a helper function to proxy HTTP requests
func (c *Client) proxyRequest(w http.ResponseWriter, r *http.Request, targetURL string) {
	// Create a new request to the backend service
	req, err := http.NewRequest(r.Method, targetURL, r.Body)
	if err != nil {
		http.Error(w, "Failed to proxy request", http.StatusInternalServerError)
		return
	}

	// Copy headers
	for key, values := range r.Header {
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}

	// Make the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Backend service not available", http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Set status code and copy response body
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
