// Package server sets up the HTTP server with all routes.
package server

import (
	"context"
	"io"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/briant-spindance/folio/internal/handler"
	"github.com/briant-spindance/folio/internal/registry"
	"github.com/briant-spindance/folio/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

type contextKey string

const managerKey contextKey = "store-manager"

// ManagerFromContext retrieves the store.Manager for the current request.
func ManagerFromContext(ctx context.Context) *store.Manager {
	if m, ok := ctx.Value(managerKey).(*store.Manager); ok {
		return m
	}
	return nil
}

// New creates a new chi router with all routes mounted.
// The optional logWriter controls where request logs are written.
// If nil, logs are written to os.Stderr.
func New(reg *registry.Registry, mgr *store.Manager, frontendFS fs.FS, logWriter ...io.Writer) chi.Router {
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

	// --- Top-level project list endpoint ---
	r.Get("/api/projects", func(w http.ResponseWriter, r *http.Request) {
		projects := reg.Projects()
		active := reg.Active()
		type projectJSON struct {
			Slug   string `json:"slug"`
			Name   string `json:"name"`
			Path   string `json:"path"`
			Active bool   `json:"active"`
		}
		list := make([]projectJSON, len(projects))
		for i, p := range projects {
			list[i] = projectJSON{
				Slug:   p.Slug,
				Name:   p.Name,
				Path:   p.Path,
				Active: p.Slug == active,
			}
		}
		handler.JSON(w, 200, map[string]interface{}{
			"projects": list,
			"active":   active,
		})
	})

	// --- Project-scoped API routes ---
	r.Route("/api/projects/{projectSlug}", func(pr chi.Router) {
		// Middleware: resolve project, hot-swap if needed.
		pr.Use(projectMiddleware(reg, mgr))

		// Activate endpoint.
		pr.Post("/activate", func(w http.ResponseWriter, r *http.Request) {
			slug := chi.URLParam(r, "projectSlug")
			if err := reg.Activate(slug); err != nil {
				handler.ErrorJSON(w, 400, err.Error())
				return
			}
			proj := reg.Get(slug)
			if proj != nil {
				mgr.Rebuild(store.NewPaths(proj.Path))
			}
			handler.JSON(w, 200, map[string]interface{}{"ok": true, "active": slug})
		})

		// Status
		pr.Get("/status", managerHandler(mgr, func(m *store.Manager) http.Handler {
			return handler.NewStatusHandler(m.Paths(), m.Features, m.Issues, m.Wiki, m.Team, m.Roadmap, m.ProjectDocs)
		}))

		// Features
		pr.Mount("/features", managerRouter(mgr, func(m *store.Manager) chi.Router {
			return handler.NewFeaturesHandler(m.Features, m.Roadmap).Routes()
		}))

		// Issues
		pr.Mount("/issues", managerRouter(mgr, func(m *store.Manager) chi.Router {
			return handler.NewIssuesHandler(m.Issues).Routes()
		}))

		// Wiki
		pr.Mount("/wiki", managerRouter(mgr, func(m *store.Manager) chi.Router {
			return handler.NewWikiHandler(m.Wiki).Routes()
		}))

		// Project Docs
		pr.Mount("/project-docs", managerRouter(mgr, func(m *store.Manager) chi.Router {
			return handler.NewProjectDocsHandler(m.ProjectDocs).Routes()
		}))

		// Roadmap
		pr.Mount("/roadmap", managerRouter(mgr, func(m *store.Manager) chi.Router {
			return handler.NewRoadmapHandler(m.Roadmap).Routes()
		}))

		// Search
		pr.Get("/search", managerHandler(mgr, func(m *store.Manager) http.Handler {
			return handler.NewSearchHandler(m.Search)
		}))

		// Git
		pr.Get("/git", managerHandler(mgr, func(m *store.Manager) http.Handler {
			return handler.NewGitHandler(m.Paths().Root)
		}))

		// AI Sessions
		pr.Mount("/ai-sessions", managerRouter(mgr, func(m *store.Manager) chi.Router {
			return handler.NewSessionsHandler(m.Sessions).Routes()
		}))

		// Chat endpoint returns 501 (not implemented in Go yet)
		pr.Post("/chat", func(w http.ResponseWriter, r *http.Request) {
			handler.JSON(w, 501, map[string]string{"error": "Chat endpoint not implemented in Go server. Use the Node.js API for AI chat."})
		})
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

// projectMiddleware validates the project slug and hot-swaps stores if needed.
func projectMiddleware(reg *registry.Registry, mgr *store.Manager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			slug := chi.URLParam(r, "projectSlug")

			proj := reg.Get(slug)
			if proj == nil {
				handler.JSON(w, 404, map[string]string{"error": "Project not found: " + slug})
				return
			}

			// Hot-swap if the requested project differs from what's loaded.
			currentPaths := mgr.Paths()
			if currentPaths.Root != proj.Path {
				mgr.Rebuild(store.NewPaths(proj.Path))
			}

			ctx := context.WithValue(r.Context(), managerKey, mgr)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// managerHandler creates an http.HandlerFunc that acquires a read lock on the
// manager, builds a handler from the current stores, and delegates.
func managerHandler(mgr *store.Manager, factory func(*store.Manager) http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		mgr.RLock()
		defer mgr.RUnlock()
		h := factory(mgr)
		h.ServeHTTP(w, r)
	}
}

// managerRouter creates an http.Handler that acquires a read lock on the
// manager, builds a chi.Router from the current stores, and delegates.
func managerRouter(mgr *store.Manager, factory func(*store.Manager) chi.Router) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mgr.RLock()
		defer mgr.RUnlock()
		router := factory(mgr)
		router.ServeHTTP(w, r)
	})
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
