package handler_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/briant-spindance/folio/internal/server"
	"github.com/briant-spindance/folio/internal/store"
)

func setupTestServer(t *testing.T) (*httptest.Server, func()) {
	t.Helper()
	dir := t.TempDir()
	os.MkdirAll(filepath.Join(dir, "features"), 0755)
	os.MkdirAll(filepath.Join(dir, "issues"), 0755)
	os.MkdirAll(filepath.Join(dir, "wiki"), 0755)
	os.MkdirAll(filepath.Join(dir, ".sessions"), 0755)

	os.WriteFile(filepath.Join(dir, "team.md"), []byte(`---
members:
  - name: Alice
    role: Engineer
---
`), 0644)

	os.WriteFile(filepath.Join(dir, "folio.yaml"), []byte(`project: test
version: "0.1.0"
`), 0644)

	paths := store.NewPaths(dir)
	router := server.New(paths, nil)
	ts := httptest.NewServer(router)

	return ts, func() { ts.Close() }
}

func doGet(t *testing.T, ts *httptest.Server, path string) (int, map[string]interface{}) {
	t.Helper()
	resp, err := http.Get(ts.URL + path)
	if err != nil {
		t.Fatalf("GET %s: %v", path, err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	json.Unmarshal(body, &result)
	return resp.StatusCode, result
}

func doPost(t *testing.T, ts *httptest.Server, path string, payload interface{}) (int, map[string]interface{}) {
	t.Helper()
	data, _ := json.Marshal(payload)
	resp, err := http.Post(ts.URL+path, "application/json", bytes.NewReader(data))
	if err != nil {
		t.Fatalf("POST %s: %v", path, err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	json.Unmarshal(body, &result)
	return resp.StatusCode, result
}

func doPut(t *testing.T, ts *httptest.Server, path string, payload interface{}) (int, map[string]interface{}) {
	t.Helper()
	data, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPut, ts.URL+path, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("PUT %s: %v", path, err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	json.Unmarshal(body, &result)
	return resp.StatusCode, result
}

func doDelete(t *testing.T, ts *httptest.Server, path string) (int, map[string]interface{}) {
	t.Helper()
	req, _ := http.NewRequest(http.MethodDelete, ts.URL+path, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("DELETE %s: %v", path, err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	json.Unmarshal(body, &result)
	return resp.StatusCode, result
}

func doPatch(t *testing.T, ts *httptest.Server, path string, payload interface{}) (int, map[string]interface{}) {
	t.Helper()
	data, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPatch, ts.URL+path, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("PATCH %s: %v", path, err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	json.Unmarshal(body, &result)
	return resp.StatusCode, result
}

// ── Status ─────────────────────────────────────────────────────────────────

func TestStatusEndpoint(t *testing.T) {
	ts, cleanup := setupTestServer(t)
	defer cleanup()

	status, body := doGet(t, ts, "/api/status")
	if status != 200 {
		t.Fatalf("status: got %d", status)
	}
	if body["project"] != "folio-project" {
		t.Errorf("project: got %v", body["project"])
	}
	if _, ok := body["feature_count"]; !ok {
		t.Error("missing feature_count")
	}
	if _, ok := body["by_status"]; !ok {
		t.Error("missing by_status")
	}
	if _, ok := body["health"]; !ok {
		t.Error("missing health")
	}
	if _, ok := body["roadmap"]; !ok {
		t.Error("missing roadmap")
	}
}

// ── Features ───────────────────────────────────────────────────────────────

func TestFeatureEndpoints(t *testing.T) {
	ts, cleanup := setupTestServer(t)
	defer cleanup()

	// Create
	status, body := doPost(t, ts, "/api/features", map[string]interface{}{
		"title":    "Test Feature",
		"body":     "Description",
		"priority": "high",
	})
	if status != 201 {
		t.Fatalf("create status: got %d, body: %v", status, body)
	}
	if body["slug"] != "test-feature" {
		t.Errorf("slug: got %v", body["slug"])
	}
	if body["priority"] != "high" {
		t.Errorf("priority: got %v", body["priority"])
	}

	// Get
	status, body = doGet(t, ts, "/api/features/test-feature")
	if status != 200 {
		t.Fatalf("get status: got %d", status)
	}
	if body["title"] != "Test Feature" {
		t.Errorf("title: got %v", body["title"])
	}

	// List
	status, body = doGet(t, ts, "/api/features")
	if status != 200 {
		t.Fatalf("list status: got %d", status)
	}
	if body["total"] != float64(1) {
		t.Errorf("total: got %v", body["total"])
	}
	if _, ok := body["total_pages"]; !ok {
		t.Error("missing total_pages (snake_case)")
	}

	// Update
	status, body = doPut(t, ts, "/api/features/test-feature", map[string]interface{}{
		"status": "in-progress",
		"tags":   []string{"api"},
	})
	if status != 200 {
		t.Fatalf("update status: got %d", status)
	}
	if body["status"] != "in-progress" {
		t.Errorf("updated status: got %v", body["status"])
	}

	// 404
	status, _ = doGet(t, ts, "/api/features/nonexistent")
	if status != 404 {
		t.Errorf("404 status: got %d", status)
	}

	// Delete
	status, body = doDelete(t, ts, "/api/features/test-feature")
	if status != 200 {
		t.Fatalf("delete status: got %d", status)
	}
	if body["ok"] != true {
		t.Error("delete ok: expected true")
	}

	// Verify deleted
	status, _ = doGet(t, ts, "/api/features/test-feature")
	if status != 404 {
		t.Errorf("after delete: got %d", status)
	}
}

func TestFeatureValidation(t *testing.T) {
	ts, cleanup := setupTestServer(t)
	defer cleanup()

	// Empty title
	status, body := doPost(t, ts, "/api/features", map[string]interface{}{"title": ""})
	if status != 422 {
		t.Errorf("empty title status: got %d", status)
	}
	if body["error"] == nil {
		t.Error("missing error message")
	}
}

// ── Issues ─────────────────────────────────────────────────────────────────

func TestIssueEndpoints(t *testing.T) {
	ts, cleanup := setupTestServer(t)
	defer cleanup()

	// Create
	status, body := doPost(t, ts, "/api/issues", map[string]interface{}{
		"title":    "Test Bug",
		"type":     "bug",
		"priority": "critical",
	})
	if status != 201 {
		t.Fatalf("create status: got %d", status)
	}
	if body["slug"] != "test-bug" {
		t.Errorf("slug: got %v", body["slug"])
	}
	if body["type"] != "bug" {
		t.Errorf("type: got %v", body["type"])
	}

	// Get
	status, body = doGet(t, ts, "/api/issues/test-bug")
	if status != 200 {
		t.Fatalf("get status: got %d", status)
	}

	// List
	status, body = doGet(t, ts, "/api/issues")
	if status != 200 {
		t.Fatalf("list status: got %d", status)
	}
	if body["total"] != float64(1) {
		t.Errorf("total: got %v", body["total"])
	}

	// Update
	status, body = doPut(t, ts, "/api/issues/test-bug", map[string]interface{}{
		"status": "closed",
	})
	if status != 200 {
		t.Fatalf("update status: got %d", status)
	}

	// Delete
	status, _ = doDelete(t, ts, "/api/issues/test-bug")
	if status != 200 {
		t.Fatalf("delete status: got %d", status)
	}
}

// ── Wiki ───────────────────────────────────────────────────────────────────

func TestWikiEndpoints(t *testing.T) {
	ts, cleanup := setupTestServer(t)
	defer cleanup()

	// Create with POST (auto slug)
	status, body := doPost(t, ts, "/api/wiki", map[string]interface{}{
		"title": "Test Doc",
		"body":  "Hello world",
	})
	if status != 201 {
		t.Fatalf("create status: got %d, body: %v", status, body)
	}
	if body["slug"] != "test-doc" {
		t.Errorf("slug: got %v", body["slug"])
	}

	// Get
	status, body = doGet(t, ts, "/api/wiki/test-doc")
	if status != 200 {
		t.Fatalf("get status: got %d", status)
	}
	if _, ok := body["updated_at"]; !ok {
		t.Error("missing updated_at (snake_case)")
	}

	// PUT (update)
	status, body = doPut(t, ts, "/api/wiki/test-doc", map[string]interface{}{
		"title": "Updated Doc",
		"body":  "Updated body",
	})
	if status != 200 {
		t.Fatalf("update status: got %d", status)
	}
	if body["title"] != "Updated Doc" {
		t.Errorf("updated title: got %v", body["title"])
	}

	// List (paginated)
	status, body = doGet(t, ts, "/api/wiki")
	if status != 200 {
		t.Fatalf("list status: got %d", status)
	}
	if body["total"] != float64(1) {
		t.Errorf("total: got %v", body["total"])
	}
	if _, ok := body["total_pages"]; !ok {
		t.Error("missing total_pages")
	}
	if _, ok := body["docs"]; !ok {
		t.Error("missing docs")
	}

	// Delete
	status, _ = doDelete(t, ts, "/api/wiki/test-doc")
	if status != 200 {
		t.Fatalf("delete status: got %d", status)
	}
}

// ── Roadmap ────────────────────────────────────────────────────────────────

func TestRoadmapEndpoints(t *testing.T) {
	ts, cleanup := setupTestServer(t)
	defer cleanup()

	// Get default
	status, body := doGet(t, ts, "/api/roadmap")
	if status != 200 {
		t.Fatalf("get status: got %d", status)
	}
	columns, ok := body["columns"].([]interface{})
	if !ok || len(columns) != 3 {
		t.Errorf("default columns: got %v", body["columns"])
	}

	// Create card
	status, body = doPost(t, ts, "/api/roadmap/cards", map[string]interface{}{
		"title":  "Test Card",
		"notes":  "Some notes",
		"column": "now",
	})
	if status != 201 {
		t.Fatalf("create card status: got %d", status)
	}
	cardID, ok := body["id"].(string)
	if !ok || cardID == "" {
		t.Error("missing card ID")
	}
	// Verify feature_slug in response (snake_case)
	if _, ok := body["feature_slug"]; !ok {
		t.Error("missing feature_slug in card response")
	}

	// Update card
	status, body = doPut(t, ts, "/api/roadmap/cards/"+cardID, map[string]interface{}{
		"title": "Updated Card",
	})
	if status != 200 {
		t.Fatalf("update card status: got %d", status)
	}
	if body["title"] != "Updated Card" {
		t.Errorf("updated title: got %v", body["title"])
	}

	// Add row
	status, _ = doPost(t, ts, "/api/roadmap/rows", map[string]interface{}{
		"label": "Backend",
		"color": "#f0faf4",
	})
	if status != 201 {
		t.Fatalf("create row status: got %d", status)
	}

	// Add column
	status, body = doPost(t, ts, "/api/roadmap/columns", map[string]interface{}{
		"name": "backlog",
	})
	if status != 201 {
		t.Fatalf("create column status: got %d", status)
	}

	// Delete card
	status, _ = doDelete(t, ts, "/api/roadmap/cards/"+cardID)
	if status != 200 {
		t.Fatalf("delete card status: got %d", status)
	}

	// Card 404
	status, _ = doPut(t, ts, "/api/roadmap/cards/nonexistent", map[string]interface{}{"title": "x"})
	if status != 404 {
		t.Errorf("card 404: got %d", status)
	}
}

// ── Search ─────────────────────────────────────────────────────────────────

func TestSearchEndpoint(t *testing.T) {
	ts, cleanup := setupTestServer(t)
	defer cleanup()

	// Create test data
	doPost(t, ts, "/api/features", map[string]interface{}{"title": "Dashboard Analytics"})
	doPost(t, ts, "/api/wiki", map[string]interface{}{"title": "Architecture", "body": "Dashboard design"})

	status, body := doGet(t, ts, "/api/search?q=dashboard")
	if status != 200 {
		t.Fatalf("search status: got %d", status)
	}
	if body["query"] != "dashboard" {
		t.Errorf("query: got %v", body["query"])
	}
	total, ok := body["total"].(float64)
	if !ok || total < 2 {
		t.Errorf("search total: got %v", body["total"])
	}

	// Missing query
	status, _ = doGet(t, ts, "/api/search")
	if status != 400 {
		t.Errorf("missing query status: got %d", status)
	}
}

// ── Git ────────────────────────────────────────────────────────────────────

func TestGitEndpoint(t *testing.T) {
	ts, cleanup := setupTestServer(t)
	defer cleanup()

	status, body := doGet(t, ts, "/api/git")
	if status != 200 {
		t.Fatalf("git status: got %d", status)
	}
	// May or may not be in a git repo, but should have these fields
	if _, ok := body["dirty"]; !ok {
		t.Error("missing dirty field")
	}
}

// ── Sessions ───────────────────────────────────────────────────────────────

func TestSessionEndpoints(t *testing.T) {
	ts, cleanup := setupTestServer(t)
	defer cleanup()

	// List empty
	resp, err := http.Get(ts.URL + "/api/ai-sessions/test-key")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		t.Fatalf("list status: got %d", resp.StatusCode)
	}
	var sessions []interface{}
	json.Unmarshal(body, &sessions)
	if len(sessions) != 0 {
		t.Errorf("initial sessions: got %d", len(sessions))
	}

	// Upsert
	status, result := doPut(t, ts, "/api/ai-sessions/test-key", map[string]interface{}{
		"id":       "sess-1",
		"name":     "Test Session",
		"saved_at": 1234567890,
		"messages": []interface{}{},
	})
	if status != 200 {
		t.Fatalf("upsert status: got %d", status)
	}
	if result["ok"] != true {
		t.Error("upsert ok: expected true")
	}

	// List again
	resp, _ = http.Get(ts.URL + "/api/ai-sessions/test-key")
	defer resp.Body.Close()
	body, _ = io.ReadAll(resp.Body)
	json.Unmarshal(body, &sessions)
	if len(sessions) != 1 {
		t.Errorf("after upsert: got %d", len(sessions))
	}

	// Delete
	status, _ = doDelete(t, ts, "/api/ai-sessions/test-key/sess-1")
	if status != 200 {
		t.Fatalf("delete status: got %d", status)
	}
}

// ── Catch-all ──────────────────────────────────────────────────────────────

func TestCatchAllAPI(t *testing.T) {
	ts, cleanup := setupTestServer(t)
	defer cleanup()

	status, body := doGet(t, ts, "/api/nonexistent")
	if status != 501 {
		t.Errorf("catch-all status: got %d", status)
	}
	if body["error"] != "Not implemented" {
		t.Errorf("catch-all error: got %v", body["error"])
	}
}

// ── Chat 501 ───────────────────────────────────────────────────────────────

func TestChatNotImplemented(t *testing.T) {
	ts, cleanup := setupTestServer(t)
	defer cleanup()

	status, body := doPost(t, ts, "/api/chat", map[string]interface{}{
		"messages": []interface{}{},
	})
	if status != 501 {
		t.Errorf("chat status: got %d", status)
	}
	if body["error"] == nil {
		t.Error("missing error message")
	}
}
