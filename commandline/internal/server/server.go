// Package server sets up the HTTP server with all routes.
package server

import (
	"io"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/briant-spindance/folio/internal/handler"
	"github.com/briant-spindance/folio/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// New creates a new chi router with all routes mounted.
// The optional logWriter controls where request logs are written.
// If nil, logs are written to os.Stderr.
func New(paths *store.Paths, frontendFS fs.FS, logWriter ...io.Writer) chi.Router {
	// Create stores
	featureStore := store.NewFeatureStore(paths)
	issueStore := store.NewIssueStore(paths)
	wikiStore := store.NewWikiStore(paths)
	roadmapStore := store.NewRoadmapStore(paths)
	teamStore := store.NewTeamStore(paths)
	sessionStore := store.NewSessionStore(paths)
	searchStore := store.NewSearchStore(featureStore, issueStore, wikiStore, roadmapStore)
	projectDocStore := store.NewProjectDocStore(paths)

	// Create handlers
	statusHandler := handler.NewStatusHandler(paths, featureStore, issueStore, wikiStore, teamStore, roadmapStore)
	featuresHandler := handler.NewFeaturesHandler(featureStore, roadmapStore)
	issuesHandler := handler.NewIssuesHandler(issueStore)
	wikiHandler := handler.NewWikiHandler(wikiStore)
	roadmapHandler := handler.NewRoadmapHandler(roadmapStore)
	searchHandler := handler.NewSearchHandler(searchStore)
	gitHandler := handler.NewGitHandler(paths.Root)
	sessionsHandler := handler.NewSessionsHandler(sessionStore)
	projectDocsHandler := handler.NewProjectDocsHandler(projectDocStore)

	r := chi.NewRouter()

	// Middleware — configure request logger output.
	var w io.Writer = os.Stderr
	if len(logWriter) > 0 && logWriter[0] != nil {
		w = logWriter[0]
	}
	r.Use(middleware.RequestLogger(&middleware.DefaultLogFormatter{
		Logger:  log.New(w, "", log.LstdFlags),
		NoColor: w != os.Stderr,
	}))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: false,
	}))

	// API routes
	r.Handle("/api/status", statusHandler)
	r.Mount("/api/features", featuresHandler.Routes())
	r.Mount("/api/issues", issuesHandler.Routes())
	r.Mount("/api/wiki", wikiHandler.Routes())
	r.Mount("/api/project-docs", projectDocsHandler.Routes())
	r.Mount("/api/roadmap", roadmapHandler.Routes())
	r.Handle("/api/search", searchHandler)
	r.Handle("/api/git", gitHandler)
	r.Mount("/api/ai-sessions", sessionsHandler.Routes())

	// Chat endpoint returns 501 (not implemented in Go yet)
	r.Post("/api/chat", func(w http.ResponseWriter, r *http.Request) {
		handler.JSON(w, 501, map[string]string{"error": "Chat endpoint not implemented in Go server. Use the Node.js API for AI chat."})
	})

	// Catch-all 501 for unimplemented API routes
	r.Handle("/api/*", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handler.JSON(w, 501, map[string]interface{}{"error": "Not implemented", "path": r.URL.Path})
	}))

	// Serve frontend SPA
	if frontendFS != nil {
		r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
			path := strings.TrimPrefix(r.URL.Path, "/")
			if path == "" {
				path = "index.html"
			}

			// Try to serve a pre-compressed .gz variant if the client supports it.
			if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
				gzPath := path + ".gz"
				if f, err := frontendFS.Open(gzPath); err == nil {
					f.Close()
					serveGzipFile(w, frontendFS, gzPath, path)
					return
				}
			}

			// Serve the original file if it exists.
			if f, err := frontendFS.Open(path); err == nil {
				f.Close()
				http.FileServer(http.FS(frontendFS)).ServeHTTP(w, r)
				return
			}

			// SPA fallback: serve index.html for client-side routing.
			r.URL.Path = "/"
			http.FileServer(http.FS(frontendFS)).ServeHTTP(w, r)
		})
	}

	return r
}

// serveGzipFile serves a pre-compressed .gz file from the FS with the
// correct Content-Type (inferred from the original filename) and
// Content-Encoding: gzip header.
func serveGzipFile(w http.ResponseWriter, fsys fs.FS, gzPath, originalPath string) {
	f, err := fsys.Open(gzPath)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	defer f.Close()

	// Determine Content-Type from the original (non-.gz) extension.
	ct := mime.TypeByExtension(filepath.Ext(originalPath))
	if ct == "" {
		ct = "application/octet-stream"
	}

	w.Header().Set("Content-Encoding", "gzip")
	w.Header().Set("Content-Type", ct)
	// Prevent intermediate caches from serving gzip to non-gzip clients.
	w.Header().Set("Vary", "Accept-Encoding")

	w.WriteHeader(http.StatusOK)
	io.Copy(w, f)
}
