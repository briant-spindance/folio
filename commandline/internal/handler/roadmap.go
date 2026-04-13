package handler

import (
	"encoding/json"
	"net/http"
	"net/url"

	"github.com/briant-spindance/folio/internal/model"
	"github.com/briant-spindance/folio/internal/store"
	"github.com/go-chi/chi/v5"
)

// RoadmapHandler handles /api/roadmap routes.
type RoadmapHandler struct {
	roadmap *store.RoadmapStore
}

// NewRoadmapHandler creates a new RoadmapHandler.
func NewRoadmapHandler(r *store.RoadmapStore) *RoadmapHandler {
	return &RoadmapHandler{roadmap: r}
}

// Routes returns a chi router for /api/roadmap.
func (h *RoadmapHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Get("/", h.get)
	r.Put("/", h.save)

	r.Route("/cards", func(r chi.Router) {
		r.Post("/", h.createCard)
		r.Route("/{id}", func(r chi.Router) {
			r.Put("/", h.updateCard)
			r.Delete("/", h.deleteCard)
			r.Patch("/move", h.moveCard)
		})
	})

	r.Route("/rows", func(r chi.Router) {
		r.Post("/", h.createRow)
		r.Patch("/reorder", h.reorderRows)
		r.Route("/{label}", func(r chi.Router) {
			r.Put("/", h.updateRow)
			r.Delete("/", h.deleteRow)
		})
	})

	r.Route("/columns", func(r chi.Router) {
		r.Post("/", h.createColumn)
		r.Patch("/reorder", h.reorderColumns)
		r.Route("/{name}", func(r chi.Router) {
			r.Put("/", h.updateColumn)
			r.Delete("/", h.deleteColumn)
		})
	})

	return r
}

func (h *RoadmapHandler) get(w http.ResponseWriter, r *http.Request) {
	roadmap := h.roadmap.Get()
	JSON(w, 200, roadmap)
}

func (h *RoadmapHandler) save(w http.ResponseWriter, r *http.Request) {
	var input map[string]json.RawMessage
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}

	roadmap := h.roadmap.Get()

	if v, ok := input["title"]; ok {
		json.Unmarshal(v, &roadmap.Title)
	}
	if v, ok := input["columns"]; ok {
		json.Unmarshal(v, &roadmap.Columns)
	}
	if v, ok := input["rows"]; ok {
		json.Unmarshal(v, &roadmap.Rows)
	}
	if v, ok := input["cards"]; ok {
		// Cards may come with feature_slug, need to transform
		var rawCards []map[string]json.RawMessage
		if json.Unmarshal(v, &rawCards) == nil {
			cards := make([]model.RoadmapCard, 0, len(rawCards))
			for _, rc := range rawCards {
				var card model.RoadmapCard
				if v, ok := rc["id"]; ok {
					json.Unmarshal(v, &card.ID)
				}
				if v, ok := rc["title"]; ok {
					json.Unmarshal(v, &card.Title)
				}
				if v, ok := rc["notes"]; ok {
					json.Unmarshal(v, &card.Notes)
				}
				if v, ok := rc["column"]; ok {
					json.Unmarshal(v, &card.Column)
				}
				if v, ok := rc["row"]; ok {
					json.Unmarshal(v, &card.Row)
				}
				if v, ok := rc["order"]; ok {
					json.Unmarshal(v, &card.Order)
				}
				// Handle both feature_slug and featureSlug
				if v, ok := rc["feature_slug"]; ok {
					json.Unmarshal(v, &card.FeatureSlug)
				} else if v, ok := rc["featureSlug"]; ok {
					json.Unmarshal(v, &card.FeatureSlug)
				}
				cards = append(cards, card)
			}
			roadmap.Cards = cards
		}
	}

	saved := h.roadmap.Save(roadmap)
	JSON(w, 200, saved)
}

func (h *RoadmapHandler) createCard(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Title  string `json:"title"`
		Notes  string `json:"notes"`
		Column string `json:"column"`
		Row    string `json:"row"`
		Order  int    `json:"order"`
	}
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}
	if input.Title == "" {
		ErrorJSON(w, 422, "title: Title is required")
		return
	}
	if input.Column == "" {
		input.Column = "now"
	}

	card := h.roadmap.AddCard(model.RoadmapCard{
		Title:  input.Title,
		Notes:  input.Notes,
		Column: input.Column,
		Row:    input.Row,
		Order:  input.Order,
	})
	JSON(w, 201, card)
}

func (h *RoadmapHandler) updateCard(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var rawMap map[string]json.RawMessage
	if err := ReadJSON(r, &rawMap); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}

	updates := make(map[string]interface{})
	if v, ok := rawMap["title"]; ok {
		var s string
		json.Unmarshal(v, &s)
		updates["title"] = s
	}
	if v, ok := rawMap["notes"]; ok {
		var s string
		json.Unmarshal(v, &s)
		updates["notes"] = s
	}
	if v, ok := rawMap["column"]; ok {
		var s string
		json.Unmarshal(v, &s)
		updates["column"] = s
	}
	if v, ok := rawMap["row"]; ok {
		var s string
		json.Unmarshal(v, &s)
		updates["row"] = s
	}
	if v, ok := rawMap["order"]; ok {
		var n float64
		json.Unmarshal(v, &n)
		updates["order"] = int(n)
	}
	// Handle feature_slug -> featureSlug
	if v, ok := rawMap["feature_slug"]; ok {
		var s *string
		if json.Unmarshal(v, &s) == nil {
			if s == nil {
				updates["featureSlug"] = nil
			} else {
				updates["featureSlug"] = *s
			}
		}
	}

	card := h.roadmap.UpdateCard(id, updates)
	if card == nil {
		JSON(w, 404, map[string]interface{}{"error": "Card not found", "id": id})
		return
	}
	JSON(w, 200, card)
}

func (h *RoadmapHandler) deleteCard(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if !h.roadmap.DeleteCard(id) {
		JSON(w, 404, map[string]interface{}{"error": "Card not found", "id": id})
		return
	}
	JSON(w, 200, map[string]interface{}{"ok": true, "id": id})
}

func (h *RoadmapHandler) moveCard(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var input struct {
		Column *string `json:"column"`
		Row    *string `json:"row"`
		Order  *int    `json:"order"`
	}
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}

	card := h.roadmap.MoveCard(id, input.Column, input.Row, input.Order)
	if card == nil {
		JSON(w, 404, map[string]interface{}{"error": "Card not found", "id": id})
		return
	}
	JSON(w, 200, card)
}

func (h *RoadmapHandler) createRow(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Label string  `json:"label"`
		Color *string `json:"color"`
	}
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}
	if input.Label == "" {
		ErrorJSON(w, 422, "label: Label is required")
		return
	}

	row := h.roadmap.AddRow(input.Label, input.Color)
	JSON(w, 201, row)
}

func (h *RoadmapHandler) updateRow(w http.ResponseWriter, r *http.Request) {
	oldLabel, _ := url.PathUnescape(chi.URLParam(r, "label"))

	var rawMap map[string]json.RawMessage
	if err := ReadJSON(r, &rawMap); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}

	var newLabel *string
	var color *string
	if v, ok := rawMap["label"]; ok {
		var s string
		json.Unmarshal(v, &s)
		newLabel = &s
	}
	if v, ok := rawMap["color"]; ok {
		var s *string
		json.Unmarshal(v, &s)
		color = s
	}

	row := h.roadmap.UpdateRow(oldLabel, newLabel, color)
	if row == nil {
		JSON(w, 404, map[string]interface{}{"error": "Row not found", "label": oldLabel})
		return
	}
	JSON(w, 200, row)
}

func (h *RoadmapHandler) deleteRow(w http.ResponseWriter, r *http.Request) {
	label, _ := url.PathUnescape(chi.URLParam(r, "label"))
	if !h.roadmap.DeleteRow(label) {
		JSON(w, 404, map[string]interface{}{"error": "Row not found", "label": label})
		return
	}
	JSON(w, 200, map[string]interface{}{"ok": true, "label": label})
}

func (h *RoadmapHandler) reorderRows(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Labels []string `json:"labels"`
	}
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}
	if input.Labels == nil {
		ErrorJSON(w, 422, "labels: Required")
		return
	}
	h.roadmap.ReorderRows(input.Labels)
	JSON(w, 200, map[string]interface{}{"ok": true})
}

func (h *RoadmapHandler) createColumn(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name string `json:"name"`
	}
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}
	if input.Name == "" {
		ErrorJSON(w, 422, "name: Name is required")
		return
	}

	columns := h.roadmap.AddColumn(input.Name)
	JSON(w, 201, map[string]interface{}{"columns": columns})
}

func (h *RoadmapHandler) updateColumn(w http.ResponseWriter, r *http.Request) {
	oldName, _ := url.PathUnescape(chi.URLParam(r, "name"))
	var input struct {
		Name string `json:"name"`
	}
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}
	if input.Name == "" {
		ErrorJSON(w, 422, "name: Name is required")
		return
	}

	columns := h.roadmap.UpdateColumn(oldName, input.Name)
	if columns == nil {
		JSON(w, 404, map[string]interface{}{"error": "Column not found", "name": oldName})
		return
	}
	JSON(w, 200, map[string]interface{}{"columns": columns})
}

func (h *RoadmapHandler) deleteColumn(w http.ResponseWriter, r *http.Request) {
	name, _ := url.PathUnescape(chi.URLParam(r, "name"))
	if !h.roadmap.DeleteColumn(name) {
		JSON(w, 404, map[string]interface{}{"error": "Column not found", "name": name})
		return
	}
	JSON(w, 200, map[string]interface{}{"ok": true, "name": name})
}

func (h *RoadmapHandler) reorderColumns(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Names []string `json:"names"`
	}
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}
	if input.Names == nil {
		ErrorJSON(w, 422, "names: Required")
		return
	}
	h.roadmap.ReorderColumns(input.Names)
	JSON(w, 200, map[string]interface{}{"ok": true})
}
