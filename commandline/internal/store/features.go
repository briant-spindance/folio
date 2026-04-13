package store

import (
	"fmt"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/briantol/folio/internal/frontmatter"
	"github.com/briantol/folio/internal/model"
)

// FeatureStore provides filesystem-backed CRUD for features.
type FeatureStore struct {
	paths *Paths
}

// NewFeatureStore creates a new FeatureStore.
func NewFeatureStore(p *Paths) *FeatureStore {
	return &FeatureStore{paths: p}
}

// readFeature reads a single feature from disk.
func (s *FeatureStore) readFeature(slug string) (*model.Feature, error) {
	mdPath := filepath.Join(s.paths.Features, slug, "FEATURE.md")
	data, err := os.ReadFile(mdPath)
	if err != nil {
		return nil, err
	}

	doc, err := frontmatter.Parse(data)
	if err != nil {
		return nil, err
	}

	f := &model.Feature{
		Slug:     slug,
		Title:    frontmatter.GetString(doc.Data, "title"),
		Status:   frontmatter.GetString(doc.Data, "status"),
		Priority: normalizePriority(doc.Data),
		Points:   frontmatter.GetFloat(doc.Data, "points"),
		Sprint:   frontmatter.GetStringPtr(doc.Data, "sprint"),
		Created:  frontmatter.GetString(doc.Data, "created"),
		Modified: frontmatter.GetString(doc.Data, "modified"),
		Body:     doc.Body,
		Order:    frontmatter.GetInt(doc.Data, "order"),
	}

	// Handle assignees: support both "assignee" (string) and "assignees" (array)
	assignees := frontmatter.GetStringSlice(doc.Data, "assignees")
	if len(assignees) == 0 {
		if a := frontmatter.GetString(doc.Data, "assignee"); a != "" {
			assignees = []string{a}
		}
	}
	if assignees == nil {
		assignees = []string{}
	}
	f.Assignees = assignees

	tags := frontmatter.GetStringSlice(doc.Data, "tags")
	if tags == nil {
		tags = []string{}
	}
	f.Tags = tags

	// roadmapCard
	f.RoadmapCard = frontmatter.GetStringPtr(doc.Data, "roadmapCard")

	if f.Status == "" {
		f.Status = "draft"
	}

	return f, nil
}

// normalizePriority handles both string and legacy numeric priorities.
func normalizePriority(data map[string]interface{}) string {
	v, ok := data["priority"]
	if !ok || v == nil {
		return ""
	}
	switch p := v.(type) {
	case string:
		return p
	case int:
		return numericToPriority(p)
	case int64:
		return numericToPriority(int(p))
	case float64:
		return numericToPriority(int(p))
	default:
		return fmt.Sprintf("%v", v)
	}
}

func numericToPriority(n int) string {
	switch {
	case n == 1:
		return "critical"
	case n <= 3:
		return "high"
	case n <= 6:
		return "medium"
	default:
		return "low"
	}
}

// readAllFeatures reads all features from disk.
func (s *FeatureStore) readAllFeatures() []model.Feature {
	entries, err := os.ReadDir(s.paths.Features)
	if err != nil {
		return nil
	}

	features := make([]model.Feature, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}
		f, err := s.readFeature(entry.Name())
		if err != nil {
			continue
		}
		features = append(features, *f)
	}

	return features
}

// List returns a paginated, filtered, sorted list of features.
func (s *FeatureStore) List(params model.ListFeaturesParams) model.PaginatedFeatures {
	all := s.readAllFeatures()

	// Filter
	filtered := make([]model.Feature, 0, len(all))
	for _, f := range all {
		if !matchFeatureFilters(f, params) {
			continue
		}
		filtered = append(filtered, f)
	}

	// Sort
	sortFeatures(filtered, params.Sort, params.Dir)

	// Paginate
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

	return model.PaginatedFeatures{
		Features:   filtered[start:end],
		Total:      total,
		Page:       page,
		Limit:      params.Limit,
		TotalPages: totalPages,
	}
}

func matchFeatureFilters(f model.Feature, p model.ListFeaturesParams) bool {
	if len(p.Status) > 0 && !containsStr(p.Status, f.Status) {
		return false
	}
	if len(p.Priority) > 0 && !containsStr(p.Priority, f.Priority) {
		return false
	}
	if p.Assignee != nil {
		if *p.Assignee == "" {
			// __unassigned__ filter
			if len(f.Assignees) > 0 {
				return false
			}
		} else {
			if !containsStr(f.Assignees, *p.Assignee) {
				return false
			}
		}
	}
	if p.PointsMin != nil && (f.Points == nil || *f.Points < *p.PointsMin) {
		return false
	}
	if p.PointsMax != nil && (f.Points == nil || *f.Points > *p.PointsMax) {
		return false
	}
	if len(p.Tags) > 0 {
		found := false
		for _, t := range p.Tags {
			if containsStr(f.Tags, t) {
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

var priorityOrder = map[string]int{
	"critical": 0,
	"high":     1,
	"medium":   2,
	"low":      3,
}

var featureStatusOrder = map[string]int{
	"in-progress": 0,
	"review":      1,
	"ready":       2,
	"draft":       3,
	"deferred":    4,
	"done":        5,
}

func sortFeatures(features []model.Feature, sortBy, dir string) {
	sort.SliceStable(features, func(i, j int) bool {
		var less bool
		switch sortBy {
		case "title":
			less = strings.ToLower(features[i].Title) < strings.ToLower(features[j].Title)
		case "status":
			less = featureStatusOrder[features[i].Status] < featureStatusOrder[features[j].Status]
		case "priority":
			less = priorityOrder[features[i].Priority] < priorityOrder[features[j].Priority]
		case "modified":
			less = features[i].Modified < features[j].Modified
		default: // "order"
			less = features[i].Order < features[j].Order
		}
		if dir == "desc" {
			return !less
		}
		return less
	})
}

// Get returns a single feature by slug, or nil if not found.
func (s *FeatureStore) Get(slug string) *model.Feature {
	f, err := s.readFeature(slug)
	if err != nil {
		return nil
	}
	return f
}

// Create creates a new feature and returns it.
func (s *FeatureStore) Create(input model.CreateFeatureInput) (*model.Feature, error) {
	slug := slugify(input.Title)
	dir := filepath.Join(s.paths.Features, slug)
	if _, err := os.Stat(dir); err == nil {
		return nil, fmt.Errorf("feature '%s' already exists", slug)
	}

	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	today := time.Now().Format("2006-01-02")
	data := map[string]interface{}{
		"title":    input.Title,
		"status":   "draft",
		"created":  today,
		"modified": today,
		"tags":     []string{},
	}
	if input.Priority != nil {
		data["priority"] = *input.Priority
	} else {
		data["priority"] = "medium"
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

	mdPath := filepath.Join(dir, "FEATURE.md")
	if err := os.WriteFile(mdPath, content, 0644); err != nil {
		os.RemoveAll(dir)
		return nil, err
	}

	return s.readFeature(slug)
}

// Update updates an existing feature. Returns nil if not found.
func (s *FeatureStore) Update(slug string, input model.UpdateFeatureInput) (*model.Feature, error) {
	mdPath := filepath.Join(s.paths.Features, slug, "FEATURE.md")
	rawData, err := os.ReadFile(mdPath)
	if err != nil {
		return nil, nil // not found
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
	if input.TagsSet {
		if input.Tags == nil {
			doc.Data["tags"] = []string{}
		} else {
			doc.Data["tags"] = input.Tags
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

	return s.readFeature(slug)
}

// Delete removes a feature. Returns false if not found.
func (s *FeatureStore) Delete(slug string) bool {
	dir := filepath.Join(s.paths.Features, slug)
	if _, err := os.Stat(dir); err != nil {
		return false
	}
	os.RemoveAll(dir)
	return true
}

// Reorder sets the order field for the given slugs starting at offset.
func (s *FeatureStore) Reorder(slugs []string, offset int) {
	for i, slug := range slugs {
		mdPath := filepath.Join(s.paths.Features, slug, "FEATURE.md")
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

// ListArtifacts returns the list of non-FEATURE.md files in a feature directory.
// Returns nil, false if the feature doesn't exist.
func (s *FeatureStore) ListArtifacts(slug string) ([]model.Artifact, bool) {
	dir := filepath.Join(s.paths.Features, slug)
	if _, err := os.Stat(dir); err != nil {
		return nil, false
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, false
	}

	artifacts := make([]model.Artifact, 0)
	for _, entry := range entries {
		if entry.IsDir() || entry.Name() == "FEATURE.md" {
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

// GetArtifactContent returns the text content of an artifact.
func (s *FeatureStore) GetArtifactContent(slug, filename string) *model.ArtifactContent {
	path, ok := s.safeArtifactPath(slug, filename, "FEATURE.md")
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

// GetArtifactFilePath returns the absolute path and mime type for raw serving.
func (s *FeatureStore) GetArtifactFilePath(slug, filename string) (string, string, bool) {
	path, ok := s.safeArtifactPath(slug, filename, "FEATURE.md")
	if !ok {
		return "", "", false
	}
	if _, err := os.Stat(path); err != nil {
		return "", "", false
	}
	return path, mimeType(filename), true
}

// SaveArtifactContent saves text content to an artifact file.
func (s *FeatureStore) SaveArtifactContent(slug, filename, content string) *model.Artifact {
	path, ok := s.safeArtifactPath(slug, filename, "FEATURE.md")
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

// SaveArtifactBuffer saves binary content to an artifact file.
func (s *FeatureStore) SaveArtifactBuffer(slug, filename string, data []byte) *model.Artifact {
	path, ok := s.safeArtifactPath(slug, filename, "FEATURE.md")
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

// DeleteArtifact deletes an artifact file. Returns false if not found.
func (s *FeatureStore) DeleteArtifact(slug, filename string) bool {
	path, ok := s.safeArtifactPath(slug, filename, "FEATURE.md")
	if !ok {
		return false
	}
	if err := os.Remove(path); err != nil {
		return false
	}
	return true
}

func (s *FeatureStore) safeArtifactPath(slug, filename, reservedName string) (string, bool) {
	if filename == reservedName || filename == "" {
		return "", false
	}
	if strings.Contains(filename, "..") || strings.ContainsAny(filename, "/\\\x00") {
		return "", false
	}
	dir := filepath.Join(s.paths.Features, slug)
	if _, err := os.Stat(dir); err != nil {
		return "", false
	}
	path := filepath.Join(dir, filename)
	// Verify path stays inside the feature directory
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

// Helper functions shared across stores

func slugify(title string) string {
	s := strings.ToLower(title)
	re := regexp.MustCompile(`[^\w\s-]`)
	s = re.ReplaceAllString(s, "")
	s = regexp.MustCompile(`\s+`).ReplaceAllString(s, "-")
	s = regexp.MustCompile(`-+`).ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "untitled"
	}
	return s
}

func containsStr(slice []string, val string) bool {
	for _, s := range slice {
		if s == val {
			return true
		}
	}
	return false
}

func artifactType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".xml", ".csv", ".html", ".css", ".js", ".ts", ".tsx", ".jsx", ".go", ".py", ".rb", ".rs", ".sh", ".sql", ".graphql", ".env", ".ini", ".cfg", ".conf", ".log", ".diff", ".patch":
		return "text"
	case ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".bmp":
		return "image"
	case ".pdf":
		return "pdf"
	default:
		return "binary"
	}
}

func mimeType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	mimes := map[string]string{
		".md":      "text/markdown",
		".txt":     "text/plain",
		".json":    "application/json",
		".yaml":    "application/x-yaml",
		".yml":     "application/x-yaml",
		".xml":     "application/xml",
		".csv":     "text/csv",
		".html":    "text/html",
		".css":     "text/css",
		".js":      "application/javascript",
		".ts":      "text/typescript",
		".tsx":     "text/typescript",
		".jsx":     "text/javascript",
		".go":      "text/x-go",
		".py":      "text/x-python",
		".rb":      "text/x-ruby",
		".rs":      "text/x-rust",
		".sh":      "text/x-shellscript",
		".sql":     "text/x-sql",
		".toml":    "application/toml",
		".env":     "text/plain",
		".ini":     "text/plain",
		".cfg":     "text/plain",
		".conf":    "text/plain",
		".log":     "text/plain",
		".png":     "image/png",
		".jpg":     "image/jpeg",
		".jpeg":    "image/jpeg",
		".gif":     "image/gif",
		".webp":    "image/webp",
		".svg":     "image/svg+xml",
		".ico":     "image/x-icon",
		".bmp":     "image/bmp",
		".pdf":     "application/pdf",
		".diff":    "text/x-diff",
		".patch":   "text/x-diff",
		".graphql": "application/graphql",
	}
	if m, ok := mimes[ext]; ok {
		return m
	}
	return "application/octet-stream"
}

// IsTextArtifact returns true if the file is a text artifact.
func IsTextArtifact(filename string) bool {
	return artifactType(filename) == "text"
}

// Convert yaml.v3 output to match gray-matter JSON-compatible types
func normalizeYAMLValue(v interface{}) interface{} {
	switch val := v.(type) {
	case map[string]interface{}:
		result := make(map[string]interface{})
		for k, v2 := range val {
			result[k] = normalizeYAMLValue(v2)
		}
		return result
	case []interface{}:
		result := make([]interface{}, len(val))
		for i, v2 := range val {
			result[i] = normalizeYAMLValue(v2)
		}
		return result
	default:
		return v
	}
}
