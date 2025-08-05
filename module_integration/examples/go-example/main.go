package main

import (
	"embed"
	"html/template"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/websocket"
)

//go:embed static/*
var staticFiles embed.FS

//go:embed templates/*
var templateFiles embed.FS

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// Copy the TrainingModuleIntegration code here or import it as a module
// For this example, we'll include a minimal version

// Minimal TrainingModuleIntegration struct for the example
type TrainingModuleIntegration struct {
	ServiceURL string
}

// NewTrainingModuleIntegration creates a new training module integration
func NewTrainingModuleIntegration(serviceURL string) (*TrainingModuleIntegration, error) {
	if serviceURL == "" {
		serviceURL = "http://localhost:3000"
	}
	return &TrainingModuleIntegration{
		ServiceURL: serviceURL,
	}, nil
}

// RegisterRoutes registers the training module routes (proxy to Go backend service)
func (t *TrainingModuleIntegration) RegisterRoutes(mux *http.ServeMux, pathPrefix string) {
	// Proxy API calls to the Go backend service
	mux.HandleFunc(pathPrefix+"/api/", func(w http.ResponseWriter, r *http.Request) {
		// Remove the pathPrefix and forward to Go backend service
		targetPath := strings.TrimPrefix(r.URL.Path, pathPrefix)
		targetURL := t.ServiceURL + targetPath

		// Create proxy request
		req, err := http.NewRequest(r.Method, targetURL, r.Body)
		if err != nil {
			http.Error(w, "Failed to create proxy request", http.StatusInternalServerError)
			return
		}

		// Copy headers
		for key, values := range r.Header {
			for _, value := range values {
				req.Header.Add(key, value)
			}
		}

		// Make request to Go backend service
		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			http.Error(w, "Go backend service not available", http.StatusServiceUnavailable)
			return
		}
		defer resp.Body.Close()

		// Copy response
		for key, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	})

	mux.HandleFunc(pathPrefix+"/health", func(w http.ResponseWriter, r *http.Request) {
		// Proxy health check to Go backend service
		targetURL := t.ServiceURL + "/health"

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
	})
}

type Server struct {
	trainingModule *TrainingModuleIntegration
	templates      *template.Template
	modalHTML      string
}

// loadModalHTMLFromFrontend reads the modal HTML from the frontend index.html file
func loadModalHTMLFromFrontend() (string, error) {
	frontendPath := "../../../frontend/index.html"
	content, err := os.ReadFile(frontendPath)
	if err != nil {
		return "", err
	}

	// Since the backend no longer serves HTML directly, we can load the entire
	// modal section from the frontend index.html for integration into our template
	html := string(content)

	// Extract modal sections - everything between modal comments
	startMarker := `<!-- Model Info Modal -->`
	endMarker := `<script type="module"`

	startIdx := strings.Index(html, startMarker)
	endIdx := strings.Index(html, endMarker)

	if startIdx != -1 && endIdx != -1 && endIdx > startIdx {
		return html[startIdx:endIdx], nil
	}

	// If we can't find the modal section, return empty (app will work without modal)
	return "", nil
}

func main() {
	// Initialize training module integration
	trainingServiceURL := os.Getenv("TRAINING_SERVICE_URL")
	if trainingServiceURL == "" {
		trainingServiceURL = "http://localhost:3000" // Go backend service, not training service directly
	}

	trainingModule, err := NewTrainingModuleIntegration(trainingServiceURL)
	if err != nil {
		log.Fatal("Failed to initialize training module integration:", err)
	}

	// Parse templates
	log.Println("Parsing templates...")
	templates, err := template.ParseFS(templateFiles, "templates/*.html")
	if err != nil {
		log.Fatal("Failed to parse templates:", err)
	}
	log.Printf("Successfully parsed %d templates", len(templates.Templates()))

	// Load modal HTML from frontend
	log.Println("Loading modal HTML from frontend...")
	modalHTML, err := loadModalHTMLFromFrontend()
	if err != nil {
		log.Printf("Warning: Failed to load modal HTML from frontend: %v", err)
		modalHTML = "" // Continue without modal HTML
	} else {
		log.Println("Successfully loaded modal HTML from frontend")
	}

	server := &Server{
		trainingModule: trainingModule,
		templates:      templates,
		modalHTML:      modalHTML,
	}

	// Create HTTP mux
	mux := http.NewServeMux()

	// Serve static files (CSS, JS, images) - our app-specific files
	log.Println("Setting up static file server...")
	staticFS, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Fatal("Failed to create static file system:", err)
	}
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.FS(staticFS))))

	// Proxy frontend assets from training module container
	mux.HandleFunc("/css/", server.proxyFrontendAssets)
	mux.HandleFunc("/js/", server.proxyFrontendAssets)
	mux.HandleFunc("/config/", server.proxyFrontendAssets)

	// Proxy API calls to the Go backend service
	mux.HandleFunc("/api/", server.proxyFrontendAssets)

	// Handle WebSocket connections for script execution only
	mux.HandleFunc("/api/script/ws/execute", server.handleWebSocket)

	// Handle /ws endpoint - redirect or proxy as HTTP
	mux.HandleFunc("/ws", server.proxyFrontendAssets)

	// Register training module routes
	trainingModule.RegisterRoutes(mux, "/training-module")

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

// handleWebSocket proxies WebSocket connections to the Go backend service
func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Upgrade the connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade WebSocket connection: %v", err)
		return
	}
	defer conn.Close()

	// Connect to the backend WebSocket
	backendURL := strings.Replace(s.trainingModule.ServiceURL, "http://", "ws://", 1) + r.URL.Path
	log.Printf("Connecting to backend WebSocket: %s", backendURL)

	backendConn, _, err := websocket.DefaultDialer.Dial(backendURL, nil)
	if err != nil {
		log.Printf("Failed to connect to backend WebSocket: %v", err)
		conn.WriteMessage(websocket.TextMessage, []byte("Failed to connect to backend service"))
		return
	}
	defer backendConn.Close()

	// Proxy messages between client and backend
	go func() {
		for {
			messageType, message, err := conn.ReadMessage()
			if err != nil {
				log.Printf("Error reading from client: %v", err)
				break
			}
			if err := backendConn.WriteMessage(messageType, message); err != nil {
				log.Printf("Error writing to backend: %v", err)
				break
			}
		}
	}()

	for {
		messageType, message, err := backendConn.ReadMessage()
		if err != nil {
			log.Printf("Error reading from backend: %v", err)
			break
		}
		if err := conn.WriteMessage(messageType, message); err != nil {
			log.Printf("Error writing to client: %v", err)
			break
		}
	}
}

// proxyFrontendAssets proxies frontend assets from the Go backend service
func (s *Server) proxyFrontendAssets(w http.ResponseWriter, r *http.Request) {
	// Build the URL to the Go backend service
	targetURL := s.trainingModule.ServiceURL + r.URL.Path

	// Only log important requests to reduce spam
	if r.URL.Path != "/api/model/loaded" && r.URL.Path != "/ws" {
		log.Printf("Proxying frontend asset: %s -> %s", r.URL.Path, targetURL)
	}

	// Create a new request to the Go backend service
	req, err := http.NewRequest(r.Method, targetURL, r.Body)
	if err != nil {
		log.Printf("Failed to create proxy request: %v", err)
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
		log.Printf("Failed to proxy request to Go backend service: %v", err)
		http.Error(w, "Go backend service not available", http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Set status code
	w.WriteHeader(resp.StatusCode)

	// Copy response body
	_, err = io.Copy(w, resp.Body)
	if err != nil {
		log.Printf("Failed to copy response body: %v", err)
	}
}
