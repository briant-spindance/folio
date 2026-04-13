package store

import (
	"math"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/briantol/folio/internal/frontmatter"
	"github.com/briantol/folio/internal/model"
)

// IssueStore provides filesystem-backed CRUD for issues.
type IssueStore struct {
	paths *Paths
}

// NewIssueStore creates a new IssueStore.
func NewIssueStore(p *Paths) *IssueStore {
	return &IssueStore{paths: p}
}

func (s *IssueStore) readIssue(slug string) (*model.Issue, error) {
	mdPath := filepath.Join(s.paths.Issues, slug, "ISSUE.md")
	data, err := os.ReadFile(mdPath)
	if err != nil {
		return nil, err
	}

	doc, err := frontmatter.Parse(data)
	if err != nil {
		return nil, err
	}

	issue := &model.Issue{
		Slug:     slug,
		Title:    frontmatter.GetString(doc.Data, "title"),
		Status:   frontmatter.GetString(doc.Data, "status"),
		Type:     frontmatter.GetString(doc.Data, "type"),
		Priority: normalizePriority(doc.Data),
		Points:   frontmatter.GetFloat(doc.Data, "points"),
		Sprint:   frontmatter.GetStringPtr(doc.Data, "sprint"),
		Feature:  frontmatter.GetStringPtr(doc.Data, "feature"),
		Created:  frontmatter.GetString(doc.Data, "created"),
		Modified: frontmatter.GetString(doc.Data, "modified"),
		Body:     doc.Body,
		Order:    frontmatter.GetInt(doc.Data, "order"),
	}

	assignees := frontmatter.GetStringSlice(doc.Data, "assignees")
	if len(assignees) == 0 {
		if a := frontmatter.GetString(doc.Data, "assignee"); a != "" {
			assignees = []string{a}
		}
	}
	if assignees == nil {
		assignees = []string{}
	}
	issue.Assignees = assignees

	labels := frontmatter.GetStringSlice(doc.Data, "labels")
	if labels == nil {
		labels = []string{}
	}
	issue.Labels = labels

	if issue.Status == "" {
		issue.Status = "open"
	}
	if issue.Type == "" {
		issue.Type = "task"
	}

	return issue, nil
}

func (s *IssueStore) readAllIssues() []model.Issue {
	entries, err := os.ReadDir(s.paths.Issues)
	if err != nil {
		return nil
	}

	issues := make([]model.Issue, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}
		issue, err := s.readIssue(entry.Name())
		if err != nil {
			continue
		}
		issues = append(issues, *issue)
	}

	return issues
}

// List returns a paginated, filtered, sorted list of issues.
func (s *IssueStore) List(params model.ListIssuesParams) model.PaginatedIssues {
	all := s.readAllIssues()

	filtered := make([]model.Issue, 0, len(all))
	for _, issue := range all {
		if !matchIssueFilters(issue, params) {
			continue
		}
		filtered = append(filtered, issue)
	}

	sortIssues(filtered, params.Sort, params.Dir)

	total := len(filtered)
	totalPages := int(math.Max(1, math.Ceil(float64(total)/float64(params.Limit))))
	page := params.Page
	if page > totalPages {
		page = totalPages
	}
	start := (page - 1) * params.Limit
	end := start + params.Limit
	if end > total {
		end = total
	}
	if start > total {
		start = total
	}

	return model.PaginatedIssues{
		Issues:     filtered[start:end],
		Total:      total,
		Page:       page,
		Limit:      params.Limit,
		TotalPages: totalPages,
	}
}

func matchIssueFilters(issue model.Issue, p model.ListIssuesParams) bool {
	if len(p.Status) > 0 && !containsStr(p.Status, issue.Status) {
		return false
	}
	if len(p.Type) > 0 && !containsStr(p.Type, issue.Type) {
		return false
	}
	if len(p.Priority) > 0 && !containsStr(p.Priority, issue.Priority) {
		return false
	}
	if p.Assignee != nil {
		if *p.Assignee == "" {
			if len(issue.Assignees) > 0 {
				return false
			}
		} else {
			if !containsStr(issue.Assignees, *p.Assignee) {
				return false
			}
		}
	}
	if p.Feature != nil {
		if *p.Feature == "" {
			// __unlinked__ filter
			if issue.Feature != nil {
				return false
			}
		} else {
			if issue.Feature == nil || *issue.Feature != *p.Feature {
				return false
			}
		}
	}
	if p.PointsMin != nil && (issue.Points == nil || *issue.Points < *p.PointsMin) {
		return false
	}
	if p.PointsMax != nil && (issue.Points == nil || *issue.Points > *p.PointsMax) {
		return false
	}
	if len(p.Labels) > 0 {
		found := false
		for _, l := range p.Labels {
			if containsStr(issue.Labels, l) {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

var issueStatusOrder = map[string]int{
	"in-progress": 0,
	"open":        1,
	"closed":      2,
}

var issueTypeOrder = map[string]int{
	"bug":         0,
	"task":        1,
	"improvement": 2,
	"chore":       3,
}

func sortIssues(issues []model.Issue, sortBy, dir string) {
	sort.SliceStable(issues, func(i, j int) bool {
		var less bool
		switch sortBy {
		case "title":
			less = strings.ToLower(issues[i].Title) < strings.ToLower(issues[j].Title)
		case "status":
			less = issueStatusOrder[issues[i].Status] < issueStatusOrder[issues[j].Status]
		case "type":
			less = issueTypeOrder[issues[i].Type] < issueTypeOrder[issues[j].Type]
		case "priority":
			less = priorityOrder[issues[i].Priority] < priorityOrder[issues[j].Priority]
		case "modified":
			less = issues[i].Modified < issues[j].Modified
		default:
			less = issues[i].Order < issues[j].Order
		}
		if dir == "desc" {
			return !less
		}
		return less
	})
}

// Get returns a single issue by slug.
func (s *IssueStore) Get(slug string) *model.Issue {
	issue, err := s.readIssue(slug)
	if err != nil {
		return nil
	}
	return issue
}

// Create creates a new issue.
func (s *IssueStore) Create(input model.CreateIssueInput) (*model.Issue, error) {
	slug := slugify(input.Title)
	dir := filepath.Join(s.paths.Issues, slug)
	if _, err := os.Stat(dir); err == nil {
		return nil, os.ErrExist
	}

	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	today := time.Now().Format("2006-01-02")
	data := map[string]interface{}{
		"title":    input.Title,
		"status":   "open",
		"type":     "task",
		"created":  today,
		"modified": today,
	}
	if input.Type != nil {
		data["type"] = *input.Type
	}
	if input.Priority != nil {
		data["priority"] = *input.Priority
	} else {
		data["priority"] = "medium"
	}
	if input.Feature != nil {
		data["feature"] = *input.Feature
	}

	body := ""
	if input.Body != nil {
		body = *input.Body
	}

	content, err := frontmatter.Stringify(data, body)
	if err != nil {
		os.RemoveAll(dir)
		return nil, err
	}

	mdPath := filepath.Join(dir, "ISSUE.md")
	if err := os.WriteFile(mdPath, content, 0644); err != nil {
		os.RemoveAll(dir)
		return nil, err
	}

	return s.readIssue(slug)
}

// Update updates an existing issue. Returns nil if not found.
func (s *IssueStore) Update(slug string, input model.UpdateIssueInput) (*model.Issue, error) {
	mdPath := filepath.Join(s.paths.Issues, slug, "ISSUE.md")
	rawData, err := os.ReadFile(mdPath)
	if err != nil {
		return nil, nil
	}

	doc, err := frontmatter.Parse(rawData)
	if err != nil {
		return nil, err
	}

	if input.Title != nil {
		doc.Data["title"] = *input.Title
	}
	if input.Status != nil {
		doc.Data["status"] = *input.Status
	}
	if input.Type != nil {
		doc.Data["type"] = *input.Type
	}
	if input.Priority != nil {
		doc.Data["priority"] = *input.Priority
	}
	if input.AssigneesSet {
		if input.Assignees == nil {
			doc.Data["assignees"] = []string{}
		} else {
			doc.Data["assignees"] = input.Assignees
		}
		delete(doc.Data, "assignee")
	}
	if input.PointsSet {
		if input.Points == nil {
			doc.Data["points"] = nil
		} else {
			doc.Data["points"] = *input.Points
		}
	}
	if input.SprintSet {
		if input.Sprint == nil {
			delete(doc.Data, "sprint")
		} else {
			doc.Data["sprint"] = *input.Sprint
		}
	}
	if input.FeatureSet {
		if input.Feature == nil {
			delete(doc.Data, "feature")
		} else {
			doc.Data["feature"] = *input.Feature
		}
	}
	if input.LabelsSet {
		if input.Labels == nil {
			doc.Data["labels"] = []string{}
		} else {
			doc.Data["labels"] = input.Labels
		}
	}

	body := doc.Body
	if input.Body != nil {
		body = *input.Body
	}

	doc.Data["modified"] = time.Now().Format("2006-01-02")

	content, err := frontmatter.Stringify(doc.Data, body)
	if err != nil {
		return nil, err
	}

	if err := os.WriteFile(mdPath, content, 0644); err != nil {
		return nil, err
	}

	return s.readIssue(slug)
}

// Delete removes an issue.
func (s *IssueStore) Delete(slug string) bool {
	dir := filepath.Join(s.paths.Issues, slug)
	if _, err := os.Stat(dir); err != nil {
		return false
	}
	os.RemoveAll(dir)
	return true
}

// Reorder sets order for the given slugs.
func (s *IssueStore) Reorder(slugs []string, offset int) {
	for i, slug := range slugs {
		mdPath := filepath.Join(s.paths.Issues, slug, "ISSUE.md")
		rawData, err := os.ReadFile(mdPath)
		if err != nil {
			continue
		}
		doc, err := frontmatter.Parse(rawData)
		if err != nil {
			continue
		}
		doc.Data["order"] = offset + i
		content, err := frontmatter.Stringify(doc.Data, doc.Body)
		if err != nil {
			continue
		}
		os.WriteFile(mdPath, content, 0644)
	}
}

// ListArtifacts returns artifacts for an issue.
func (s *IssueStore) ListArtifacts(slug string) ([]model.Artifact, bool) {
	dir := filepath.Join(s.paths.Issues, slug)
	if _, err := os.Stat(dir); err != nil {
		return nil, false
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, false
	}

	artifacts := make([]model.Artifact, 0)
	for _, entry := range entries {
		if entry.IsDir() || entry.Name() == "ISSUE.md" {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		artifacts = append(artifacts, model.Artifact{
			Name: entry.Name(),
			Size: info.Size(),
			Type: artifactType(entry.Name()),
		})
	}

	return artifacts, true
}

// GetArtifactContent returns the text content of an issue artifact.
func (s *IssueStore) GetArtifactContent(slug, filename string) *model.ArtifactContent {
	path, ok := s.safeArtifactPath(slug, filename)
	if !ok {
		return nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	mt := mimeType(filename)
	return &model.ArtifactContent{
		Name:     filename,
		Content:  string(data),
		Type:     artifactType(filename),
		MimeType: mt,
		Size:     int64(len(data)),
	}
}

// GetArtifactFilePath returns absolute path and mime type for raw serving.
func (s *IssueStore) GetArtifactFilePath(slug, filename string) (string, string, bool) {
	path, ok := s.safeArtifactPath(slug, filename)
	if !ok {
		return "", "", false
	}
	if _, err := os.Stat(path); err != nil {
		return "", "", false
	}
	return path, mimeType(filename), true
}

// SaveArtifactContent saves text content to an issue artifact.
func (s *IssueStore) SaveArtifactContent(slug, filename, content string) *model.Artifact {
	path, ok := s.safeArtifactPath(slug, filename)
	if !ok {
		return nil
	}
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		return nil
	}
	info, _ := os.Stat(path)
	return &model.Artifact{
		Name: filename,
		Size: info.Size(),
		Type: artifactType(filename),
	}
}

// SaveArtifactBuffer saves binary content to an issue artifact.
func (s *IssueStore) SaveArtifactBuffer(slug, filename string, data []byte) *model.Artifact {
	path, ok := s.safeArtifactPath(slug, filename)
	if !ok {
		return nil
	}
	if err := os.WriteFile(path, data, 0644); err != nil {
		return nil
	}
	return &model.Artifact{
		Name: filename,
		Size: int64(len(data)),
		Type: artifactType(filename),
	}
}

// DeleteArtifact deletes an issue artifact.
func (s *IssueStore) DeleteArtifact(slug, filename string) bool {
	path, ok := s.safeArtifactPath(slug, filename)
	if !ok {
		return false
	}
	if err := os.Remove(path); err != nil {
		return false
	}
	return true
}

func (s *IssueStore) safeArtifactPath(slug, filename string) (string, bool) {
	if filename == "ISSUE.md" || filename == "" {
		return "", false
	}
	if strings.Contains(filename, "..") || strings.ContainsAny(filename, "/\\\x00") {
		return "", false
	}
	dir := filepath.Join(s.paths.Issues, slug)
	if _, err := os.Stat(dir); err != nil {
		return "", false
	}
	path := filepath.Join(dir, filename)
	resolved, err := filepath.Abs(path)
	if err != nil {
		return "", false
	}
	absDir, _ := filepath.Abs(dir)
	if !strings.HasPrefix(resolved, absDir+string(filepath.Separator)) {
		return "", false
	}
	return path, true
}
