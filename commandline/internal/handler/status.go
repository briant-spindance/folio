package handler

import (
	"net/http"
	"strings"

	"github.com/briantol/forge/internal/store"
)

// StatusHandler handles GET /api/status.
type StatusHandler struct {
	features *store.FeatureStore
	issues   *store.IssueStore
	wiki     *store.WikiStore
	team     *store.TeamStore
	roadmap  *store.RoadmapStore
}

// NewStatusHandler creates a new StatusHandler.
func NewStatusHandler(f *store.FeatureStore, i *store.IssueStore, w *store.WikiStore, t *store.TeamStore, r *store.RoadmapStore) *StatusHandler {
	return &StatusHandler{features: f, issues: i, wiki: w, team: t, roadmap: r}
}

func (h *StatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		ErrorJSON(w, 405, "Method not allowed")
		return
	}

	features := h.features.List(featureListAll())
	docs := h.wiki.ListAll()
	issues := h.issues.List(issueListAll())
	team := h.team.List()
	roadmap := h.roadmap.Get()

	// by_status
	byStatus := map[string]int{}
	for _, f := range features.Features {
		byStatus[f.Status]++
	}

	// active_sprint
	var activeSprint *string
	for _, f := range features.Features {
		if f.Sprint != nil {
			activeSprint = f.Sprint
			break
		}
	}

	// recent_docs (up to 6)
	recentDocs := make([]map[string]interface{}, 0)
	limit := 6
	if len(docs) < limit {
		limit = len(docs)
	}
	for _, d := range docs[:limit] {
		entry := map[string]interface{}{
			"slug":       d.Slug,
			"title":      d.Title,
			"updated_at": d.UpdatedAt,
		}
		if d.Description != nil {
			entry["description"] = *d.Description
		} else {
			entry["description"] = nil
		}
		if d.Icon != nil {
			entry["icon"] = *d.Icon
		} else {
			entry["icon"] = nil
		}
		recentDocs = append(recentDocs, entry)
	}

	// top_features (up to 10)
	topFeatures := make([]map[string]interface{}, 0)
	limit = 10
	if len(features.Features) < limit {
		limit = len(features.Features)
	}
	for _, f := range features.Features[:limit] {
		entry := map[string]interface{}{
			"slug":      f.Slug,
			"title":     f.Title,
			"status":    f.Status,
			"priority":  f.Priority,
			"assignees": f.Assignees,
			"points":    f.Points,
			"tags":      f.Tags,
		}
		if f.RoadmapCard != nil {
			entry["roadmap_card"] = *f.RoadmapCard
		} else {
			entry["roadmap_card"] = nil
		}
		topFeatures = append(topFeatures, entry)
	}

	// open_issues
	openIssues := make([]map[string]interface{}, 0)
	for _, issue := range issues.Issues {
		if issue.Status == "closed" {
			continue
		}
		openIssues = append(openIssues, map[string]interface{}{
			"slug":      issue.Slug,
			"title":     issue.Title,
			"status":    issue.Status,
			"type":      issue.Type,
			"priority":  issue.Priority,
			"labels":    issue.Labels,
			"assignees": issue.Assignees,
			"points":    issue.Points,
		})
	}

	// team with initials
	teamResult := make([]map[string]interface{}, 0, len(team))
	for _, t := range team {
		initials := computeInitials(t.Name)
		teamResult = append(teamResult, map[string]interface{}{
			"name":     t.Name,
			"role":     t.Role,
			"initials": initials,
		})
	}

	// health (hardcoded for now, matching TypeScript)
	healthChecks := []map[string]interface{}{
		{"level": "pass", "message": "Directory structure is valid"},
		{"level": "pass", "message": "forge.yaml schema is valid"},
		{"level": "pass", "message": "All features have valid frontmatter"},
		{"level": "pass", "message": "All issues have valid frontmatter"},
		{"level": "pass", "message": "Backlog order is valid"},
		{"level": "pass", "message": "Sprint references are valid"},
		{"level": "pass", "message": "No duplicate slugs found"},
		{"level": "warn", "message": "2 features missing assignees"},
		{"level": "warn", "message": "Sprint 2 has unresolved items"},
		{"level": "fail", "message": "Backlog contains orphaned reference: \"deleted-feature\""},
	}

	passed := 0
	warnings := 0
	failed := 0
	for _, c := range healthChecks {
		switch c["level"] {
		case "pass":
			passed++
		case "warn":
			warnings++
		case "fail":
			failed++
		}
	}

	// roadmap summary
	byColumn := map[string]int{}
	for _, col := range roadmap.Columns {
		byColumn[col] = 0
	}
	for _, card := range roadmap.Cards {
		byColumn[card.Column]++
	}

	response := map[string]interface{}{
		"project":       "forge-project",
		"feature_count": len(features.Features),
		"by_status":     byStatus,
		"active_sprint": activeSprint,
		"recent_docs":   recentDocs,
		"top_features":  topFeatures,
		"open_issues":   openIssues,
		"team":          teamResult,
		"health": map[string]interface{}{
			"passed":   passed,
			"warnings": warnings,
			"failed":   failed,
			"last_run": "Last run: Apr 10, 2026 at 2:32 PM",
			"checks":   healthChecks,
		},
		"roadmap": map[string]interface{}{
			"title":       roadmap.Title,
			"total_cards": len(roadmap.Cards),
			"columns":     roadmap.Columns,
			"by_column":   byColumn,
			"row_count":   len(roadmap.Rows),
		},
	}

	JSON(w, 200, response)
}

func computeInitials(name string) string {
	words := strings.Fields(strings.TrimSpace(name))
	if len(words) >= 2 {
		return strings.ToUpper(string([]rune(words[0])[0:1]) + string([]rune(words[1])[0:1]))
	}
	if len(name) >= 2 {
		return strings.ToUpper(string([]rune(name)[0:2]))
	}
	return strings.ToUpper(name)
}
