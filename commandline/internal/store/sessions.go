package store

import (
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/briantol/folio/internal/model"
)

const maxSessions = 20

// SessionStore provides filesystem-backed CRUD for AI chat sessions.
type SessionStore struct {
	paths *Paths
}

// NewSessionStore creates a new SessionStore.
func NewSessionStore(p *Paths) *SessionStore {
	return &SessionStore{paths: p}
}

func (s *SessionStore) sessionPath(contextKey string) string {
	// Sanitize context key for filesystem
	safe := regexp.MustCompile(`[^a-zA-Z0-9]`).ReplaceAllString(contextKey, "_")
	return filepath.Join(s.paths.AISessions, safe+".json")
}

func (s *SessionStore) readSessions(contextKey string) []model.ChatSession {
	path := s.sessionPath(contextKey)
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}

	var sessions []model.ChatSession
	if err := json.Unmarshal(data, &sessions); err != nil {
		return nil
	}

	// Ensure Messages is never nil
	for i := range sessions {
		if sessions[i].Messages == nil {
			sessions[i].Messages = []interface{}{}
		}
	}

	return sessions
}

func (s *SessionStore) writeSessions(contextKey string, sessions []model.ChatSession) error {
	if err := os.MkdirAll(s.paths.AISessions, 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(sessions, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.sessionPath(contextKey), data, 0644)
}

// List returns all sessions for a context key.
func (s *SessionStore) List(contextKey string) []model.ChatSession {
	sessions := s.readSessions(contextKey)
	if sessions == nil {
		return []model.ChatSession{}
	}
	return sessions
}

// Upsert inserts or updates a session.
func (s *SessionStore) Upsert(contextKey string, session model.ChatSession) error {
	sessions := s.readSessions(contextKey)

	// Remove existing session with same ID
	filtered := make([]model.ChatSession, 0, len(sessions))
	for _, existing := range sessions {
		if existing.ID != session.ID {
			filtered = append(filtered, existing)
		}
	}

	// Prepend the new/updated session
	result := append([]model.ChatSession{session}, filtered...)

	// Cap at maxSessions
	if len(result) > maxSessions {
		result = result[:maxSessions]
	}

	return s.writeSessions(contextKey, result)
}

// Delete removes a session by ID.
func (s *SessionStore) Delete(contextKey, id string) {
	sessions := s.readSessions(contextKey)
	filtered := make([]model.ChatSession, 0, len(sessions))
	for _, session := range sessions {
		if session.ID != id {
			filtered = append(filtered, session)
		}
	}
	s.writeSessions(contextKey, filtered)
}

// SearchStore provides cross-entity search.
type SearchStore struct {
	features *FeatureStore
	issues   *IssueStore
	wiki     *WikiStore
	roadmap  *RoadmapStore
}

// NewSearchStore creates a new SearchStore.
func NewSearchStore(f *FeatureStore, i *IssueStore, w *WikiStore, r *RoadmapStore) *SearchStore {
	return &SearchStore{features: f, issues: i, wiki: w, roadmap: r}
}

// Search performs a cross-entity text search.
func (ss *SearchStore) Search(query string, types []string, limit int) model.SearchResponse {
	if len(types) == 0 {
		types = []string{"wiki", "feature", "issue", "roadmap"}
	}

	results := make([]model.SearchResult, 0)
	lq := strings.ToLower(query)

	if containsStr(types, "wiki") {
		for _, doc := range ss.wiki.ListAll() {
			if len(results) >= limit {
				break
			}
			metaMatch := matchesQuery([]string{doc.Slug, doc.Title, ptrStr(doc.Description)}, lq)
			if metaMatch != "" {
				results = append(results, model.SearchResult{
					Type:    "wiki",
					Slug:    doc.Slug,
					Title:   doc.Title,
					Snippet: makeSnippet(metaMatch, query),
				})
				continue
			}
			if bodyLine := matchesBodyLine(doc.Body, lq); bodyLine != "" {
				results = append(results, model.SearchResult{
					Type:    "wiki",
					Slug:    doc.Slug,
					Title:   doc.Title,
					Snippet: makeSnippet(strings.TrimSpace(bodyLine), query),
				})
			}
		}
	}

	if containsStr(types, "feature") {
		feats := ss.features.List(model.ListFeaturesParams{Page: 1, Limit: 1000, Sort: "order", Dir: "asc"})
		for _, f := range feats.Features {
			if len(results) >= limit {
				break
			}
			metaValues := append([]string{f.Slug, f.Title, f.Status}, f.Assignees...)
			if f.Sprint != nil {
				metaValues = append(metaValues, *f.Sprint)
			}
			metaValues = append(metaValues, f.Tags...)

			metaMatch := matchesQuery(metaValues, lq)
			if metaMatch != "" {
				assignee := assigneeStr(f.Assignees)
				results = append(results, model.SearchResult{
					Type:     "feature",
					Slug:     f.Slug,
					Title:    f.Title,
					Snippet:  makeSnippet(metaMatch, query),
					Status:   &f.Status,
					Assignee: assignee,
				})
				continue
			}
			if bodyLine := matchesBodyLine(f.Body, lq); bodyLine != "" {
				assignee := assigneeStr(f.Assignees)
				results = append(results, model.SearchResult{
					Type:     "feature",
					Slug:     f.Slug,
					Title:    f.Title,
					Snippet:  makeSnippet(strings.TrimSpace(bodyLine), query),
					Status:   &f.Status,
					Assignee: assignee,
				})
			}
		}
	}

	if containsStr(types, "issue") {
		issues := ss.issues.List(model.ListIssuesParams{Page: 1, Limit: 1000, Sort: "order", Dir: "asc"})
		for _, issue := range issues.Issues {
			if len(results) >= limit {
				break
			}
			metaValues := []string{issue.Slug, issue.Title, issue.Status, issue.Type}
			metaValues = append(metaValues, issue.Assignees...)
			if issue.Sprint != nil {
				metaValues = append(metaValues, *issue.Sprint)
			}
			if issue.Feature != nil {
				metaValues = append(metaValues, *issue.Feature)
			}
			metaValues = append(metaValues, issue.Labels...)

			metaMatch := matchesQuery(metaValues, lq)
			if metaMatch != "" {
				assignee := assigneeStr(issue.Assignees)
				results = append(results, model.SearchResult{
					Type:     "issue",
					Slug:     issue.Slug,
					Title:    issue.Title,
					Snippet:  makeSnippet(metaMatch, query),
					Status:   &issue.Status,
					Assignee: assignee,
				})
				continue
			}
			if bodyLine := matchesBodyLine(issue.Body, lq); bodyLine != "" {
				assignee := assigneeStr(issue.Assignees)
				results = append(results, model.SearchResult{
					Type:     "issue",
					Slug:     issue.Slug,
					Title:    issue.Title,
					Snippet:  makeSnippet(strings.TrimSpace(bodyLine), query),
					Status:   &issue.Status,
					Assignee: assignee,
				})
			}
		}
	}

	if containsStr(types, "roadmap") {
		roadmap := ss.roadmap.Get()
		for _, card := range roadmap.Cards {
			if len(results) >= limit {
				break
			}
			metaMatch := matchesQuery(
				filterEmpty([]string{card.Title, card.Notes, card.Column, card.Row}),
				lq,
			)
			if metaMatch != "" {
				results = append(results, model.SearchResult{
					Type:    "roadmap",
					Slug:    card.ID,
					Title:   card.Title,
					Snippet: makeSnippet(metaMatch, query),
				})
			}
		}
	}

	return model.SearchResponse{
		Query:   query,
		Total:   len(results),
		Results: results,
	}
}

func matchesQuery(values []string, lq string) string {
	for _, v := range values {
		if v != "" && strings.Contains(strings.ToLower(v), lq) {
			return v
		}
	}
	return ""
}

func matchesBodyLine(body, lq string) string {
	for _, line := range strings.Split(body, "\n") {
		if strings.Contains(strings.ToLower(line), lq) {
			return line
		}
	}
	return ""
}

func makeSnippet(text, query string) string {
	lower := strings.ToLower(text)
	lq := strings.ToLower(query)
	idx := strings.Index(lower, lq)
	if idx == -1 {
		if len(text) > 80 {
			return text[:80] + "…"
		}
		return text
	}

	half := 40
	start := idx - half
	if start < 0 {
		start = 0
	}
	end := idx + len(query) + half
	if end > len(text) {
		end = len(text)
	}

	before := text[start:idx]
	match := text[idx : idx+len(query)]
	after := text[idx+len(query) : end]

	result := ""
	if start > 0 {
		result += "…"
	}
	result += before + "**" + match + "**" + after
	if end < len(text) {
		result += "…"
	}
	return result
}

func ptrStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func assigneeStr(assignees []string) *string {
	if len(assignees) == 0 {
		return nil
	}
	s := strings.Join(assignees, ", ")
	return &s
}

func filterEmpty(ss []string) []string {
	result := make([]string, 0, len(ss))
	for _, s := range ss {
		if s != "" {
			result = append(result, s)
		}
	}
	return result
}
