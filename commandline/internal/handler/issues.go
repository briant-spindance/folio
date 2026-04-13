package handler

import (
	"encoding/json"
	"net/http"

	"github.com/briantol/folio/internal/model"
	"github.com/briantol/folio/internal/store"
	"github.com/go-chi/chi/v5"
)

// IssuesHandler handles /api/issues routes.
type IssuesHandler struct {
	issues *store.IssueStore
}

// NewIssuesHandler creates a new IssuesHandler.
func NewIssuesHandler(i *store.IssueStore) *IssuesHandler {
	return &IssuesHandler{issues: i}
}

// Routes returns a chi router for /api/issues.
func (h *IssuesHandler) Routes() chi.Router {
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

func (h *IssuesHandler) list(w http.ResponseWriter, r *http.Request) {
	page := QueryInt(r, "page", 1, 1, 999999)
	limit := QueryInt(r, "limit", 25, 1, 100)

	var assignee *string
	if v := r.URL.Query().Get("assignee"); v != "" {
		if v == "__unassigned__" {
			empty := ""
			assignee = &empty
		} else {
			assignee = &v
		}
	}

	var feature *string
	if v := r.URL.Query().Get("feature"); v != "" {
		if v == "__unlinked__" {
			empty := ""
			feature = &empty
		} else {
			feature = &v
		}
	}

	params := model.ListIssuesParams{
		Page:      page,
		Limit:     limit,
		Status:    QueryCSV(r, "status"),
		Type:      QueryCSV(r, "type"),
		Priority:  QueryCSV(r, "priority"),
		Assignee:  assignee,
		Feature:   feature,
		PointsMin: QueryFloat(r, "points_min"),
		PointsMax: QueryFloat(r, "points_max"),
		Labels:    QueryCSV(r, "labels"),
		Sort:      r.URL.Query().Get("sort"),
		Dir:       r.URL.Query().Get("dir"),
	}
	if params.Sort == "" {
		params.Sort = "order"
	}
	if params.Dir == "" {
		params.Dir = "asc"
	}

	result := h.issues.List(params)
	JSON(w, 200, result)
}

func (h *IssuesHandler) get(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	issue := h.issues.Get(slug)
	if issue == nil {
		JSON(w, 404, map[string]interface{}{"error": "Issue not found", "slug": slug})
		return
	}
	JSON(w, 200, issue)
}

func (h *IssuesHandler) create(w http.ResponseWriter, r *http.Request) {
	var input model.CreateIssueInput
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}

	if input.Title == "" {
		ErrorJSON(w, 422, "title: Title is required")
		return
	}

	issue, err := h.issues.Create(input)
	if err != nil {
		msg := err.Error()
		if containsString(msg, "already exists") || containsString(msg, "file exists") {
			ErrorJSON(w, 409, msg)
			return
		}
		ErrorJSON(w, 500, msg)
		return
	}

	JSON(w, 201, issue)
}

func (h *IssuesHandler) update(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	var rawMap map[string]json.RawMessage
	if err := ReadJSON(r, &rawMap); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}

	var input model.UpdateIssueInput

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
	if v, ok := rawMap["type"]; ok {
		var s string
		if json.Unmarshal(v, &s) == nil {
			input.Type = &s
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
	if v, ok := rawMap["sprint"]; ok {
		input.SprintSet = true
		json.Unmarshal(v, &input.Sprint)
	}
	if v, ok := rawMap["feature"]; ok {
		input.FeatureSet = true
		json.Unmarshal(v, &input.Feature)
	}
	if v, ok := rawMap["labels"]; ok {
		input.LabelsSet = true
		json.Unmarshal(v, &input.Labels)
	}
	if v, ok := rawMap["body"]; ok {
		var s string
		if json.Unmarshal(v, &s) == nil {
			input.Body = &s
		}
	}

	issue, err := h.issues.Update(slug, input)
	if err != nil {
		ErrorJSON(w, 500, err.Error())
		return
	}
	if issue == nil {
		JSON(w, 404, map[string]interface{}{"error": "Issue not found", "slug": slug})
		return
	}

	JSON(w, 200, issue)
}

func (h *IssuesHandler) delete(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if !h.issues.Delete(slug) {
		JSON(w, 404, map[string]interface{}{"error": "Issue not found", "slug": slug})
		return
	}
	JSON(w, 200, map[string]interface{}{"ok": true, "slug": slug})
}

func (h *IssuesHandler) reorder(w http.ResponseWriter, r *http.Request) {
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
	h.issues.Reorder(input.Slugs, input.Offset)
	JSON(w, 200, map[string]interface{}{"ok": true})
}

func (h *IssuesHandler) listArtifacts(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	artifacts, ok := h.issues.ListArtifacts(slug)
	if !ok {
		JSON(w, 404, map[string]interface{}{"error": "Issue not found", "slug": slug})
		return
	}
	JSON(w, 200, artifacts)
}

func (h *IssuesHandler) uploadArtifact(w http.ResponseWriter, r *http.Request) {
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
	if filename == "" || filename == "ISSUE.md" {
		ErrorJSON(w, 400, "Invalid filename")
		return
	}

	data := make([]byte, header.Size)
	if _, err := file.Read(data); err != nil {
		ErrorJSON(w, 500, "Failed to read file")
		return
	}

	artifact := h.issues.SaveArtifactBuffer(slug, filename, data)
	if artifact == nil {
		JSON(w, 404, map[string]interface{}{"error": "Issue not found", "slug": slug})
		return
	}
	JSON(w, 201, artifact)
}

func (h *IssuesHandler) createArtifact(w http.ResponseWriter, r *http.Request) {
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
	if input.Filename == "ISSUE.md" {
		ErrorJSON(w, 400, "Invalid filename")
		return
	}

	if _, _, ok := h.issues.GetArtifactFilePath(slug, input.Filename); ok {
		JSON(w, 409, map[string]interface{}{"error": "File already exists", "filename": input.Filename})
		return
	}

	artifact := h.issues.SaveArtifactContent(slug, input.Filename, "")
	if artifact == nil {
		JSON(w, 404, map[string]interface{}{"error": "Issue not found", "slug": slug})
		return
	}
	JSON(w, 201, artifact)
}

func (h *IssuesHandler) getArtifact(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	filename := chi.URLParam(r, "filename")
	_, raw := r.URL.Query()["raw"]

	if raw || !store.IsTextArtifact(filename) {
		path, mime, ok := h.issues.GetArtifactFilePath(slug, filename)
		if !ok {
			JSON(w, 404, map[string]interface{}{"error": "Artifact not found", "slug": slug, "filename": filename})
			return
		}
		w.Header().Set("Content-Type", mime)
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFile(w, r, path)
		return
	}

	content := h.issues.GetArtifactContent(slug, filename)
	if content == nil {
		JSON(w, 404, map[string]interface{}{"error": "Artifact not found", "slug": slug, "filename": filename})
		return
	}
	JSON(w, 200, content)
}

func (h *IssuesHandler) saveArtifact(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	filename := chi.URLParam(r, "filename")

	var input struct {
		Content string `json:"content"`
	}
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}

	artifact := h.issues.SaveArtifactContent(slug, filename, input.Content)
	if artifact == nil {
		JSON(w, 404, map[string]interface{}{"error": "Issue not found or invalid filename", "slug": slug, "filename": filename})
		return
	}
	JSON(w, 200, artifact)
}

func (h *IssuesHandler) deleteArtifact(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	filename := chi.URLParam(r, "filename")
	if !h.issues.DeleteArtifact(slug, filename) {
		JSON(w, 404, map[string]interface{}{"error": "Artifact not found", "slug": slug, "filename": filename})
		return
	}
	JSON(w, 200, map[string]interface{}{"ok": true, "slug": slug, "filename": filename})
}
