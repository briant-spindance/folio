package handler

import (
	"net/http"

	"github.com/briant-spindance/folio/internal/store"
	"github.com/go-chi/chi/v5"
)

// ProjectDocsHandler handles project document endpoints.
type ProjectDocsHandler struct {
	store *store.ProjectDocStore
}

// NewProjectDocsHandler creates a new ProjectDocsHandler.
func NewProjectDocsHandler(s *store.ProjectDocStore) *ProjectDocsHandler {
	return &ProjectDocsHandler{store: s}
}

// Routes returns the chi router for project doc endpoints.
func (h *ProjectDocsHandler) Routes() chi.Router {
	r := chi.NewRouter()

	// GET /api/project-docs — list all project docs
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		docs := h.store.List()
		JSON(w, 200, map[string]interface{}{"docs": docs})
	})

	// GET /api/project-docs/{slug} — get a single project doc
	r.Get("/{slug}", func(w http.ResponseWriter, r *http.Request) {
		slug := chi.URLParam(r, "slug")
		doc := h.store.Get(slug)
		if doc == nil {
			JSON(w, 404, map[string]interface{}{"error": "Document not found", "slug": slug})
			return
		}
		JSON(w, 200, doc)
	})

	return r
}
