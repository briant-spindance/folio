package handler

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/briantol/folio/internal/model"
	"github.com/briantol/folio/internal/store"
	"github.com/go-chi/chi/v5"
)

// FeaturesHandler handles /api/features routes.
type FeaturesHandler struct {
	features *store.FeatureStore
	roadmap  *store.RoadmapStore
}

// NewFeaturesHandler creates a new FeaturesHandler.
func NewFeaturesHandler(f *store.FeatureStore, r *store.RoadmapStore) *FeaturesHandler {
	return &FeaturesHandler{features: f, roadmap: r}
}

// Routes returns a chi router for /api/features.
func (h *FeaturesHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Get("/", h.list)
	r.Post("/", h.create)
	r.Patch("/reorder", h.reorder)

	r.Route("/{slug}", func(r chi.Router) {
		r.Get("/", h.get)
		r.Put("/", h.update)
		r.Delete("/", h.delete)

		r.Get("/artifacts", h.listArtifacts)
		r.Post("/artifacts/upload", h.uploadArtifact)
		r.Post("/artifacts/create", h.createArtifact)

		r.Route("/artifacts/{filename}", func(r chi.Router) {
			r.Get("/", h.getArtifact)
			r.Put("/", h.saveArtifact)
			r.Delete("/", h.deleteArtifact)
		})
	})

	return r
}

func (h *FeaturesHandler) list(w http.ResponseWriter, r *http.Request) {
	page := QueryInt(r, "page", 1, 1, 999999)
	limit := QueryInt(r, "limit", 25, 1, 100)

	// Assignee filter
	var assignee *string
	if v := r.URL.Query().Get("assignee"); v != "" {
		if v == "__unassigned__" {
			empty := ""
			assignee = &empty
		} else {
			assignee = &v
		}
	}

	params := model.ListFeaturesParams{
		Page:      page,
		Limit:     limit,
		Status:    QueryCSV(r, "status"),
		Priority:  QueryCSV(r, "priority"),
		Assignee:  assignee,
		PointsMin: QueryFloat(r, "points_min"),
		PointsMax: QueryFloat(r, "points_max"),
		Tags:      QueryCSV(r, "tags"),
		Sort:      r.URL.Query().Get("sort"),
		Dir:       r.URL.Query().Get("dir"),
	}
	if params.Sort == "" {
		params.Sort = "order"
	}
	if params.Dir == "" {
		params.Dir = "asc"
	}

	result := h.features.List(params)
	JSON(w, 200, result)
}

func (h *FeaturesHandler) get(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	feature := h.features.Get(slug)
	if feature == nil {
		JSON(w, 404, map[string]interface{}{"error": "Feature not found", "slug": slug})
		return
	}
	JSON(w, 200, feature)
}

func (h *FeaturesHandler) create(w http.ResponseWriter, r *http.Request) {
	var input model.CreateFeatureInput
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}

	if input.Title == "" {
		ErrorJSON(w, 422, "title: Title is required")
		return
	}

	feature, err := h.features.Create(input)
	if err != nil {
		msg := err.Error()
		if os.IsExist(err) || containsString(msg, "already exists") {
			ErrorJSON(w, 409, msg)
			return
		}
		ErrorJSON(w, 500, msg)
		return
	}

	// If created from a roadmap card, link the card back
	if input.RoadmapCardID != nil {
		h.roadmap.UpdateCard(*input.RoadmapCardID, map[string]interface{}{
			"featureSlug": feature.Slug,
		})
	}

	JSON(w, 201, feature)
}

func (h *FeaturesHandler) update(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	// Parse with raw JSON to detect which fields are present
	var rawMap map[string]json.RawMessage
	if err := ReadJSON(r, &rawMap); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}

	var input model.UpdateFeatureInput

	if v, ok := rawMap["title"]; ok {
		var s string
		if json.Unmarshal(v, &s) == nil {
			if s == "" {
				ErrorJSON(w, 422, "title: String must contain at least 1 character(s)")
				return
			}
			input.Title = &s
		}
	}
	if v, ok := rawMap["status"]; ok {
		var s string
		if json.Unmarshal(v, &s) == nil {
			input.Status = &s
		}
	}
	if v, ok := rawMap["priority"]; ok {
		var s string
		if json.Unmarshal(v, &s) == nil {
			input.Priority = &s
		}
	}
	if v, ok := rawMap["assignees"]; ok {
		input.AssigneesSet = true
		json.Unmarshal(v, &input.Assignees)
	}
	if v, ok := rawMap["points"]; ok {
		input.PointsSet = true
		json.Unmarshal(v, &input.Points)
	}
	if v, ok := rawMap["tags"]; ok {
		input.TagsSet = true
		json.Unmarshal(v, &input.Tags)
	}
	if v, ok := rawMap["body"]; ok {
		var s string
		if json.Unmarshal(v, &s) == nil {
			input.Body = &s
		}
	}

	feature, err := h.features.Update(slug, input)
	if err != nil {
		ErrorJSON(w, 500, err.Error())
		return
	}
	if feature == nil {
		JSON(w, 404, map[string]interface{}{"error": "Feature not found", "slug": slug})
		return
	}

	JSON(w, 200, feature)
}

func (h *FeaturesHandler) delete(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if !h.features.Delete(slug) {
		JSON(w, 404, map[string]interface{}{"error": "Feature not found", "slug": slug})
		return
	}
	JSON(w, 200, map[string]interface{}{"ok": true, "slug": slug})
}

func (h *FeaturesHandler) reorder(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Slugs  []string `json:"slugs"`
		Offset int      `json:"offset"`
	}
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}
	if input.Slugs == nil {
		ErrorJSON(w, 422, "slugs: Required")
		return
	}
	h.features.Reorder(input.Slugs, input.Offset)
	JSON(w, 200, map[string]interface{}{"ok": true})
}

func (h *FeaturesHandler) listArtifacts(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	artifacts, ok := h.features.ListArtifacts(slug)
	if !ok {
		JSON(w, 404, map[string]interface{}{"error": "Feature not found", "slug": slug})
		return
	}
	JSON(w, 200, artifacts)
}

func (h *FeaturesHandler) uploadArtifact(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		ErrorJSON(w, 400, "Invalid multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		ErrorJSON(w, 400, "file is required")
		return
	}
	defer file.Close()

	filename := header.Filename
	if filename == "" || filename == "FEATURE.md" {
		ErrorJSON(w, 400, "Invalid filename")
		return
	}

	data := make([]byte, header.Size)
	if _, err := file.Read(data); err != nil {
		ErrorJSON(w, 500, "Failed to read file")
		return
	}

	artifact := h.features.SaveArtifactBuffer(slug, filename, data)
	if artifact == nil {
		JSON(w, 404, map[string]interface{}{"error": "Feature not found", "slug": slug})
		return
	}
	JSON(w, 201, artifact)
}

func (h *FeaturesHandler) createArtifact(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	var input struct {
		Filename string `json:"filename"`
	}
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}
	if input.Filename == "" {
		ErrorJSON(w, 422, "filename: Filename is required")
		return
	}
	if input.Filename == "FEATURE.md" {
		ErrorJSON(w, 400, "Invalid filename")
		return
	}

	// Check if exists
	if _, _, ok := h.features.GetArtifactFilePath(slug, input.Filename); ok {
		JSON(w, 409, map[string]interface{}{"error": "File already exists", "filename": input.Filename})
		return
	}

	artifact := h.features.SaveArtifactContent(slug, input.Filename, "")
	if artifact == nil {
		JSON(w, 404, map[string]interface{}{"error": "Feature not found", "slug": slug})
		return
	}
	JSON(w, 201, artifact)
}

func (h *FeaturesHandler) getArtifact(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	filename := chi.URLParam(r, "filename")
	_, raw := r.URL.Query()["raw"]

	if raw || !store.IsTextArtifact(filename) {
		path, mime, ok := h.features.GetArtifactFilePath(slug, filename)
		if !ok {
			JSON(w, 404, map[string]interface{}{"error": "Artifact not found", "slug": slug, "filename": filename})
			return
		}
		w.Header().Set("Content-Type", mime)
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFile(w, r, path)
		return
	}

	content := h.features.GetArtifactContent(slug, filename)
	if content == nil {
		JSON(w, 404, map[string]interface{}{"error": "Artifact not found", "slug": slug, "filename": filename})
		return
	}
	JSON(w, 200, content)
}

func (h *FeaturesHandler) saveArtifact(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	filename := chi.URLParam(r, "filename")

	var input struct {
		Content string `json:"content"`
	}
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}

	artifact := h.features.SaveArtifactContent(slug, filename, input.Content)
	if artifact == nil {
		JSON(w, 404, map[string]interface{}{"error": "Feature not found or invalid filename", "slug": slug, "filename": filename})
		return
	}
	JSON(w, 200, artifact)
}

func (h *FeaturesHandler) deleteArtifact(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	filename := chi.URLParam(r, "filename")
	if !h.features.DeleteArtifact(slug, filename) {
		JSON(w, 404, map[string]interface{}{"error": "Artifact not found", "slug": slug, "filename": filename})
		return
	}
	JSON(w, 200, map[string]interface{}{"ok": true, "slug": slug, "filename": filename})
}

func containsString(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && len(substr) > 0 && findSubstring(s, substr))
}

func findSubstring(s, substr string) bool {
	for i := 0; i+len(substr) <= len(s); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
