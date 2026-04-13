// Package server sets up the HTTP server with all routes.
package server

import (
	"io/fs"
	"net/http"
	"strings"

	"github.com/briantol/forge/internal/handler"
	"github.com/briantol/forge/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// New creates a new chi router with all routes mounted.
func New(paths *store.Paths, frontendFS fs.FS) chi.Router {
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
	statusHandler := handler.NewStatusHandler(featureStore, issueStore, wikiStore, teamStore, roadmapStore)
	featuresHandler := handler.NewFeaturesHandler(featureStore, roadmapStore)
	issuesHandler := handler.NewIssuesHandler(issueStore)
	wikiHandler := handler.NewWikiHandler(wikiStore)
	roadmapHandler := handler.NewRoadmapHandler(roadmapStore)
	searchHandler := handler.NewSearchHandler(searchStore)
	gitHandler := handler.NewGitHandler(paths.Root)
	sessionsHandler := handler.NewSessionsHandler(sessionStore)
	projectDocsHandler := handler.NewProjectDocsHandler(projectDocStore)

	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
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
		fileServer := http.FileServer(http.FS(frontendFS))
		r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
			// Try to serve the exact file first
			path := strings.TrimPrefix(r.URL.Path, "/")
			if path == "" {
				path = "index.html"
			}

			// Check if file exists in the embedded FS
			if f, err := frontendFS.Open(path); err == nil {
				f.Close()
				fileServer.ServeHTTP(w, r)
				return
			}

			// SPA fallback: serve index.html for client-side routing
			r.URL.Path = "/"
			fileServer.ServeHTTP(w, r)
		})
	}

	return r
}
