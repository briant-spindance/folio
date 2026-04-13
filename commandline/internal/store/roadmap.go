package store

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"time"

	"github.com/briant-spindance/folio/internal/frontmatter"
	"github.com/briant-spindance/folio/internal/model"
)

// RoadmapStore provides filesystem-backed CRUD for the roadmap.
type RoadmapStore struct {
	paths *Paths
}

// NewRoadmapStore creates a new RoadmapStore.
func NewRoadmapStore(p *Paths) *RoadmapStore {
	return &RoadmapStore{paths: p}
}

// roadmapFrontmatter is the YAML frontmatter structure for roadmap.md
type roadmapCardFM struct {
	ID          string  `yaml:"id"`
	Title       string  `yaml:"title"`
	Notes       string  `yaml:"notes"`
	Column      string  `yaml:"column"`
	Row         string  `yaml:"row"`
	Order       int     `yaml:"order"`
	FeatureSlug *string `yaml:"featureSlug"`
}

type roadmapRowFM struct {
	Label string  `yaml:"label"`
	Color *string `yaml:"color"`
}

// Get returns the full roadmap.
func (s *RoadmapStore) Get() model.Roadmap {
	data, err := os.ReadFile(s.paths.Roadmap)
	if err != nil {
		return defaultRoadmap()
	}

	doc, err := frontmatter.Parse(data)
	if err != nil {
		return defaultRoadmap()
	}

	roadmap := model.Roadmap{
		Title:    frontmatter.GetString(doc.Data, "title"),
		Modified: frontmatter.GetStringPtr(doc.Data, "modified"),
	}

	// Parse columns
	roadmap.Columns = frontmatter.GetStringSlice(doc.Data, "columns")
	if len(roadmap.Columns) == 0 {
		roadmap.Columns = []string{"now", "next", "later"}
	}

	// Parse rows
	if rowsRaw, ok := doc.Data["rows"]; ok {
		if rowsSlice, ok := rowsRaw.([]interface{}); ok {
			for _, item := range rowsSlice {
				if m, ok := item.(map[string]interface{}); ok {
					row := model.RoadmapRow{
						Label: frontmatter.GetString(m, "label"),
						Color: frontmatter.GetStringPtr(m, "color"),
					}
					roadmap.Rows = append(roadmap.Rows, row)
				}
			}
		}
	}
	if roadmap.Rows == nil {
		roadmap.Rows = []model.RoadmapRow{}
	}

	// Parse cards
	if cardsRaw, ok := doc.Data["cards"]; ok {
		if cardsSlice, ok := cardsRaw.([]interface{}); ok {
			for _, item := range cardsSlice {
				if m, ok := item.(map[string]interface{}); ok {
					card := model.RoadmapCard{
						ID:          frontmatter.GetString(m, "id"),
						Title:       frontmatter.GetString(m, "title"),
						Notes:       frontmatter.GetString(m, "notes"),
						Column:      frontmatter.GetString(m, "column"),
						Row:         frontmatter.GetString(m, "row"),
						Order:       frontmatter.GetInt(m, "order"),
						FeatureSlug: frontmatter.GetStringPtr(m, "featureSlug"),
					}
					roadmap.Cards = append(roadmap.Cards, card)
				}
			}
		}
	}
	if roadmap.Cards == nil {
		roadmap.Cards = []model.RoadmapCard{}
	}

	return roadmap
}

func defaultRoadmap() model.Roadmap {
	return model.Roadmap{
		Title:   "Roadmap",
		Columns: []string{"now", "next", "later"},
		Rows:    []model.RoadmapRow{},
		Cards:   []model.RoadmapCard{},
	}
}

// Save writes the full roadmap to disk.
func (s *RoadmapStore) Save(roadmap model.Roadmap) model.Roadmap {
	data := map[string]interface{}{
		"title":   roadmap.Title,
		"columns": roadmap.Columns,
	}

	modified := time.Now().Format("2006-01-02")
	data["modified"] = modified
	roadmap.Modified = &modified

	// Serialize rows
	rows := make([]interface{}, len(roadmap.Rows))
	for i, r := range roadmap.Rows {
		rm := map[string]interface{}{
			"label": r.Label,
		}
		if r.Color != nil {
			rm["color"] = *r.Color
		} else {
			rm["color"] = nil
		}
		rows[i] = rm
	}
	data["rows"] = rows

	// Serialize cards
	cards := make([]interface{}, len(roadmap.Cards))
	for i, c := range roadmap.Cards {
		cm := map[string]interface{}{
			"id":     c.ID,
			"title":  c.Title,
			"notes":  c.Notes,
			"column": c.Column,
			"row":    c.Row,
			"order":  c.Order,
		}
		if c.FeatureSlug != nil {
			cm["featureSlug"] = *c.FeatureSlug
		} else {
			cm["featureSlug"] = nil
		}
		cards[i] = cm
	}
	data["cards"] = cards

	content, err := frontmatter.Stringify(data, "")
	if err != nil {
		return roadmap
	}

	os.WriteFile(s.paths.Roadmap, content, 0644)
	return roadmap
}

// AddCard adds a new card and returns it.
func (s *RoadmapStore) AddCard(card model.RoadmapCard) model.RoadmapCard {
	card.ID = generateID()
	roadmap := s.Get()
	roadmap.Cards = append(roadmap.Cards, card)
	s.Save(roadmap)
	return card
}

// UpdateCard updates a card by ID. Returns nil if not found.
func (s *RoadmapStore) UpdateCard(id string, updates map[string]interface{}) *model.RoadmapCard {
	roadmap := s.Get()
	for i, c := range roadmap.Cards {
		if c.ID == id {
			if v, ok := updates["title"]; ok {
				if s, ok := v.(string); ok {
					roadmap.Cards[i].Title = s
				}
			}
			if v, ok := updates["notes"]; ok {
				if s, ok := v.(string); ok {
					roadmap.Cards[i].Notes = s
				}
			}
			if v, ok := updates["column"]; ok {
				if s, ok := v.(string); ok {
					roadmap.Cards[i].Column = s
				}
			}
			if v, ok := updates["row"]; ok {
				if s, ok := v.(string); ok {
					roadmap.Cards[i].Row = s
				}
			}
			if v, ok := updates["order"]; ok {
				switch n := v.(type) {
				case int:
					roadmap.Cards[i].Order = n
				case float64:
					roadmap.Cards[i].Order = int(n)
				}
			}
			if _, ok := updates["featureSlug"]; ok {
				if v := updates["featureSlug"]; v == nil {
					roadmap.Cards[i].FeatureSlug = nil
				} else if s, ok := v.(string); ok {
					roadmap.Cards[i].FeatureSlug = &s
				}
			}
			s.Save(roadmap)
			return &roadmap.Cards[i]
		}
	}
	return nil
}

// DeleteCard removes a card by ID. Returns false if not found.
func (s *RoadmapStore) DeleteCard(id string) bool {
	roadmap := s.Get()
	for i, c := range roadmap.Cards {
		if c.ID == id {
			roadmap.Cards = append(roadmap.Cards[:i], roadmap.Cards[i+1:]...)
			s.Save(roadmap)
			return true
		}
	}
	return false
}

// MoveCard changes a card's position. Returns nil if not found.
func (s *RoadmapStore) MoveCard(id string, column, row *string, order *int) *model.RoadmapCard {
	roadmap := s.Get()
	for i, c := range roadmap.Cards {
		if c.ID == id {
			if column != nil {
				roadmap.Cards[i].Column = *column
			}
			if row != nil {
				roadmap.Cards[i].Row = *row
			}
			if order != nil {
				roadmap.Cards[i].Order = *order
			}
			s.Save(roadmap)
			return &roadmap.Cards[i]
		}
	}
	return nil
}

// AddRow adds a new swim lane.
func (s *RoadmapStore) AddRow(label string, color *string) model.RoadmapRow {
	roadmap := s.Get()
	row := model.RoadmapRow{Label: label, Color: color}
	roadmap.Rows = append(roadmap.Rows, row)
	s.Save(roadmap)
	return row
}

// UpdateRow updates a row. Returns nil if not found.
func (s *RoadmapStore) UpdateRow(oldLabel string, newLabel *string, color *string) *model.RoadmapRow {
	roadmap := s.Get()
	for i, r := range roadmap.Rows {
		if r.Label == oldLabel {
			if newLabel != nil {
				// Cascade rename to cards
				for j, c := range roadmap.Cards {
					if c.Row == oldLabel {
						roadmap.Cards[j].Row = *newLabel
					}
				}
				roadmap.Rows[i].Label = *newLabel
			}
			if color != nil {
				roadmap.Rows[i].Color = color
			}
			s.Save(roadmap)
			return &roadmap.Rows[i]
		}
	}
	return nil
}

// DeleteRow removes a row and its cards.
func (s *RoadmapStore) DeleteRow(label string) bool {
	roadmap := s.Get()
	found := false
	for i, r := range roadmap.Rows {
		if r.Label == label {
			roadmap.Rows = append(roadmap.Rows[:i], roadmap.Rows[i+1:]...)
			found = true
			break
		}
	}
	if !found {
		return false
	}

	// Remove cards in this row
	filtered := make([]model.RoadmapCard, 0, len(roadmap.Cards))
	for _, c := range roadmap.Cards {
		if c.Row != label {
			filtered = append(filtered, c)
		}
	}
	roadmap.Cards = filtered

	s.Save(roadmap)
	return true
}

// ReorderRows reorders rows by label array.
func (s *RoadmapStore) ReorderRows(labels []string) {
	roadmap := s.Get()
	rowMap := make(map[string]model.RoadmapRow)
	for _, r := range roadmap.Rows {
		rowMap[r.Label] = r
	}

	reordered := make([]model.RoadmapRow, 0, len(labels))
	for _, label := range labels {
		if r, ok := rowMap[label]; ok {
			reordered = append(reordered, r)
			delete(rowMap, label)
		}
	}
	// Append any rows not in the labels array
	for _, r := range roadmap.Rows {
		if _, ok := rowMap[r.Label]; ok {
			reordered = append(reordered, r)
		}
	}
	roadmap.Rows = reordered
	s.Save(roadmap)
}

// AddColumn appends a column. Returns the new column list.
func (s *RoadmapStore) AddColumn(name string) []string {
	roadmap := s.Get()
	roadmap.Columns = append(roadmap.Columns, name)
	s.Save(roadmap)
	return roadmap.Columns
}

// UpdateColumn renames a column. Returns nil if not found.
func (s *RoadmapStore) UpdateColumn(oldName, newName string) []string {
	roadmap := s.Get()
	found := false
	for i, col := range roadmap.Columns {
		if col == oldName {
			roadmap.Columns[i] = newName
			found = true
			break
		}
	}
	if !found {
		return nil
	}

	// Cascade rename to cards
	for i, c := range roadmap.Cards {
		if c.Column == oldName {
			roadmap.Cards[i].Column = newName
		}
	}

	s.Save(roadmap)
	return roadmap.Columns
}

// DeleteColumn removes a column and its cards. Returns false if not found.
func (s *RoadmapStore) DeleteColumn(name string) bool {
	roadmap := s.Get()
	found := false
	for i, col := range roadmap.Columns {
		if col == name {
			roadmap.Columns = append(roadmap.Columns[:i], roadmap.Columns[i+1:]...)
			found = true
			break
		}
	}
	if !found {
		return false
	}

	// Remove cards in this column
	filtered := make([]model.RoadmapCard, 0, len(roadmap.Cards))
	for _, c := range roadmap.Cards {
		if c.Column != name {
			filtered = append(filtered, c)
		}
	}
	roadmap.Cards = filtered

	s.Save(roadmap)
	return true
}

// ReorderColumns reorders columns by name array.
func (s *RoadmapStore) ReorderColumns(names []string) {
	roadmap := s.Get()
	colSet := make(map[string]bool)
	for _, c := range roadmap.Columns {
		colSet[c] = true
	}

	reordered := make([]string, 0, len(names))
	for _, name := range names {
		if colSet[name] {
			reordered = append(reordered, name)
			delete(colSet, name)
		}
	}
	for _, c := range roadmap.Columns {
		if colSet[c] {
			reordered = append(reordered, c)
		}
	}
	roadmap.Columns = reordered
	s.Save(roadmap)
}

func generateID() string {
	b := make([]byte, 4)
	rand.Read(b)
	return hex.EncodeToString(b)
}
