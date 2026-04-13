// Package model defines all domain types for the Forge project management tool.
package model

// FeatureStatus represents the workflow state of a feature.
type FeatureStatus string

const (
	FeatureStatusDraft      FeatureStatus = "draft"
	FeatureStatusDeferred   FeatureStatus = "deferred"
	FeatureStatusReady      FeatureStatus = "ready"
	FeatureStatusInProgress FeatureStatus = "in-progress"
	FeatureStatusReview     FeatureStatus = "review"
	FeatureStatusDone       FeatureStatus = "done"
)

var ValidFeatureStatuses = map[FeatureStatus]bool{
	FeatureStatusDraft:      true,
	FeatureStatusDeferred:   true,
	FeatureStatusReady:      true,
	FeatureStatusInProgress: true,
	FeatureStatusReview:     true,
	FeatureStatusDone:       true,
}

// IssueStatus represents the state of an issue.
type IssueStatus string

const (
	IssueStatusOpen       IssueStatus = "open"
	IssueStatusInProgress IssueStatus = "in-progress"
	IssueStatusClosed     IssueStatus = "closed"
)

var ValidIssueStatuses = map[IssueStatus]bool{
	IssueStatusOpen:       true,
	IssueStatusInProgress: true,
	IssueStatusClosed:     true,
}

// IssueType represents the category of an issue.
type IssueType string

const (
	IssueTypeBug         IssueType = "bug"
	IssueTypeTask        IssueType = "task"
	IssueTypeImprovement IssueType = "improvement"
	IssueTypeChore       IssueType = "chore"
)

var ValidIssueTypes = map[IssueType]bool{
	IssueTypeBug:         true,
	IssueTypeTask:        true,
	IssueTypeImprovement: true,
	IssueTypeChore:       true,
}

// Priority represents the priority level.
type Priority string

const (
	PriorityCritical Priority = "critical"
	PriorityHigh     Priority = "high"
	PriorityMedium   Priority = "medium"
	PriorityLow      Priority = "low"
)

var ValidPriorities = map[Priority]bool{
	PriorityCritical: true,
	PriorityHigh:     true,
	PriorityMedium:   true,
	PriorityLow:      true,
}

// Feature represents a product feature stored on disk.
type Feature struct {
	Slug        string   `json:"slug"`
	Title       string   `json:"title"`
	Status      string   `json:"status"`
	Priority    string   `json:"priority"`
	Assignees   []string `json:"assignees"`
	Points      *float64 `json:"points"`
	Sprint      *string  `json:"sprint"`
	Tags        []string `json:"tags"`
	Created     string   `json:"created"`
	Modified    string   `json:"modified"`
	RoadmapCard *string  `json:"roadmap_card"`
	Body        string   `json:"body"`
	Order       int      `json:"order"`
}

// PaginatedFeatures is a paginated list response.
type PaginatedFeatures struct {
	Features   []Feature `json:"features"`
	Total      int       `json:"total"`
	Page       int       `json:"page"`
	Limit      int       `json:"limit"`
	TotalPages int       `json:"total_pages"`
}

// Issue represents a project issue stored on disk.
type Issue struct {
	Slug      string   `json:"slug"`
	Title     string   `json:"title"`
	Status    string   `json:"status"`
	Type      string   `json:"type"`
	Priority  string   `json:"priority"`
	Assignees []string `json:"assignees"`
	Points    *float64 `json:"points"`
	Sprint    *string  `json:"sprint"`
	Feature   *string  `json:"feature"`
	Labels    []string `json:"labels"`
	Created   string   `json:"created"`
	Modified  string   `json:"modified"`
	Body      string   `json:"body"`
	Order     int      `json:"order"`
}

// PaginatedIssues is a paginated list response.
type PaginatedIssues struct {
	Issues     []Issue `json:"issues"`
	Total      int     `json:"total"`
	Page       int     `json:"page"`
	Limit      int     `json:"limit"`
	TotalPages int     `json:"total_pages"`
}

// WikiDoc represents a wiki document stored on disk.
type WikiDoc struct {
	Slug        string  `json:"slug"`
	Title       string  `json:"title"`
	Description *string `json:"description"`
	Icon        *string `json:"icon"`
	UpdatedAt   string  `json:"updated_at"`
	Body        string  `json:"body"`
	Order       int     `json:"order"`
	Dirty       bool    `json:"dirty"`
}

// PaginatedWikiDocs is a paginated list response.
type PaginatedWikiDocs struct {
	Docs       []WikiDoc `json:"docs"`
	Total      int       `json:"total"`
	Page       int       `json:"page"`
	Limit      int       `json:"limit"`
	TotalPages int       `json:"total_pages"`
}

// ProjectDoc represents a project document stored on disk (read-only).
type ProjectDoc struct {
	Slug  string  `json:"slug"`
	Title string  `json:"title"`
	Icon  *string `json:"icon"`
	Body  string  `json:"body"`
	Order int     `json:"order"`
}

// RoadmapCard represents a card on the roadmap board.
type RoadmapCard struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Notes       string  `json:"notes"`
	Column      string  `json:"column"`
	Row         string  `json:"row"`
	Order       int     `json:"order"`
	FeatureSlug *string `json:"feature_slug"`
}

// RoadmapRow represents a swim lane on the roadmap.
type RoadmapRow struct {
	Label string  `json:"label"`
	Color *string `json:"color"`
}

// Roadmap represents the full roadmap board.
type Roadmap struct {
	Title    string        `json:"title"`
	Columns  []string      `json:"columns"`
	Rows     []RoadmapRow  `json:"rows"`
	Cards    []RoadmapCard `json:"cards"`
	Modified *string       `json:"modified"`
}

// TeamMember represents a team member.
type TeamMember struct {
	Name   string  `json:"name"`
	Role   string  `json:"role"`
	GitHub *string `json:"github"`
}

// ChatSession represents a stored AI chat session.
type ChatSession struct {
	ID       string        `json:"id"`
	Name     string        `json:"name"`
	SavedAt  int64         `json:"saved_at"`
	Messages []interface{} `json:"messages"`
}

// Artifact represents a file artifact attached to a feature or issue.
type Artifact struct {
	Name string `json:"name"`
	Size int64  `json:"size"`
	Type string `json:"type"`
}

// ArtifactContent represents a text artifact's full content.
type ArtifactContent struct {
	Name     string `json:"name"`
	Content  string `json:"content"`
	Type     string `json:"type"`
	MimeType string `json:"mime_type"`
	Size     int64  `json:"size"`
}

// SearchResult represents a single search hit.
type SearchResult struct {
	Type     string  `json:"type"`
	Slug     string  `json:"slug"`
	Title    string  `json:"title"`
	Snippet  string  `json:"snippet"`
	Status   *string `json:"status,omitempty"`
	Assignee *string `json:"assignee,omitempty"`
}

// SearchResponse is the response for a search query.
type SearchResponse struct {
	Query   string         `json:"query"`
	Total   int            `json:"total"`
	Results []SearchResult `json:"results"`
}

// GitStatus represents the git state of the project.
type GitStatus struct {
	Branch *string `json:"branch"`
	Commit *string `json:"commit"`
	Dirty  bool    `json:"dirty"`
}

// ListFeaturesParams holds query parameters for listing features.
type ListFeaturesParams struct {
	Page      int
	Limit     int
	Status    []string
	Priority  []string
	Assignee  *string // nil = no filter, pointer to "" means __unassigned__
	PointsMin *float64
	PointsMax *float64
	Tags      []string
	Sort      string
	Dir       string
}

// ListIssuesParams holds query parameters for listing issues.
type ListIssuesParams struct {
	Page      int
	Limit     int
	Status    []string
	Type      []string
	Priority  []string
	Assignee  *string
	Feature   *string
	PointsMin *float64
	PointsMax *float64
	Labels    []string
	Sort      string
	Dir       string
}

// CreateFeatureInput is the validated input for creating a feature.
type CreateFeatureInput struct {
	Title         string  `json:"title"`
	Body          *string `json:"body"`
	Priority      *string `json:"priority"`
	RoadmapCardID *string `json:"roadmap_card_id"`
}

// UpdateFeatureInput is the validated input for updating a feature.
type UpdateFeatureInput struct {
	Title     *string  `json:"title"`
	Status    *string  `json:"status"`
	Priority  *string  `json:"priority"`
	Assignees []string `json:"assignees"`
	Points    *float64 `json:"points"`
	Tags      []string `json:"tags"`
	Body      *string  `json:"body"`
	// PointsSet and AssigneesSet track whether the field was present in the JSON
	PointsSet    bool
	AssigneesSet bool
	TagsSet      bool
}

// CreateIssueInput is the validated input for creating an issue.
type CreateIssueInput struct {
	Title    string  `json:"title"`
	Body     *string `json:"body"`
	Type     *string `json:"type"`
	Priority *string `json:"priority"`
	Feature  *string `json:"feature"`
}

// UpdateIssueInput is the validated input for updating an issue.
type UpdateIssueInput struct {
	Title     *string  `json:"title"`
	Status    *string  `json:"status"`
	Type      *string  `json:"type"`
	Priority  *string  `json:"priority"`
	Assignees []string `json:"assignees"`
	Points    *float64 `json:"points"`
	Sprint    *string  `json:"sprint"`
	Feature   *string  `json:"feature"`
	Labels    []string `json:"labels"`
	Body      *string  `json:"body"`
	// Set flags for nullable fields
	PointsSet    bool
	AssigneesSet bool
	LabelsSet    bool
	SprintSet    bool
	FeatureSet   bool
}

// SaveWikiDocInput is the validated input for saving a wiki doc.
type SaveWikiDocInput struct {
	Title string  `json:"title"`
	Icon  *string `json:"icon"`
	Body  string  `json:"body"`
}

// UpsertSessionInput is the validated input for upserting a session.
type UpsertSessionInput struct {
	ID       string        `json:"id"`
	Name     *string       `json:"name"`
	SavedAt  *int64        `json:"saved_at"`
	Messages []interface{} `json:"messages"`
}
