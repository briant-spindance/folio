package doctor

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/briant-spindance/folio/internal/store"
)

// setupDoctorDir creates a minimal valid folio data directory for testing.
func setupDoctorDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()

	dirs := []string{"features", "issues", "wiki", "sprints", "project-docs", ".sessions"}
	for _, d := range dirs {
		if err := os.MkdirAll(filepath.Join(dir, d), 0755); err != nil {
			t.Fatalf("failed to create directory %s: %v", d, err)
		}
	}

	// Write a valid folio.yaml.
	writeFile(t, dir, "folio.yaml", `project: test-project
version: "0.1.0"
workflow:
  states: [draft, ready, in-progress, done]
  default: draft
`)

	// Write a valid team.md.
	writeFile(t, dir, "team.md", `---
members:
  - name: Alice
    role: Developer
---
`)

	// Write a valid roadmap.md.
	writeFile(t, dir, "roadmap.md", `---
title: Roadmap
columns:
  - now
  - next
  - later
rows: []
cards: []
---
`)

	return dir
}

func writeFile(t *testing.T, dir, name, content string) {
	t.Helper()
	path := filepath.Join(dir, name)
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		t.Fatalf("failed to create parent dir for %s: %v", name, err)
	}
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatalf("failed to write %s: %v", name, err)
	}
}

func writeFeature(t *testing.T, dir, slug, content string) {
	t.Helper()
	featDir := filepath.Join(dir, "features", slug)
	if err := os.MkdirAll(featDir, 0755); err != nil {
		t.Fatalf("failed to create feature dir %s: %v", slug, err)
	}
	if err := os.WriteFile(filepath.Join(featDir, "FEATURE.md"), []byte(content), 0644); err != nil {
		t.Fatalf("failed to write feature %s: %v", slug, err)
	}
}

func writeIssue(t *testing.T, dir, slug, content string) {
	t.Helper()
	issueDir := filepath.Join(dir, "issues", slug)
	if err := os.MkdirAll(issueDir, 0755); err != nil {
		t.Fatalf("failed to create issue dir %s: %v", slug, err)
	}
	if err := os.WriteFile(filepath.Join(issueDir, "ISSUE.md"), []byte(content), 0644); err != nil {
		t.Fatalf("failed to write issue %s: %v", slug, err)
	}
}

func writeWiki(t *testing.T, dir, slug, content string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, "wiki", slug+".md"), []byte(content), 0644); err != nil {
		t.Fatalf("failed to write wiki %s: %v", slug, err)
	}
}

// hasCheckWith returns true if checks contain one with the given level and message substring.
func hasCheckWith(checks []Check, level Level, msgSubstr string) bool {
	for _, c := range checks {
		if c.Level == level && contains(c.Message, msgSubstr) {
			return true
		}
	}
	return false
}

func contains(s, substr string) bool {
	return len(substr) > 0 && len(s) >= len(substr) && containsStr(s, substr)
}

func containsStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// --- Structure Tests ---

func TestStructureValid(t *testing.T) {
	dir := setupDoctorDir(t)
	paths := store.NewPaths(dir)
	checks := checkStructure(paths)

	if len(checks) != 1 || checks[0].Level != LevelPass {
		t.Errorf("expected single pass check, got: %+v", checks)
	}
}

func TestStructureMissingDir(t *testing.T) {
	dir := setupDoctorDir(t)
	os.RemoveAll(filepath.Join(dir, "wiki"))
	paths := store.NewPaths(dir)
	checks := checkStructure(paths)

	if !hasCheckWith(checks, LevelFail, "wiki/") {
		t.Errorf("expected fail for missing wiki/, got: %+v", checks)
	}
}

func TestStructureMultipleMissing(t *testing.T) {
	dir := setupDoctorDir(t)
	os.RemoveAll(filepath.Join(dir, "features"))
	os.RemoveAll(filepath.Join(dir, "issues"))
	paths := store.NewPaths(dir)
	checks := checkStructure(paths)

	if !hasCheckWith(checks, LevelFail, "features/") {
		t.Errorf("expected fail for missing features/, got: %+v", checks)
	}
	if !hasCheckWith(checks, LevelFail, "issues/") {
		t.Errorf("expected fail for missing issues/, got: %+v", checks)
	}
}

// --- Config Tests ---

func TestConfigValid(t *testing.T) {
	dir := setupDoctorDir(t)
	paths := store.NewPaths(dir)
	checks := checkConfig(paths)

	if len(checks) != 1 || checks[0].Level != LevelPass {
		t.Errorf("expected single pass check, got: %+v", checks)
	}
}

func TestConfigMissing(t *testing.T) {
	dir := setupDoctorDir(t)
	os.Remove(filepath.Join(dir, "folio.yaml"))
	paths := store.NewPaths(dir)
	checks := checkConfig(paths)

	if !hasCheckWith(checks, LevelFail, "not found") {
		t.Errorf("expected fail for missing folio.yaml, got: %+v", checks)
	}
}

func TestConfigInvalidYAML(t *testing.T) {
	dir := setupDoctorDir(t)
	writeFile(t, dir, "folio.yaml", "{{invalid yaml")
	paths := store.NewPaths(dir)
	checks := checkConfig(paths)

	if !hasCheckWith(checks, LevelFail, "invalid YAML") {
		t.Errorf("expected fail for invalid YAML, got: %+v", checks)
	}
}

func TestConfigMissingProject(t *testing.T) {
	dir := setupDoctorDir(t)
	writeFile(t, dir, "folio.yaml", `version: "0.1.0"
workflow:
  states: [draft, done]
  default: draft
`)
	paths := store.NewPaths(dir)
	checks := checkConfig(paths)

	if !hasCheckWith(checks, LevelWarn, "missing 'project'") {
		t.Errorf("expected warn for missing project, got: %+v", checks)
	}
}

func TestConfigDefaultNotInStates(t *testing.T) {
	dir := setupDoctorDir(t)
	writeFile(t, dir, "folio.yaml", `project: test
workflow:
  states: [draft, done]
  default: banana
`)
	paths := store.NewPaths(dir)
	checks := checkConfig(paths)

	if !hasCheckWith(checks, LevelWarn, "not in workflow.states") {
		t.Errorf("expected warn for default not in states, got: %+v", checks)
	}
}

// --- Feature Tests ---

func TestFeaturesAllValid(t *testing.T) {
	dir := setupDoctorDir(t)
	writeFeature(t, dir, "auth", `---
title: Authentication
status: in-progress
priority: high
created: "2025-01-01"
modified: "2025-01-01"
---
Body.
`)
	writeFeature(t, dir, "dashboard", `---
title: Dashboard
status: draft
priority: medium
created: "2025-01-01"
modified: "2025-01-01"
---
Body.
`)
	paths := store.NewPaths(dir)
	checks := checkFeatures(paths)

	if len(checks) != 1 || checks[0].Level != LevelPass {
		t.Errorf("expected single pass check, got: %+v", checks)
	}
	if !containsStr(checks[0].Message, "2 features") {
		t.Errorf("expected '2 features' in message, got: %s", checks[0].Message)
	}
}

func TestFeaturesNoFeatures(t *testing.T) {
	dir := setupDoctorDir(t)
	paths := store.NewPaths(dir)
	checks := checkFeatures(paths)

	if len(checks) != 1 || checks[0].Level != LevelPass {
		t.Errorf("expected pass for no features, got: %+v", checks)
	}
}

func TestFeaturesMissingMD(t *testing.T) {
	dir := setupDoctorDir(t)
	// Create feature dir without FEATURE.md
	os.MkdirAll(filepath.Join(dir, "features", "broken"), 0755)
	paths := store.NewPaths(dir)
	checks := checkFeatures(paths)

	if !hasCheckWith(checks, LevelFail, "missing FEATURE.md") {
		t.Errorf("expected fail for missing FEATURE.md, got: %+v", checks)
	}
}

func TestFeaturesInvalidStatus(t *testing.T) {
	dir := setupDoctorDir(t)
	writeFeature(t, dir, "bad-status", `---
title: Bad Status
status: banana
priority: medium
---
`)
	paths := store.NewPaths(dir)
	checks := checkFeatures(paths)

	if !hasCheckWith(checks, LevelWarn, "invalid status 'banana'") {
		t.Errorf("expected warn for invalid status, got: %+v", checks)
	}
}

func TestFeaturesInvalidPriority(t *testing.T) {
	dir := setupDoctorDir(t)
	writeFeature(t, dir, "bad-priority", `---
title: Bad Priority
status: draft
priority: urgent
---
`)
	paths := store.NewPaths(dir)
	checks := checkFeatures(paths)

	if !hasCheckWith(checks, LevelWarn, "invalid priority 'urgent'") {
		t.Errorf("expected warn for invalid priority, got: %+v", checks)
	}
}

func TestFeaturesMissingTitle(t *testing.T) {
	dir := setupDoctorDir(t)
	writeFeature(t, dir, "no-title", `---
status: draft
priority: medium
---
`)
	paths := store.NewPaths(dir)
	checks := checkFeatures(paths)

	if !hasCheckWith(checks, LevelWarn, "missing title") {
		t.Errorf("expected warn for missing title, got: %+v", checks)
	}
}

// --- Issue Tests ---

func TestIssuesAllValid(t *testing.T) {
	dir := setupDoctorDir(t)
	writeIssue(t, dir, "bug-1", `---
title: Bug One
status: open
type: bug
priority: high
---
`)
	paths := store.NewPaths(dir)
	checks := checkIssues(paths)

	if len(checks) != 1 || checks[0].Level != LevelPass {
		t.Errorf("expected single pass check, got: %+v", checks)
	}
}

func TestIssuesMissingMD(t *testing.T) {
	dir := setupDoctorDir(t)
	os.MkdirAll(filepath.Join(dir, "issues", "broken"), 0755)
	paths := store.NewPaths(dir)
	checks := checkIssues(paths)

	if !hasCheckWith(checks, LevelFail, "missing ISSUE.md") {
		t.Errorf("expected fail for missing ISSUE.md, got: %+v", checks)
	}
}

func TestIssuesInvalidStatus(t *testing.T) {
	dir := setupDoctorDir(t)
	writeIssue(t, dir, "bad-status", `---
title: Bad Status Issue
status: invalid
type: task
---
`)
	paths := store.NewPaths(dir)
	checks := checkIssues(paths)

	if !hasCheckWith(checks, LevelWarn, "invalid status 'invalid'") {
		t.Errorf("expected warn for invalid issue status, got: %+v", checks)
	}
}

func TestIssuesInvalidType(t *testing.T) {
	dir := setupDoctorDir(t)
	writeIssue(t, dir, "bad-type", `---
title: Bad Type Issue
status: open
type: epic
---
`)
	paths := store.NewPaths(dir)
	checks := checkIssues(paths)

	if !hasCheckWith(checks, LevelWarn, "invalid type 'epic'") {
		t.Errorf("expected warn for invalid issue type, got: %+v", checks)
	}
}

// --- Wiki Tests ---

func TestWikiAllValid(t *testing.T) {
	dir := setupDoctorDir(t)
	writeWiki(t, dir, "overview", `---
title: Overview
---
Content here.
`)
	paths := store.NewPaths(dir)
	checks := checkWiki(paths)

	if len(checks) != 1 || checks[0].Level != LevelPass {
		t.Errorf("expected single pass check, got: %+v", checks)
	}
}

func TestWikiMissingTitle(t *testing.T) {
	dir := setupDoctorDir(t)
	writeWiki(t, dir, "no-title", `---
order: 0
---
Content.
`)
	paths := store.NewPaths(dir)
	checks := checkWiki(paths)

	if !hasCheckWith(checks, LevelWarn, "missing title") {
		t.Errorf("expected warn for wiki missing title, got: %+v", checks)
	}
}

// --- Team Tests ---

func TestTeamValid(t *testing.T) {
	dir := setupDoctorDir(t)
	paths := store.NewPaths(dir)
	checks := checkTeam(paths)

	if len(checks) != 1 || checks[0].Level != LevelPass {
		t.Errorf("expected single pass check, got: %+v", checks)
	}
}

func TestTeamMissing(t *testing.T) {
	dir := setupDoctorDir(t)
	os.Remove(filepath.Join(dir, "team.md"))
	paths := store.NewPaths(dir)
	checks := checkTeam(paths)

	if !hasCheckWith(checks, LevelWarn, "not found") {
		t.Errorf("expected warn for missing team.md, got: %+v", checks)
	}
}

func TestTeamMemberMissingName(t *testing.T) {
	dir := setupDoctorDir(t)
	writeFile(t, dir, "team.md", `---
members:
  - role: Developer
---
`)
	paths := store.NewPaths(dir)
	checks := checkTeam(paths)

	if !hasCheckWith(checks, LevelWarn, "missing 'name'") {
		t.Errorf("expected warn for member missing name, got: %+v", checks)
	}
}

// --- Roadmap Tests ---

func TestRoadmapValid(t *testing.T) {
	dir := setupDoctorDir(t)
	paths := store.NewPaths(dir)
	featureSlugs := map[string]bool{}
	checks := checkRoadmap(paths, featureSlugs)

	if len(checks) != 1 || checks[0].Level != LevelPass {
		t.Errorf("expected single pass check, got: %+v", checks)
	}
}

func TestRoadmapInvalidColumn(t *testing.T) {
	dir := setupDoctorDir(t)
	writeFile(t, dir, "roadmap.md", `---
title: Roadmap
columns:
  - now
  - next
rows:
  - label: Backend
cards:
  - id: abc123
    title: Test Card
    column: later
    row: Backend
    order: 0
---
`)
	paths := store.NewPaths(dir)
	checks := checkRoadmap(paths, map[string]bool{})

	if !hasCheckWith(checks, LevelWarn, "non-existent column 'later'") {
		t.Errorf("expected warn for invalid column, got: %+v", checks)
	}
}

func TestRoadmapInvalidRow(t *testing.T) {
	dir := setupDoctorDir(t)
	writeFile(t, dir, "roadmap.md", `---
title: Roadmap
columns:
  - now
rows:
  - label: Backend
cards:
  - id: abc123
    title: Test Card
    column: now
    row: Frontend
    order: 0
---
`)
	paths := store.NewPaths(dir)
	checks := checkRoadmap(paths, map[string]bool{})

	if !hasCheckWith(checks, LevelWarn, "non-existent row 'Frontend'") {
		t.Errorf("expected warn for invalid row, got: %+v", checks)
	}
}

// --- Duplicate Slug Tests ---

func TestNoDuplicateSlugs(t *testing.T) {
	featureSlugs := map[string]bool{"auth": true, "dashboard": true}
	issueSlugs := map[string]bool{"bug-1": true, "task-2": true}
	checks := checkDuplicateSlugs(featureSlugs, issueSlugs)

	if len(checks) != 1 || checks[0].Level != LevelPass {
		t.Errorf("expected single pass check, got: %+v", checks)
	}
}

func TestDuplicateSlugAcrossTypes(t *testing.T) {
	featureSlugs := map[string]bool{"auth": true}
	issueSlugs := map[string]bool{"auth": true}
	checks := checkDuplicateSlugs(featureSlugs, issueSlugs)

	if !hasCheckWith(checks, LevelWarn, "auth") {
		t.Errorf("expected warn for duplicate slug, got: %+v", checks)
	}
}

// --- Referential Integrity Tests ---

func TestRefsAllValid(t *testing.T) {
	dir := setupDoctorDir(t)
	writeFeature(t, dir, "auth", `---
title: Auth
status: draft
priority: medium
---
`)
	writeIssue(t, dir, "bug-1", `---
title: Bug
status: open
type: bug
feature: auth
---
`)
	paths := store.NewPaths(dir)
	featureSlugs := map[string]bool{"auth": true}
	checks := checkRefs(paths, featureSlugs)

	if len(checks) != 1 || checks[0].Level != LevelPass {
		t.Errorf("expected single pass check, got: %+v", checks)
	}
}

func TestRefsIssueBrokenFeatureRef(t *testing.T) {
	dir := setupDoctorDir(t)
	writeIssue(t, dir, "bug-1", `---
title: Bug
status: open
type: bug
feature: nonexistent
---
`)
	paths := store.NewPaths(dir)
	featureSlugs := map[string]bool{}
	checks := checkRefs(paths, featureSlugs)

	if !hasCheckWith(checks, LevelWarn, "non-existent feature 'nonexistent'") {
		t.Errorf("expected warn for broken feature ref, got: %+v", checks)
	}
}

func TestRefsRoadmapBrokenFeatureRef(t *testing.T) {
	dir := setupDoctorDir(t)
	writeFile(t, dir, "roadmap.md", `---
title: Roadmap
columns:
  - now
rows: []
cards:
  - id: abc123
    title: Test Card
    column: now
    row: ""
    order: 0
    featureSlug: nonexistent-feature
---
`)
	paths := store.NewPaths(dir)
	featureSlugs := map[string]bool{}
	checks := checkRefs(paths, featureSlugs)

	if !hasCheckWith(checks, LevelWarn, "non-existent feature 'nonexistent-feature'") {
		t.Errorf("expected warn for broken roadmap feature ref, got: %+v", checks)
	}
}

// --- Integration Test: Full Run ---

func TestRunHealthyDir(t *testing.T) {
	dir := setupDoctorDir(t)
	writeFeature(t, dir, "auth", `---
title: Auth
status: draft
priority: medium
created: "2025-01-01"
modified: "2025-01-01"
---
`)
	writeIssue(t, dir, "bug-1", `---
title: Bug One
status: open
type: bug
priority: high
---
`)
	writeWiki(t, dir, "overview", `---
title: Overview
---
Content.
`)

	paths := store.NewPaths(dir)
	result := Run(paths)

	if result.Failed > 0 {
		t.Errorf("expected no failures in healthy dir, got: %+v", result)
	}
	if result.Warnings > 0 {
		t.Errorf("expected no warnings in healthy dir, got: %+v", result)
	}
	if result.Passed == 0 {
		t.Error("expected at least one pass check")
	}
}

func TestRunUnhealthyDir(t *testing.T) {
	dir := setupDoctorDir(t)

	// Remove a required dir.
	os.RemoveAll(filepath.Join(dir, "wiki"))

	// Add a feature with invalid status.
	writeFeature(t, dir, "bad", `---
title: Bad Feature
status: banana
---
`)

	// Add an issue referencing a non-existent feature.
	writeIssue(t, dir, "orphan", `---
title: Orphan Issue
status: open
type: task
feature: ghost
---
`)

	paths := store.NewPaths(dir)
	result := Run(paths)

	if result.Failed == 0 {
		t.Error("expected at least one failure")
	}
	if result.Warnings == 0 {
		t.Error("expected at least one warning")
	}
}
