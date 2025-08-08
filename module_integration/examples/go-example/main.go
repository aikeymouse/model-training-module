package main

import (
	"embed"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"os"

	"github.com/aikeymouse/model-training-module/module_integration/examples/go-module/trainingmodule"
)

//go:embed static/*
var staticFiles embed.FS

//go:embed templates/*
var templateFiles embed.FS

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
	templates, err := template.ParseFS(templateFiles, "templates/*.html")
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

	// Serve static files (CSS, JS, images) - our app-specific files
	log.Println("Setting up static file server...")
	staticFS, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Fatal("Failed to create static file system:", err)
	}
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.FS(staticFS))))

	// Register training module asset proxies
	trainingClient.RegisterAssetProxies(mux)

	// Register training module routes
	trainingClient.RegisterRoutes(mux, "/model-training")

	// Handle favicon.ico to prevent 404 errors
	mux.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

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
