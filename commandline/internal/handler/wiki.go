package handler

import (
	"net/http"

	"github.com/briantol/folio/internal/model"
	"github.com/briantol/folio/internal/store"
	"github.com/go-chi/chi/v5"
)

// WikiHandler handles /api/wiki routes.
type WikiHandler struct {
	wiki *store.WikiStore
}

// NewWikiHandler creates a new WikiHandler.
func NewWikiHandler(w *store.WikiStore) *WikiHandler {
	return &WikiHandler{wiki: w}
}

// Routes returns a chi router for /api/wiki.
func (h *WikiHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Get("/", h.list)
	r.Post("/", h.create)
	r.Patch("/reorder", h.reorder)

	r.Route("/{slug}", func(r chi.Router) {
		r.Get("/", h.get)
		r.Put("/", h.update)
		r.Delete("/", h.delete)
	})

	return r
}

func (h *WikiHandler) list(w http.ResponseWriter, r *http.Request) {
	page := QueryInt(r, "page", 1, 1, 999999)
	limit := QueryInt(r, "limit", 50, 1, 100)
	result := h.wiki.List(page, limit)
	JSON(w, 200, result)
}

func (h *WikiHandler) get(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	doc := h.wiki.Get(slug)
	if doc == nil {
		JSON(w, 404, map[string]interface{}{"error": "Document not found", "slug": slug})
		return
	}
	JSON(w, 200, doc)
}

func (h *WikiHandler) create(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Title string  `json:"title"`
		Icon  *string `json:"icon"`
		Body  string  `json:"body"`
	}
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}
	if input.Title == "" {
		ErrorJSON(w, 422, "title: Title is required")
		return
	}

	baseSlug := store.SlugifyTitle(input.Title)
	slug := h.wiki.UniqueSlug(baseSlug)

	doc := h.wiki.Save(slug, model.SaveWikiDocInput{
		Title: input.Title,
		Icon:  input.Icon,
		Body:  input.Body,
	})
	if doc == nil {
		ErrorJSON(w, 500, "Failed to create doc")
		return
	}

	// Add slug to response (matching TypeScript behavior)
	response := map[string]interface{}{
		"slug":        doc.Slug,
		"title":       doc.Title,
		"description": doc.Description,
		"icon":        doc.Icon,
		"updated_at":  doc.UpdatedAt,
		"body":        doc.Body,
		"order":       doc.Order,
		"dirty":       doc.Dirty,
	}
	JSON(w, 201, response)
}

func (h *WikiHandler) update(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	var input struct {
		Title string  `json:"title"`
		Icon  *string `json:"icon"`
		Body  string  `json:"body"`
	}
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}
	if input.Title == "" {
		ErrorJSON(w, 422, "title: Title is required")
		return
	}

	doc := h.wiki.Save(slug, model.SaveWikiDocInput{
		Title: input.Title,
		Icon:  input.Icon,
		Body:  input.Body,
	})
	if doc == nil {
		ErrorJSON(w, 500, "Failed to save doc")
		return
	}
	JSON(w, 200, doc)
}

func (h *WikiHandler) delete(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if !h.wiki.Delete(slug) {
		JSON(w, 404, map[string]interface{}{"error": "Document not found", "slug": slug})
		return
	}
	JSON(w, 200, map[string]interface{}{"ok": true, "slug": slug})
}

func (h *WikiHandler) reorder(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Slugs []string `json:"slugs"`
	}
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}
	if input.Slugs == nil {
		ErrorJSON(w, 422, "slugs: Required")
		return
	}
	h.wiki.Reorder(input.Slugs)
	JSON(w, 200, map[string]interface{}{"ok": true})
}
