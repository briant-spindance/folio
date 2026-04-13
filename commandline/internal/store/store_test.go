package store

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/briantol/forge/internal/model"
)

// setupTestDir creates a temporary directory with basic forge structure.
func setupTestDir(t *testing.T) (*Paths, func()) {
	t.Helper()
	dir := t.TempDir()
	os.MkdirAll(filepath.Join(dir, "features"), 0755)
	os.MkdirAll(filepath.Join(dir, "issues"), 0755)
	os.MkdirAll(filepath.Join(dir, "wiki"), 0755)
	os.MkdirAll(filepath.Join(dir, ".sessions"), 0755)

	// Create team.md
	os.WriteFile(filepath.Join(dir, "team.md"), []byte(`---
members:
  - name: Alice
    role: Engineer
    github: alice
  - name: Bob
    role: Designer
---
`), 0644)

	paths := NewPaths(dir)
	return paths, func() {}
}

// ── Team Store ─────────────────────────────────────────────────────────────

func TestTeamList(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewTeamStore(paths)
	team := store.List()

	if len(team) != 2 {
		t.Fatalf("expected 2 team members, got %d", len(team))
	}
	if team[0].Name != "Alice" {
		t.Errorf("first member: got %q", team[0].Name)
	}
	if team[0].Role != "Engineer" {
		t.Errorf("first role: got %q", team[0].Role)
	}
	if team[0].GitHub == nil || *team[0].GitHub != "alice" {
		t.Errorf("first github: got %v", team[0].GitHub)
	}
	if team[1].GitHub != nil {
		t.Errorf("second github: expected nil, got %v", team[1].GitHub)
	}
}

// ── Feature Store ──────────────────────────────────────────────────────────

func TestFeatureCRUD(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewFeatureStore(paths)

	// Create
	body := "Test body"
	priority := "high"
	f, err := store.Create(model.CreateFeatureInput{
		Title:    "My Feature",
		Body:     &body,
		Priority: &priority,
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if f.Slug != "my-feature" {
		t.Errorf("slug: got %q", f.Slug)
	}
	if f.Title != "My Feature" {
		t.Errorf("title: got %q", f.Title)
	}
	if f.Priority != "high" {
		t.Errorf("priority: got %q", f.Priority)
	}
	if f.Status != "draft" {
		t.Errorf("status: got %q", f.Status)
	}

	// Get
	got := store.Get("my-feature")
	if got == nil {
		t.Fatal("Get: nil")
	}
	if got.Title != "My Feature" {
		t.Errorf("Get title: got %q", got.Title)
	}

	// Update
	newTitle := "Updated Feature"
	newStatus := "in-progress"
	updated, err := store.Update("my-feature", model.UpdateFeatureInput{
		Title:   &newTitle,
		Status:  &newStatus,
		TagsSet: true,
		Tags:    []string{"api", "test"},
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if updated.Title != "Updated Feature" {
		t.Errorf("Updated title: got %q", updated.Title)
	}
	if updated.Status != "in-progress" {
		t.Errorf("Updated status: got %q", updated.Status)
	}
	if len(updated.Tags) != 2 {
		t.Errorf("Updated tags: got %v", updated.Tags)
	}

	// List
	result := store.List(model.ListFeaturesParams{Page: 1, Limit: 25, Sort: "order", Dir: "asc"})
	if result.Total != 1 {
		t.Errorf("List total: got %d", result.Total)
	}

	// Delete
	if !store.Delete("my-feature") {
		t.Error("Delete: returned false")
	}

	// Verify deleted
	if store.Get("my-feature") != nil {
		t.Error("Get after delete: expected nil")
	}
}

func TestFeatureList404(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewFeatureStore(paths)
	got := store.Get("nonexistent")
	if got != nil {
		t.Error("expected nil for nonexistent feature")
	}
}

func TestFeatureFiltering(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewFeatureStore(paths)

	// Create two features with different statuses
	p := "medium"
	store.Create(model.CreateFeatureInput{Title: "Draft Feature", Priority: &p})

	p2 := "high"
	f2, _ := store.Create(model.CreateFeatureInput{Title: "Active Feature", Priority: &p2})
	newStatus := "in-progress"
	store.Update(f2.Slug, model.UpdateFeatureInput{Status: &newStatus})

	// Filter by status
	result := store.List(model.ListFeaturesParams{
		Page:   1,
		Limit:  25,
		Status: []string{"in-progress"},
		Sort:   "order",
		Dir:    "asc",
	})
	if result.Total != 1 {
		t.Errorf("status filter: expected 1, got %d", result.Total)
	}

	// Filter by priority
	result = store.List(model.ListFeaturesParams{
		Page:     1,
		Limit:    25,
		Priority: []string{"high"},
		Sort:     "order",
		Dir:      "asc",
	})
	if result.Total != 1 {
		t.Errorf("priority filter: expected 1, got %d", result.Total)
	}
}

func TestFeaturePagination(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewFeatureStore(paths)

	// Create 5 features
	for i := 0; i < 5; i++ {
		p := "medium"
		store.Create(model.CreateFeatureInput{
			Title:    "Feature " + string(rune('A'+i)),
			Priority: &p,
		})
	}

	result := store.List(model.ListFeaturesParams{Page: 1, Limit: 2, Sort: "order", Dir: "asc"})
	if result.Total != 5 {
		t.Errorf("total: got %d", result.Total)
	}
	if result.TotalPages != 3 {
		t.Errorf("total_pages: got %d", result.TotalPages)
	}
	if len(result.Features) != 2 {
		t.Errorf("page size: got %d", len(result.Features))
	}

	// Page 3 should have 1 item
	result = store.List(model.ListFeaturesParams{Page: 3, Limit: 2, Sort: "order", Dir: "asc"})
	if len(result.Features) != 1 {
		t.Errorf("page 3 size: got %d", len(result.Features))
	}
}

func TestFeatureReorder(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewFeatureStore(paths)
	p := "medium"
	store.Create(model.CreateFeatureInput{Title: "Feature A", Priority: &p})
	store.Create(model.CreateFeatureInput{Title: "Feature B", Priority: &p})
	store.Create(model.CreateFeatureInput{Title: "Feature C", Priority: &p})

	store.Reorder([]string{"feature-c", "feature-a", "feature-b"}, 0)

	result := store.List(model.ListFeaturesParams{Page: 1, Limit: 25, Sort: "order", Dir: "asc"})
	if result.Features[0].Slug != "feature-c" {
		t.Errorf("first after reorder: got %q", result.Features[0].Slug)
	}
	if result.Features[1].Slug != "feature-a" {
		t.Errorf("second after reorder: got %q", result.Features[1].Slug)
	}
}

// ── Feature Artifacts ──────────────────────────────────────────────────────

func TestFeatureArtifacts(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewFeatureStore(paths)
	p := "medium"
	store.Create(model.CreateFeatureInput{Title: "Artifact Test", Priority: &p})

	// List (empty)
	artifacts, ok := store.ListArtifacts("artifact-test")
	if !ok {
		t.Fatal("ListArtifacts: not found")
	}
	if len(artifacts) != 0 {
		t.Errorf("initial artifacts: got %d", len(artifacts))
	}

	// Save text artifact
	a := store.SaveArtifactContent("artifact-test", "notes.md", "# Notes")
	if a == nil {
		t.Fatal("SaveArtifactContent: nil")
	}
	if a.Name != "notes.md" {
		t.Errorf("artifact name: got %q", a.Name)
	}
	if a.Type != "text" {
		t.Errorf("artifact type: got %q", a.Type)
	}

	// Get text artifact
	content := store.GetArtifactContent("artifact-test", "notes.md")
	if content == nil {
		t.Fatal("GetArtifactContent: nil")
	}
	if content.Content != "# Notes" {
		t.Errorf("content: got %q", content.Content)
	}
	if content.MimeType != "text/markdown" {
		t.Errorf("mime: got %q", content.MimeType)
	}

	// Save binary artifact
	a = store.SaveArtifactBuffer("artifact-test", "image.png", []byte{0x89, 0x50, 0x4E, 0x47})
	if a == nil {
		t.Fatal("SaveArtifactBuffer: nil")
	}
	if a.Type != "image" {
		t.Errorf("binary type: got %q", a.Type)
	}

	// List (should have 2)
	artifacts, _ = store.ListArtifacts("artifact-test")
	if len(artifacts) != 2 {
		t.Errorf("artifacts count: got %d", len(artifacts))
	}

	// Delete
	if !store.DeleteArtifact("artifact-test", "notes.md") {
		t.Error("DeleteArtifact: returned false")
	}

	artifacts, _ = store.ListArtifacts("artifact-test")
	if len(artifacts) != 1 {
		t.Errorf("after delete: got %d", len(artifacts))
	}
}

func TestFeatureArtifactPathTraversal(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewFeatureStore(paths)
	p := "medium"
	store.Create(model.CreateFeatureInput{Title: "Security Test", Priority: &p})

	// Path traversal should be rejected
	a := store.SaveArtifactContent("security-test", "../evil.txt", "hack")
	if a != nil {
		t.Error("path traversal should be rejected")
	}

	a = store.SaveArtifactContent("security-test", "FEATURE.md", "hack")
	if a != nil {
		t.Error("FEATURE.md should be rejected")
	}
}

// ── Issue Store ────────────────────────────────────────────────────────────

func TestIssueCRUD(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewIssueStore(paths)

	body := "Bug description"
	issueType := "bug"
	priority := "critical"
	issue, err := store.Create(model.CreateIssueInput{
		Title:    "Login Bug",
		Body:     &body,
		Type:     &issueType,
		Priority: &priority,
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if issue.Slug != "login-bug" {
		t.Errorf("slug: got %q", issue.Slug)
	}
	if issue.Type != "bug" {
		t.Errorf("type: got %q", issue.Type)
	}
	if issue.Status != "open" {
		t.Errorf("status: got %q", issue.Status)
	}

	// Update
	newStatus := "closed"
	updated, err := store.Update("login-bug", model.UpdateIssueInput{
		Status: &newStatus,
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if updated.Status != "closed" {
		t.Errorf("updated status: got %q", updated.Status)
	}

	// Delete
	if !store.Delete("login-bug") {
		t.Error("Delete: returned false")
	}
}

func TestIssueFeatureFilter(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewIssueStore(paths)
	p := "medium"

	// Create issue with feature link
	feature := "dashboard"
	store.Create(model.CreateIssueInput{Title: "Linked Issue", Priority: &p, Feature: &feature})

	// Create issue without feature
	store.Create(model.CreateIssueInput{Title: "Unlinked Issue", Priority: &p})

	// Filter by feature
	result := store.List(model.ListIssuesParams{
		Page: 1, Limit: 25, Sort: "order", Dir: "asc",
		Feature: &feature,
	})
	if result.Total != 1 {
		t.Errorf("feature filter: expected 1, got %d", result.Total)
	}

	// Filter unlinked
	empty := ""
	result = store.List(model.ListIssuesParams{
		Page: 1, Limit: 25, Sort: "order", Dir: "asc",
		Feature: &empty,
	})
	if result.Total != 1 {
		t.Errorf("unlinked filter: expected 1, got %d", result.Total)
	}
}

// ── Wiki Store ─────────────────────────────────────────────────────────────

func TestWikiCRUD(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewWikiStore(paths)

	// Save
	doc := store.Save("test-doc", model.SaveWikiDocInput{
		Title: "Test Doc",
		Body:  "Hello world",
	})
	if doc == nil {
		t.Fatal("Save: nil")
	}
	if doc.Title != "Test Doc" {
		t.Errorf("title: got %q", doc.Title)
	}

	// Get
	got := store.Get("test-doc")
	if got == nil {
		t.Fatal("Get: nil")
	}
	if got.Body != "Hello world\n" {
		t.Errorf("body: got %q", got.Body)
	}

	// List
	all := store.ListAll()
	if len(all) != 1 {
		t.Errorf("ListAll: got %d", len(all))
	}

	// Paginate
	paginated := store.List(1, 50)
	if paginated.Total != 1 {
		t.Errorf("List total: got %d", paginated.Total)
	}

	// Delete
	if !store.Delete("test-doc") {
		t.Error("Delete: returned false")
	}
	if store.Get("test-doc") != nil {
		t.Error("Get after delete: expected nil")
	}
}

func TestWikiUniqueSlug(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewWikiStore(paths)
	store.Save("test", model.SaveWikiDocInput{Title: "Test", Body: ""})

	slug := store.UniqueSlug("test")
	if slug != "test-2" {
		t.Errorf("unique slug: got %q", slug)
	}
}

func TestWikiReorder(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewWikiStore(paths)
	store.Save("alpha", model.SaveWikiDocInput{Title: "Alpha", Body: ""})
	store.Save("beta", model.SaveWikiDocInput{Title: "Beta", Body: ""})
	store.Save("gamma", model.SaveWikiDocInput{Title: "Gamma", Body: ""})

	store.Reorder([]string{"gamma", "alpha", "beta"})

	all := store.ListAll()
	if all[0].Slug != "gamma" {
		t.Errorf("first after reorder: got %q", all[0].Slug)
	}
}

// ── Roadmap Store ──────────────────────────────────────────────────────────

func TestRoadmapCRUD(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewRoadmapStore(paths)

	// Default
	roadmap := store.Get()
	if len(roadmap.Columns) != 3 {
		t.Errorf("default columns: got %d", len(roadmap.Columns))
	}
	if len(roadmap.Cards) != 0 {
		t.Errorf("default cards: got %d", len(roadmap.Cards))
	}

	// Add card
	card := store.AddCard(model.RoadmapCard{
		Title:  "Test Card",
		Notes:  "Notes here",
		Column: "now",
		Row:    "Backend",
		Order:  0,
	})
	if card.ID == "" {
		t.Error("card ID should not be empty")
	}
	if card.Title != "Test Card" {
		t.Errorf("card title: got %q", card.Title)
	}

	// Update card
	updated := store.UpdateCard(card.ID, map[string]interface{}{
		"title":  "Updated Card",
		"column": "next",
	})
	if updated == nil {
		t.Fatal("UpdateCard: nil")
	}
	if updated.Title != "Updated Card" {
		t.Errorf("updated title: got %q", updated.Title)
	}
	if updated.Column != "next" {
		t.Errorf("updated column: got %q", updated.Column)
	}

	// Move card
	moved := store.MoveCard(card.ID, strPtr("later"), nil, intPtr(5))
	if moved == nil {
		t.Fatal("MoveCard: nil")
	}
	if moved.Column != "later" {
		t.Errorf("moved column: got %q", moved.Column)
	}
	if moved.Order != 5 {
		t.Errorf("moved order: got %d", moved.Order)
	}

	// Delete card
	if !store.DeleteCard(card.ID) {
		t.Error("DeleteCard: returned false")
	}

	roadmap = store.Get()
	if len(roadmap.Cards) != 0 {
		t.Errorf("cards after delete: got %d", len(roadmap.Cards))
	}
}

func TestRoadmapRows(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewRoadmapStore(paths)

	// Add row
	row := store.AddRow("Backend", strPtr("#f0faf4"))
	if row.Label != "Backend" {
		t.Errorf("row label: got %q", row.Label)
	}

	// Add card in this row
	store.AddCard(model.RoadmapCard{
		Title: "Card In Row", Column: "now", Row: "Backend", Order: 0,
	})

	// Update row (rename)
	updated := store.UpdateRow("Backend", strPtr("API"), nil)
	if updated == nil {
		t.Fatal("UpdateRow: nil")
	}
	if updated.Label != "API" {
		t.Errorf("renamed label: got %q", updated.Label)
	}

	// Verify card was updated
	roadmap := store.Get()
	if roadmap.Cards[0].Row != "API" {
		t.Errorf("card row after rename: got %q", roadmap.Cards[0].Row)
	}

	// Delete row
	if !store.DeleteRow("API") {
		t.Error("DeleteRow: returned false")
	}

	roadmap = store.Get()
	if len(roadmap.Rows) != 0 {
		t.Errorf("rows after delete: got %d", len(roadmap.Rows))
	}
	if len(roadmap.Cards) != 0 {
		t.Errorf("cards after row delete: got %d", len(roadmap.Cards))
	}
}

func TestRoadmapColumns(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewRoadmapStore(paths)

	// Add column
	columns := store.AddColumn("backlog")
	if len(columns) != 4 {
		t.Errorf("columns after add: got %d", len(columns))
	}

	// Rename column
	columns = store.UpdateColumn("backlog", "icebox")
	if columns == nil {
		t.Fatal("UpdateColumn: nil")
	}
	if !containsStr(columns, "icebox") {
		t.Error("renamed column not found")
	}

	// Delete column
	if !store.DeleteColumn("icebox") {
		t.Error("DeleteColumn: returned false")
	}

	roadmap := store.Get()
	if len(roadmap.Columns) != 3 {
		t.Errorf("columns after delete: got %d", len(roadmap.Columns))
	}
}

// ── Session Store ──────────────────────────────────────────────────────────

func TestSessionCRUD(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewSessionStore(paths)

	// List empty
	sessions := store.List("test-context")
	if len(sessions) != 0 {
		t.Errorf("initial sessions: got %d", len(sessions))
	}

	// Upsert
	session := model.ChatSession{
		ID:       "sess-1",
		Name:     "Test Session",
		SavedAt:  1234567890,
		Messages: []interface{}{map[string]interface{}{"role": "user", "content": "hello"}},
	}
	if err := store.Upsert("test-context", session); err != nil {
		t.Fatalf("Upsert: %v", err)
	}

	sessions = store.List("test-context")
	if len(sessions) != 1 {
		t.Fatalf("after upsert: got %d", len(sessions))
	}
	if sessions[0].ID != "sess-1" {
		t.Errorf("session ID: got %q", sessions[0].ID)
	}

	// Update existing
	session.Name = "Updated Session"
	store.Upsert("test-context", session)
	sessions = store.List("test-context")
	if len(sessions) != 1 {
		t.Errorf("after update: expected 1, got %d", len(sessions))
	}
	if sessions[0].Name != "Updated Session" {
		t.Errorf("updated name: got %q", sessions[0].Name)
	}

	// Delete
	store.Delete("test-context", "sess-1")
	sessions = store.List("test-context")
	if len(sessions) != 0 {
		t.Errorf("after delete: got %d", len(sessions))
	}
}

// ── Search Store ───────────────────────────────────────────────────────────

func TestSearch(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	featureStore := NewFeatureStore(paths)
	issueStore := NewIssueStore(paths)
	wikiStore := NewWikiStore(paths)
	roadmapStore := NewRoadmapStore(paths)
	searchStore := NewSearchStore(featureStore, issueStore, wikiStore, roadmapStore)

	// Create test data
	p := "medium"
	featureStore.Create(model.CreateFeatureInput{Title: "Dashboard Analytics", Priority: &p})
	wikiStore.Save("architecture", model.SaveWikiDocInput{Title: "Architecture", Body: "System dashboard overview"})

	result := searchStore.Search("dashboard", []string{}, 20)
	if result.Total < 2 {
		t.Errorf("search results: expected >= 2, got %d", result.Total)
	}
	if result.Query != "dashboard" {
		t.Errorf("query: got %q", result.Query)
	}
}

// ── Helpers ────────────────────────────────────────────────────────────────

func TestSlugify(t *testing.T) {
	cases := []struct {
		input, want string
	}{
		{"Hello World", "hello-world"},
		{"API Rate Limiting!", "api-rate-limiting"},
		{"  spaces  ", "spaces"},
		{"", "untitled"},
		{"---", "untitled"},
	}
	for _, tc := range cases {
		got := slugify(tc.input)
		if got != tc.want {
			t.Errorf("slugify(%q): got %q, want %q", tc.input, got, tc.want)
		}
	}
}

func TestIsTextArtifact(t *testing.T) {
	if !IsTextArtifact("notes.md") {
		t.Error("notes.md should be text")
	}
	if !IsTextArtifact("config.yaml") {
		t.Error("config.yaml should be text")
	}
	if IsTextArtifact("photo.png") {
		t.Error("photo.png should not be text")
	}
	if IsTextArtifact("data.pdf") {
		t.Error("data.pdf should not be text")
	}
}

// ── Encoding Roundtrip ────────────────────────────────────────────────────

func TestFeatureJSONRoundtrip(t *testing.T) {
	paths, cleanup := setupTestDir(t)
	defer cleanup()

	store := NewFeatureStore(paths)
	p := "high"
	f, _ := store.Create(model.CreateFeatureInput{Title: "JSON Test", Priority: &p})

	data, err := json.Marshal(f)
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}

	// Verify snake_case field names in JSON
	var raw map[string]interface{}
	json.Unmarshal(data, &raw)

	if _, ok := raw["roadmap_card"]; !ok {
		t.Error("JSON should have roadmap_card field")
	}
	if _, ok := raw["slug"]; !ok {
		t.Error("JSON should have slug field")
	}
}

func strPtr(s string) *string { return &s }
func intPtr(n int) *int       { return &n }
