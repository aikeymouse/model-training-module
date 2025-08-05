package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins
	},
}

// Forward requests to the Python training service
func newProxy(targetHost string) (*httputil.ReverseProxy, error) {
	url, err := url.Parse(targetHost)
	if err != nil {
		return nil, err
	}
	proxy := httputil.NewSingleHostReverseProxy(url)
	return proxy, nil
}

func handleProxy(proxy *httputil.ReverseProxy) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Proxying request: %s", r.URL.Path)
		proxy.ServeHTTP(w, r)
	}
}

// WebSocket handler to proxy script execution to Python service
func handleScriptExecution(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}
	defer conn.Close()

	pythonServiceURL := os.Getenv("PYTHON_SERVICE_URL")
	if pythonServiceURL == "" {
		pythonServiceURL = "http://localhost:3001"
	}

	// Convert HTTP URL to WebSocket URL
	wsURL := strings.Replace(pythonServiceURL, "http://", "ws://", 1) + "/api/script/ws/execute"

	// Connect to Python service WebSocket
	pythonConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		log.Println("Error connecting to Python WebSocket:", err)
		conn.WriteMessage(websocket.TextMessage, []byte("Error connecting to Python service"))
		return
	}
	defer pythonConn.Close()

	// Proxy messages between client and Python service
	go func() {
		for {
			messageType, message, err := conn.ReadMessage()
			if err != nil {
				log.Println("Error reading from client:", err)
				break
			}
			if err := pythonConn.WriteMessage(messageType, message); err != nil {
				log.Println("Error writing to Python service:", err)
				break
			}
		}
	}()

	for {
		messageType, message, err := pythonConn.ReadMessage()
		if err != nil {
			log.Println("Error reading from Python service:", err)
			break
		}
		if err := conn.WriteMessage(messageType, message); err != nil {
			log.Println("Error writing to client:", err)
			break
		}
	}
}

func main() {
	pythonServiceURL := os.Getenv("PYTHON_SERVICE_URL")
	if pythonServiceURL == "" {
		pythonServiceURL = "http://localhost:3001" // Default for local dev
	}

	proxy, err := newProxy(pythonServiceURL)
	if err != nil {
		log.Fatal("Could not create proxy:", err)
	}

	// API-only backend - no HTML pages served
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"message": "Training Module Backend API", "status": "running", "frontend_url": "http://localhost:8080"}`))
		} else {
			http.NotFound(w, r)
		}
	})

	// Serve frontend assets (CSS, JS) but not HTML pages
	http.HandleFunc("/css/", func(w http.ResponseWriter, r *http.Request) {
		filePath := "./frontend" + r.URL.Path
		http.ServeFile(w, r, filePath)
	})

	http.HandleFunc("/js/", func(w http.ResponseWriter, r *http.Request) {
		filePath := "./frontend" + r.URL.Path
		http.ServeFile(w, r, filePath)
	})

	// Serve config files specifically
	http.HandleFunc("/config/", func(w http.ResponseWriter, r *http.Request) {
		// Remove /config/ prefix and serve from frontend/config/
		configPath := "./frontend" + r.URL.Path
		http.ServeFile(w, r, configPath)
	})

	// Proxy API requests to the Python service
	http.HandleFunc("/api/", handleProxy(proxy))

	// Handle WebSocket connections for script execution
	http.HandleFunc("/api/script/ws/execute", handleScriptExecution)

	log.Println("Go backend server starting on :3000")
	if err := http.ListenAndServe(":3000", nil); err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
