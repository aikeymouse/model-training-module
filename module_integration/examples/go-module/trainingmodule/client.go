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
	// Proxy API calls to the Go backend service
	mux.HandleFunc(pathPrefix+"/api/", c.handleAPIProxy)
	mux.HandleFunc(pathPrefix+"/health", c.handleHealthCheck)
}

// RegisterAssetProxies registers handlers for frontend assets (CSS, JS, config)
func (c *Client) RegisterAssetProxies(mux *http.ServeMux) {
	mux.HandleFunc("/css/", c.handleAssetProxy)
	mux.HandleFunc("/js/", c.handleAssetProxy)
	mux.HandleFunc("/config/", c.handleAssetProxy)
	mux.HandleFunc("/api/", c.handleAssetProxy)
	mux.HandleFunc("/ws", c.handleAssetProxy)
}

// RegisterWebSocketProxy registers WebSocket proxy for script execution
func (c *Client) RegisterWebSocketProxy(mux *http.ServeMux, path string) {
	mux.HandleFunc(path, c.handleWebSocketProxy)
}

// LoadModalHTML fetches modal HTML from the training service API
func (c *Client) LoadModalHTML() (string, error) {
	url := c.ServiceURL + "/api/modal-html"

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
	// Remove the pathPrefix and forward to Go backend service
	targetPath := strings.TrimPrefix(r.URL.Path, "/training-module")
	targetURL := c.ServiceURL + targetPath

	c.proxyRequest(w, r, targetURL)
}

// handleHealthCheck proxies health check to the backend service
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
	targetURL := c.ServiceURL + r.URL.Path
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

	// Connect to the backend WebSocket
	backendURL := strings.Replace(c.ServiceURL, "http://", "ws://", 1) + r.URL.Path
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
