package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/spf13/pflag"
)

// executeCmd runs rootCmd with the given args and returns stdout output and any error.
// It resets global flag state after each call.
func executeCmd(t *testing.T, args ...string) (string, error) {
	t.Helper()

	buf := new(bytes.Buffer)
	rootCmd.SetOut(buf)
	rootCmd.SetErr(buf)
	rootCmd.SetArgs(args)

	err := rootCmd.Execute()
	output := buf.String()

	// Reset all global flags to defaults to avoid cross-test contamination.
	jsonOutput = false
	dataDir = ""
	logDir = ""

	// Features flags
	featStatus = nil
	featPriority = nil
	featAssignee = ""
	featTags = nil
	featSort = "order"
	featDir = "asc"
	featLimit = 50
	featPage = 1
	featCreatePriority = ""
	featCreateBody = ""
	featUpdateTitle = ""
	featUpdateStatus = ""
	featUpdatePriority = ""
	featUpdateBody = ""
	featUpdateTags = ""

	// Issues flags
	issueStatus = nil
	issueType = nil
	issuePriority = nil
	issueAssignee = ""
	issueFeature = ""
	issueLabels = nil
	issueSort = "order"
	issueDir = "asc"
	issueLimit = 50
	issuePage = 1
	issueCreateType = ""
	issueCreatePriority = ""
	issueCreateBody = ""
	issueCreateFeature = ""
	issueUpdateTitle = ""
	issueUpdateStatus = ""
	issueUpdateType = ""
	issueUpdatePriority = ""
	issueUpdateBody = ""
	issueUpdateFeature = ""
	issueUpdateLabels = ""

	// Init flags
	initForce = false

	// Reset cobra's Changed state on commands so cmd.Flags().Changed()
	// doesn't carry over between test runs.
	featuresUpdateCmd.Flags().VisitAll(func(f *pflag.Flag) { f.Changed = false })
	issuesUpdateCmd.Flags().VisitAll(func(f *pflag.Flag) { f.Changed = false })
	featuresListCmd.Flags().VisitAll(func(f *pflag.Flag) { f.Changed = false })
	issuesListCmd.Flags().VisitAll(func(f *pflag.Flag) { f.Changed = false })
	featuresCreateCmd.Flags().VisitAll(func(f *pflag.Flag) { f.Changed = false })
	issuesCreateCmd.Flags().VisitAll(func(f *pflag.Flag) { f.Changed = false })
	initCmd.Flags().VisitAll(func(f *pflag.Flag) { f.Changed = false })
	doctorCmd.Flags().VisitAll(func(f *pflag.Flag) { f.Changed = false })
	versionCmd.Flags().VisitAll(func(f *pflag.Flag) { f.Changed = false })

	return output, err
}

// setupTestDir creates a temporary folio data directory with the standard
// directory structure and optional fixture data. Returns the temp dir path.
func setupTestDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()

	dirs := []string{"features", "issues", "project-docs", "wiki", ".sessions"}
	for _, d := range dirs {
		if err := os.MkdirAll(filepath.Join(dir, d), 0755); err != nil {
			t.Fatalf("failed to create directory %s: %v", d, err)
		}
	}

	return dir
}

// writeFeature creates a feature markdown file in the test directory.
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

// writeIssue creates an issue markdown file in the test directory.
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

// writeProjectDoc creates a project doc markdown file in the test directory.
func writeProjectDoc(t *testing.T, dir, slug, content string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, "project-docs", slug+".md"), []byte(content), 0644); err != nil {
		t.Fatalf("failed to write project doc %s: %v", slug, err)
	}
}

// parseJSON decodes a JSON string into the given destination.
func parseJSON(t *testing.T, data string, dest interface{}) {
	t.Helper()
	if err := json.Unmarshal([]byte(data), dest); err != nil {
		t.Fatalf("failed to parse JSON: %v\nraw output: %s", err, data)
	}
}

// --- Docs Tests ---

func TestDocsListEmpty(t *testing.T) {
	dir := setupTestDir(t)
	out, err := executeCmd(t, "--data", dir, "docs", "list")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "No project documents found") {
		t.Errorf("expected empty message, got: %s", out)
	}
}

func TestDocsList(t *testing.T) {
	dir := setupTestDir(t)
	writeProjectDoc(t, dir, "api-spec", `---
title: API Specification
icon: book
order: 1
---
The API spec content.
`)
	writeProjectDoc(t, dir, "getting-started", `---
title: Getting Started
order: 0
---
How to get started.
`)

	out, err := executeCmd(t, "--data", dir, "docs", "list")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "api-spec") {
		t.Errorf("expected api-spec in output, got: %s", out)
	}
	if !strings.Contains(out, "getting-started") {
		t.Errorf("expected getting-started in output, got: %s", out)
	}
	if !strings.Contains(out, "API Specification") {
		t.Errorf("expected title in output, got: %s", out)
	}
}

func TestDocsListJSON(t *testing.T) {
	dir := setupTestDir(t)
	writeProjectDoc(t, dir, "readme", `---
title: README
order: 0
---
Read me content.
`)

	out, err := executeCmd(t, "--data", dir, "docs", "--json", "list")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var docs []map[string]interface{}
	parseJSON(t, out, &docs)
	if len(docs) != 1 {
		t.Fatalf("expected 1 doc, got %d", len(docs))
	}
	if docs[0]["slug"] != "readme" {
		t.Errorf("expected slug=readme, got %v", docs[0]["slug"])
	}
	if docs[0]["title"] != "README" {
		t.Errorf("expected title=README, got %v", docs[0]["title"])
	}
}

func TestDocsGet(t *testing.T) {
	dir := setupTestDir(t)
	writeProjectDoc(t, dir, "design", `---
title: Design System
icon: palette
---
Design system details here.
`)

	out, err := executeCmd(t, "--data", dir, "docs", "get", "design")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "Title: Design System") {
		t.Errorf("expected title line, got: %s", out)
	}
	if !strings.Contains(out, "Slug:  design") {
		t.Errorf("expected slug line, got: %s", out)
	}
	if !strings.Contains(out, "Icon:  palette") {
		t.Errorf("expected icon line, got: %s", out)
	}
	if !strings.Contains(out, "Design system details here.") {
		t.Errorf("expected body content, got: %s", out)
	}
}

func TestDocsGetJSON(t *testing.T) {
	dir := setupTestDir(t)
	writeProjectDoc(t, dir, "arch", `---
title: Architecture
---
Architecture overview.
`)

	out, err := executeCmd(t, "--data", dir, "docs", "--json", "get", "arch")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var doc map[string]interface{}
	parseJSON(t, out, &doc)
	if doc["slug"] != "arch" {
		t.Errorf("expected slug=arch, got %v", doc["slug"])
	}
	if doc["title"] != "Architecture" {
		t.Errorf("expected title=Architecture, got %v", doc["title"])
	}
}

func TestDocsGetNotFound(t *testing.T) {
	dir := setupTestDir(t)
	_, err := executeCmd(t, "--data", dir, "docs", "get", "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent doc")
	}
	if !strings.Contains(err.Error(), "document not found") {
		t.Errorf("expected 'document not found' error, got: %v", err)
	}
}

// --- Features Tests ---

func TestFeaturesListEmpty(t *testing.T) {
	dir := setupTestDir(t)
	out, err := executeCmd(t, "--data", dir, "features", "list")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "No features found") {
		t.Errorf("expected empty message, got: %s", out)
	}
}

func TestFeaturesList(t *testing.T) {
	dir := setupTestDir(t)
	writeFeature(t, dir, "auth", `---
title: Authentication
status: in-progress
priority: high
assignees:
  - Alice
points: 5
tags:
  - security
created: "2025-01-01"
modified: "2025-01-10"
order: 0
---
Auth feature body.
`)
	writeFeature(t, dir, "dashboard", `---
title: Dashboard
status: draft
priority: medium
created: "2025-01-02"
modified: "2025-01-05"
order: 1
---
Dashboard body.
`)

	out, err := executeCmd(t, "--data", dir, "features", "list")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "auth") {
		t.Errorf("expected auth slug, got: %s", out)
	}
	if !strings.Contains(out, "dashboard") {
		t.Errorf("expected dashboard slug, got: %s", out)
	}
	if !strings.Contains(out, "Authentication") {
		t.Errorf("expected Authentication title, got: %s", out)
	}
	if !strings.Contains(out, "in-progress") {
		t.Errorf("expected in-progress status, got: %s", out)
	}
}

func TestFeaturesListFilterByStatus(t *testing.T) {
	dir := setupTestDir(t)
	writeFeature(t, dir, "active", `---
title: Active Feature
status: in-progress
priority: high
created: "2025-01-01"
modified: "2025-01-01"
---
`)
	writeFeature(t, dir, "pending", `---
title: Pending Feature
status: draft
priority: low
created: "2025-01-01"
modified: "2025-01-01"
---
`)

	out, err := executeCmd(t, "--data", dir, "features", "list", "--status", "in-progress")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "active") {
		t.Errorf("expected active feature, got: %s", out)
	}
	if strings.Contains(out, "pending") {
		t.Errorf("should not contain pending feature, got: %s", out)
	}
}

func TestFeaturesListJSON(t *testing.T) {
	dir := setupTestDir(t)
	writeFeature(t, dir, "test-feat", `---
title: Test Feature
status: draft
priority: medium
created: "2025-01-01"
modified: "2025-01-01"
---
Body here.
`)

	out, err := executeCmd(t, "--data", dir, "features", "--json", "list")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var result map[string]interface{}
	parseJSON(t, out, &result)
	features, ok := result["features"].([]interface{})
	if !ok {
		t.Fatalf("expected features array, got: %v", result)
	}
	if len(features) != 1 {
		t.Fatalf("expected 1 feature, got %d", len(features))
	}
	feat := features[0].(map[string]interface{})
	if feat["slug"] != "test-feat" {
		t.Errorf("expected slug=test-feat, got %v", feat["slug"])
	}
}

func TestFeaturesGet(t *testing.T) {
	dir := setupTestDir(t)
	writeFeature(t, dir, "my-feature", `---
title: My Feature
status: ready
priority: high
assignees:
  - Bob
points: 8
tags:
  - backend
  - api
created: "2025-03-01"
modified: "2025-03-15"
---
Feature description here.
`)

	out, err := executeCmd(t, "--data", dir, "features", "get", "my-feature")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "Title:     My Feature") {
		t.Errorf("expected title, got: %s", out)
	}
	if !strings.Contains(out, "Status:    ready") {
		t.Errorf("expected status, got: %s", out)
	}
	if !strings.Contains(out, "Priority:  high") {
		t.Errorf("expected priority, got: %s", out)
	}
	if !strings.Contains(out, "Bob") {
		t.Errorf("expected assignee Bob, got: %s", out)
	}
	if !strings.Contains(out, "Feature description here.") {
		t.Errorf("expected body, got: %s", out)
	}
}

func TestFeaturesGetJSON(t *testing.T) {
	dir := setupTestDir(t)
	writeFeature(t, dir, "json-feat", `---
title: JSON Feature
status: done
priority: low
created: "2025-01-01"
modified: "2025-01-01"
---
Body text.
`)

	out, err := executeCmd(t, "--data", dir, "features", "--json", "get", "json-feat")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var feat map[string]interface{}
	parseJSON(t, out, &feat)
	if feat["slug"] != "json-feat" {
		t.Errorf("expected slug=json-feat, got %v", feat["slug"])
	}
	if feat["status"] != "done" {
		t.Errorf("expected status=done, got %v", feat["status"])
	}
}

func TestFeaturesGetNotFound(t *testing.T) {
	dir := setupTestDir(t)
	_, err := executeCmd(t, "--data", dir, "features", "get", "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent feature")
	}
	if !strings.Contains(err.Error(), "feature not found") {
		t.Errorf("expected 'feature not found' error, got: %v", err)
	}
}

func TestFeaturesCreate(t *testing.T) {
	dir := setupTestDir(t)
	out, err := executeCmd(t, "--data", dir, "features", "create", "New Feature")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "Created feature: New Feature") {
		t.Errorf("expected creation message, got: %s", out)
	}
	if !strings.Contains(out, "new-feature") {
		t.Errorf("expected slug in output, got: %s", out)
	}

	// Verify file was created.
	mdPath := filepath.Join(dir, "features", "new-feature", "FEATURE.md")
	if _, err := os.Stat(mdPath); err != nil {
		t.Errorf("expected feature file to exist at %s", mdPath)
	}
}

func TestFeaturesCreateWithFlags(t *testing.T) {
	dir := setupTestDir(t)
	out, err := executeCmd(t, "--data", dir, "features", "create", "Flagged Feature",
		"--priority", "high", "--body", "Some body text")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "Created feature: Flagged Feature") {
		t.Errorf("expected creation message, got: %s", out)
	}

	// Verify the feature was created with correct fields.
	getOut, err := executeCmd(t, "--data", dir, "features", "--json", "get", "flagged-feature")
	if err != nil {
		t.Fatalf("unexpected error getting created feature: %v", err)
	}
	var feat map[string]interface{}
	parseJSON(t, getOut, &feat)
	if feat["priority"] != "high" {
		t.Errorf("expected priority=high, got %v", feat["priority"])
	}
	if !strings.Contains(feat["body"].(string), "Some body text") {
		t.Errorf("expected body to contain 'Some body text', got %v", feat["body"])
	}
}

func TestFeaturesCreateJSON(t *testing.T) {
	dir := setupTestDir(t)
	out, err := executeCmd(t, "--data", dir, "features", "--json", "create", "JSON Created Feature")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var feat map[string]interface{}
	parseJSON(t, out, &feat)
	if feat["slug"] != "json-created-feature" {
		t.Errorf("expected slug=json-created-feature, got %v", feat["slug"])
	}
	if feat["status"] != "draft" {
		t.Errorf("expected status=draft, got %v", feat["status"])
	}
}

func TestFeaturesUpdate(t *testing.T) {
	dir := setupTestDir(t)
	writeFeature(t, dir, "update-me", `---
title: Update Me
status: draft
priority: low
created: "2025-01-01"
modified: "2025-01-01"
---
Original body.
`)

	out, err := executeCmd(t, "--data", dir, "features", "update", "update-me",
		"--status", "in-progress", "--priority", "high")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "Updated feature: Update Me") {
		t.Errorf("expected update message, got: %s", out)
	}

	// Verify the changes.
	getOut, err := executeCmd(t, "--data", dir, "features", "--json", "get", "update-me")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	var feat map[string]interface{}
	parseJSON(t, getOut, &feat)
	if feat["status"] != "in-progress" {
		t.Errorf("expected status=in-progress, got %v", feat["status"])
	}
	if feat["priority"] != "high" {
		t.Errorf("expected priority=high, got %v", feat["priority"])
	}
}

func TestFeaturesUpdateJSON(t *testing.T) {
	dir := setupTestDir(t)
	writeFeature(t, dir, "update-json", `---
title: Update JSON
status: draft
priority: low
created: "2025-01-01"
modified: "2025-01-01"
---
Body.
`)

	out, err := executeCmd(t, "--data", dir, "features", "--json", "update", "update-json",
		"--title", "Updated Title")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var feat map[string]interface{}
	parseJSON(t, out, &feat)
	if feat["title"] != "Updated Title" {
		t.Errorf("expected title=Updated Title, got %v", feat["title"])
	}
}

func TestFeaturesUpdateNoFlags(t *testing.T) {
	dir := setupTestDir(t)
	writeFeature(t, dir, "no-flags", `---
title: No Flags
status: draft
priority: low
created: "2025-01-01"
modified: "2025-01-01"
---
`)

	_, err := executeCmd(t, "--data", dir, "features", "update", "no-flags")
	if err == nil {
		t.Fatal("expected error when no update flags provided")
	}
	if !strings.Contains(err.Error(), "no update flags provided") {
		t.Errorf("expected 'no update flags provided' error, got: %v", err)
	}
}

func TestFeaturesUpdateNotFound(t *testing.T) {
	dir := setupTestDir(t)
	_, err := executeCmd(t, "--data", dir, "features", "update", "nonexistent", "--title", "X")
	if err == nil {
		t.Fatal("expected error for nonexistent feature")
	}
	if !strings.Contains(err.Error(), "feature not found") {
		t.Errorf("expected 'feature not found' error, got: %v", err)
	}
}

func TestFeaturesDelete(t *testing.T) {
	dir := setupTestDir(t)
	writeFeature(t, dir, "delete-me", `---
title: Delete Me
status: draft
priority: low
created: "2025-01-01"
modified: "2025-01-01"
---
`)

	out, err := executeCmd(t, "--data", dir, "features", "delete", "delete-me")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "Deleted feature: delete-me") {
		t.Errorf("expected deletion message, got: %s", out)
	}

	// Verify file was removed.
	featDir := filepath.Join(dir, "features", "delete-me")
	if _, err := os.Stat(featDir); !os.IsNotExist(err) {
		t.Errorf("expected feature directory to be removed")
	}
}

func TestFeaturesDeleteJSON(t *testing.T) {
	dir := setupTestDir(t)
	writeFeature(t, dir, "delete-json", `---
title: Delete JSON
status: draft
priority: low
created: "2025-01-01"
modified: "2025-01-01"
---
`)

	out, err := executeCmd(t, "--data", dir, "features", "--json", "delete", "delete-json")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var result map[string]interface{}
	parseJSON(t, out, &result)
	if result["deleted"] != "delete-json" {
		t.Errorf("expected deleted=delete-json, got %v", result["deleted"])
	}
}

func TestFeaturesDeleteNotFound(t *testing.T) {
	dir := setupTestDir(t)
	_, err := executeCmd(t, "--data", dir, "features", "delete", "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent feature")
	}
	if !strings.Contains(err.Error(), "feature not found") {
		t.Errorf("expected 'feature not found' error, got: %v", err)
	}
}

// --- Issues Tests ---

func TestIssuesListEmpty(t *testing.T) {
	dir := setupTestDir(t)
	out, err := executeCmd(t, "--data", dir, "issues", "list")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "No issues found") {
		t.Errorf("expected empty message, got: %s", out)
	}
}

func TestIssuesList(t *testing.T) {
	dir := setupTestDir(t)
	writeIssue(t, dir, "login-bug", `---
title: Login Bug
status: open
type: bug
priority: critical
assignees:
  - Charlie
created: "2025-02-01"
modified: "2025-02-10"
order: 0
---
Login fails on slow connections.
`)
	writeIssue(t, dir, "add-tests", `---
title: Add Unit Tests
status: in-progress
type: task
priority: medium
created: "2025-02-05"
modified: "2025-02-08"
order: 1
---
We need more tests.
`)

	out, err := executeCmd(t, "--data", dir, "issues", "list")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "login-bug") {
		t.Errorf("expected login-bug slug, got: %s", out)
	}
	if !strings.Contains(out, "add-tests") {
		t.Errorf("expected add-tests slug, got: %s", out)
	}
	if !strings.Contains(out, "Login Bug") {
		t.Errorf("expected Login Bug title, got: %s", out)
	}
	if !strings.Contains(out, "bug") {
		t.Errorf("expected bug type, got: %s", out)
	}
}

func TestIssuesListFilterByStatus(t *testing.T) {
	dir := setupTestDir(t)
	writeIssue(t, dir, "open-issue", `---
title: Open Issue
status: open
type: task
priority: medium
created: "2025-01-01"
modified: "2025-01-01"
---
`)
	writeIssue(t, dir, "closed-issue", `---
title: Closed Issue
status: closed
type: task
priority: low
created: "2025-01-01"
modified: "2025-01-01"
---
`)

	out, err := executeCmd(t, "--data", dir, "issues", "list", "--status", "open")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "open-issue") {
		t.Errorf("expected open-issue, got: %s", out)
	}
	if strings.Contains(out, "closed-issue") {
		t.Errorf("should not contain closed-issue, got: %s", out)
	}
}

func TestIssuesListFilterByType(t *testing.T) {
	dir := setupTestDir(t)
	writeIssue(t, dir, "bug-issue", `---
title: A Bug
status: open
type: bug
priority: high
created: "2025-01-01"
modified: "2025-01-01"
---
`)
	writeIssue(t, dir, "task-issue", `---
title: A Task
status: open
type: task
priority: medium
created: "2025-01-01"
modified: "2025-01-01"
---
`)

	out, err := executeCmd(t, "--data", dir, "issues", "list", "--type", "bug")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "bug-issue") {
		t.Errorf("expected bug-issue, got: %s", out)
	}
	if strings.Contains(out, "task-issue") {
		t.Errorf("should not contain task-issue, got: %s", out)
	}
}

func TestIssuesListJSON(t *testing.T) {
	dir := setupTestDir(t)
	writeIssue(t, dir, "json-issue", `---
title: JSON Issue
status: open
type: task
priority: medium
created: "2025-01-01"
modified: "2025-01-01"
---
Body.
`)

	out, err := executeCmd(t, "--data", dir, "issues", "--json", "list")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var result map[string]interface{}
	parseJSON(t, out, &result)
	issues, ok := result["issues"].([]interface{})
	if !ok {
		t.Fatalf("expected issues array, got: %v", result)
	}
	if len(issues) != 1 {
		t.Fatalf("expected 1 issue, got %d", len(issues))
	}
	issue := issues[0].(map[string]interface{})
	if issue["slug"] != "json-issue" {
		t.Errorf("expected slug=json-issue, got %v", issue["slug"])
	}
}

func TestIssuesGet(t *testing.T) {
	dir := setupTestDir(t)
	writeIssue(t, dir, "my-issue", `---
title: My Issue
status: open
type: bug
priority: high
assignees:
  - Dave
labels:
  - frontend
  - urgent
feature: auth-feature
created: "2025-04-01"
modified: "2025-04-05"
---
Issue description here.
`)

	out, err := executeCmd(t, "--data", dir, "issues", "get", "my-issue")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "Title:     My Issue") {
		t.Errorf("expected title, got: %s", out)
	}
	if !strings.Contains(out, "Status:    open") {
		t.Errorf("expected status, got: %s", out)
	}
	if !strings.Contains(out, "Type:      bug") {
		t.Errorf("expected type, got: %s", out)
	}
	if !strings.Contains(out, "Dave") {
		t.Errorf("expected assignee Dave, got: %s", out)
	}
	if !strings.Contains(out, "Feature:   auth-feature") {
		t.Errorf("expected feature link, got: %s", out)
	}
	if !strings.Contains(out, "Issue description here.") {
		t.Errorf("expected body, got: %s", out)
	}
}

func TestIssuesGetJSON(t *testing.T) {
	dir := setupTestDir(t)
	writeIssue(t, dir, "json-get-issue", `---
title: JSON Get Issue
status: closed
type: improvement
priority: low
created: "2025-01-01"
modified: "2025-01-01"
---
Body.
`)

	out, err := executeCmd(t, "--data", dir, "issues", "--json", "get", "json-get-issue")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var issue map[string]interface{}
	parseJSON(t, out, &issue)
	if issue["slug"] != "json-get-issue" {
		t.Errorf("expected slug=json-get-issue, got %v", issue["slug"])
	}
	if issue["type"] != "improvement" {
		t.Errorf("expected type=improvement, got %v", issue["type"])
	}
}

func TestIssuesGetNotFound(t *testing.T) {
	dir := setupTestDir(t)
	_, err := executeCmd(t, "--data", dir, "issues", "get", "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent issue")
	}
	if !strings.Contains(err.Error(), "issue not found") {
		t.Errorf("expected 'issue not found' error, got: %v", err)
	}
}

func TestIssuesCreate(t *testing.T) {
	dir := setupTestDir(t)
	out, err := executeCmd(t, "--data", dir, "issues", "create", "New Issue")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "Created issue: New Issue") {
		t.Errorf("expected creation message, got: %s", out)
	}
	if !strings.Contains(out, "new-issue") {
		t.Errorf("expected slug in output, got: %s", out)
	}

	// Verify file was created.
	mdPath := filepath.Join(dir, "issues", "new-issue", "ISSUE.md")
	if _, err := os.Stat(mdPath); err != nil {
		t.Errorf("expected issue file to exist at %s", mdPath)
	}
}

func TestIssuesCreateWithFlags(t *testing.T) {
	dir := setupTestDir(t)
	out, err := executeCmd(t, "--data", dir, "issues", "create", "Bug Report",
		"--type", "bug", "--priority", "critical", "--body", "Steps to reproduce",
		"--feature", "some-feature")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "Created issue: Bug Report") {
		t.Errorf("expected creation message, got: %s", out)
	}

	// Verify the issue was created with correct fields.
	getOut, err := executeCmd(t, "--data", dir, "issues", "--json", "get", "bug-report")
	if err != nil {
		t.Fatalf("unexpected error getting created issue: %v", err)
	}
	var issue map[string]interface{}
	parseJSON(t, getOut, &issue)
	if issue["type"] != "bug" {
		t.Errorf("expected type=bug, got %v", issue["type"])
	}
	if issue["priority"] != "critical" {
		t.Errorf("expected priority=critical, got %v", issue["priority"])
	}
	if issue["feature"] != "some-feature" {
		t.Errorf("expected feature=some-feature, got %v", issue["feature"])
	}
}

func TestIssuesCreateJSON(t *testing.T) {
	dir := setupTestDir(t)
	out, err := executeCmd(t, "--data", dir, "issues", "--json", "create", "JSON Created Issue")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var issue map[string]interface{}
	parseJSON(t, out, &issue)
	if issue["slug"] != "json-created-issue" {
		t.Errorf("expected slug=json-created-issue, got %v", issue["slug"])
	}
	if issue["status"] != "open" {
		t.Errorf("expected status=open, got %v", issue["status"])
	}
}

func TestIssuesUpdate(t *testing.T) {
	dir := setupTestDir(t)
	writeIssue(t, dir, "update-issue", `---
title: Update Issue
status: open
type: task
priority: low
created: "2025-01-01"
modified: "2025-01-01"
---
Original body.
`)

	out, err := executeCmd(t, "--data", dir, "issues", "update", "update-issue",
		"--status", "closed", "--priority", "high", "--type", "bug")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "Updated issue: Update Issue") {
		t.Errorf("expected update message, got: %s", out)
	}

	// Verify the changes.
	getOut, err := executeCmd(t, "--data", dir, "issues", "--json", "get", "update-issue")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	var issue map[string]interface{}
	parseJSON(t, getOut, &issue)
	if issue["status"] != "closed" {
		t.Errorf("expected status=closed, got %v", issue["status"])
	}
	if issue["priority"] != "high" {
		t.Errorf("expected priority=high, got %v", issue["priority"])
	}
	if issue["type"] != "bug" {
		t.Errorf("expected type=bug, got %v", issue["type"])
	}
}

func TestIssuesUpdateJSON(t *testing.T) {
	dir := setupTestDir(t)
	writeIssue(t, dir, "update-json-issue", `---
title: Update JSON Issue
status: open
type: task
priority: low
created: "2025-01-01"
modified: "2025-01-01"
---
Body.
`)

	out, err := executeCmd(t, "--data", dir, "issues", "--json", "update", "update-json-issue",
		"--title", "Updated Title")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var issue map[string]interface{}
	parseJSON(t, out, &issue)
	if issue["title"] != "Updated Title" {
		t.Errorf("expected title=Updated Title, got %v", issue["title"])
	}
}

func TestIssuesUpdateNoFlags(t *testing.T) {
	dir := setupTestDir(t)
	writeIssue(t, dir, "no-flags-issue", `---
title: No Flags Issue
status: open
type: task
priority: low
created: "2025-01-01"
modified: "2025-01-01"
---
`)

	_, err := executeCmd(t, "--data", dir, "issues", "update", "no-flags-issue")
	if err == nil {
		t.Fatal("expected error when no update flags provided")
	}
	if !strings.Contains(err.Error(), "no update flags provided") {
		t.Errorf("expected 'no update flags provided' error, got: %v", err)
	}
}

func TestIssuesUpdateNotFound(t *testing.T) {
	dir := setupTestDir(t)
	_, err := executeCmd(t, "--data", dir, "issues", "update", "nonexistent", "--title", "X")
	if err == nil {
		t.Fatal("expected error for nonexistent issue")
	}
	if !strings.Contains(err.Error(), "issue not found") {
		t.Errorf("expected 'issue not found' error, got: %v", err)
	}
}

func TestIssuesDelete(t *testing.T) {
	dir := setupTestDir(t)
	writeIssue(t, dir, "delete-issue", `---
title: Delete Issue
status: open
type: task
priority: low
created: "2025-01-01"
modified: "2025-01-01"
---
`)

	out, err := executeCmd(t, "--data", dir, "issues", "delete", "delete-issue")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "Deleted issue: delete-issue") {
		t.Errorf("expected deletion message, got: %s", out)
	}

	// Verify file was removed.
	issueDir := filepath.Join(dir, "issues", "delete-issue")
	if _, err := os.Stat(issueDir); !os.IsNotExist(err) {
		t.Errorf("expected issue directory to be removed")
	}
}

func TestIssuesDeleteJSON(t *testing.T) {
	dir := setupTestDir(t)
	writeIssue(t, dir, "delete-json-issue", `---
title: Delete JSON Issue
status: open
type: task
priority: low
created: "2025-01-01"
modified: "2025-01-01"
---
`)

	out, err := executeCmd(t, "--data", dir, "issues", "--json", "delete", "delete-json-issue")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var result map[string]interface{}
	parseJSON(t, out, &result)
	if result["deleted"] != "delete-json-issue" {
		t.Errorf("expected deleted=delete-json-issue, got %v", result["deleted"])
	}
}

func TestIssuesDeleteNotFound(t *testing.T) {
	dir := setupTestDir(t)
	_, err := executeCmd(t, "--data", dir, "issues", "delete", "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent issue")
	}
	if !strings.Contains(err.Error(), "issue not found") {
		t.Errorf("expected 'issue not found' error, got: %v", err)
	}
}

// --- Output Helpers Tests ---

func TestTruncate(t *testing.T) {
	tests := []struct {
		input  string
		maxLen int
		want   string
	}{
		{"short", 10, "short"},
		{"exactly 10", 10, "exactly 10"},
		{"this is a longer string", 10, "this is..."},
		{"multi\nline", 20, "multi line"},
		{"", 5, ""},
	}
	for _, tt := range tests {
		got := truncate(tt.input, tt.maxLen)
		if got != tt.want {
			t.Errorf("truncate(%q, %d) = %q, want %q", tt.input, tt.maxLen, got, tt.want)
		}
	}
}

func TestPtrStr(t *testing.T) {
	val := "hello"
	if got := ptrStr(&val, "default"); got != "hello" {
		t.Errorf("ptrStr(&hello) = %q, want hello", got)
	}
	if got := ptrStr(nil, "default"); got != "default" {
		t.Errorf("ptrStr(nil) = %q, want default", got)
	}
}

func TestPtrFloat(t *testing.T) {
	val := 42.0
	if got := ptrFloat(&val, "-"); got != "42" {
		t.Errorf("ptrFloat(&42) = %q, want 42", got)
	}
	if got := ptrFloat(nil, "-"); got != "-" {
		t.Errorf("ptrFloat(nil) = %q, want -", got)
	}
}

// --- Error Case Tests ---

func TestMissingDataDir(t *testing.T) {
	_, err := executeCmd(t, "--data", "/nonexistent/path", "docs", "list")
	if err == nil {
		t.Fatal("expected error for missing data directory")
	}
	if !strings.Contains(err.Error(), "data directory does not exist") {
		t.Errorf("expected data dir error, got: %v", err)
	}
}

func TestFeaturesAlias(t *testing.T) {
	dir := setupTestDir(t)
	out, err := executeCmd(t, "--data", dir, "feature", "list")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "No features found") {
		t.Errorf("expected alias to work, got: %s", out)
	}
}

func TestIssuesAlias(t *testing.T) {
	dir := setupTestDir(t)
	out, err := executeCmd(t, "--data", dir, "issue", "list")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "No issues found") {
		t.Errorf("expected alias to work, got: %s", out)
	}
}

// --- Init Tests ---

func TestInit(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "folio")
	out, err := executeCmd(t, "--data", dir, "init")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(out, "Initialized folio/ directory at") {
		t.Errorf("expected init message, got: %s", out)
	}
	if !strings.Contains(out, "Created folio.yaml") {
		t.Errorf("expected folio.yaml in output, got: %s", out)
	}
	if !strings.Contains(out, "Created team.md") {
		t.Errorf("expected team.md in output, got: %s", out)
	}

	// Verify directories were created.
	expectedDirs := []string{"features", "issues", "wiki", "sprints", "project-docs", "reviews", ".sessions"}
	for _, d := range expectedDirs {
		path := filepath.Join(dir, d)
		info, err := os.Stat(path)
		if err != nil {
			t.Errorf("expected directory %s to exist: %v", d, err)
			continue
		}
		if !info.IsDir() {
			t.Errorf("expected %s to be a directory", d)
		}
	}

	// Verify files were created.
	expectedFiles := []string{
		"folio.yaml",
		"team.md",
		".gitignore",
		"roadmap.md",
		filepath.Join("project-docs", "project-brief.md"),
		filepath.Join("features", "backlog.md"),
		filepath.Join("reviews", "architecture", "REVIEW.md"),
	}
	for _, f := range expectedFiles {
		path := filepath.Join(dir, f)
		if _, err := os.Stat(path); err != nil {
			t.Errorf("expected file %s to exist: %v", f, err)
		}
	}
}

func TestInitFolioYamlContent(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "folio")
	_, err := executeCmd(t, "--data", dir, "init")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	data, err := os.ReadFile(filepath.Join(dir, "folio.yaml"))
	if err != nil {
		t.Fatalf("failed to read folio.yaml: %v", err)
	}
	content := string(data)
	if !strings.Contains(content, "project:") {
		t.Errorf("expected project key in folio.yaml, got: %s", content)
	}
	if !strings.Contains(content, "workflow:") {
		t.Errorf("expected workflow key in folio.yaml, got: %s", content)
	}
	if !strings.Contains(content, "draft") {
		t.Errorf("expected default workflow state in folio.yaml, got: %s", content)
	}
}

func TestInitGitignoreContent(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "folio")
	_, err := executeCmd(t, "--data", dir, "init")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	data, err := os.ReadFile(filepath.Join(dir, ".gitignore"))
	if err != nil {
		t.Fatalf("failed to read .gitignore: %v", err)
	}
	content := string(data)
	if !strings.Contains(content, ".sessions/") {
		t.Errorf("expected .sessions/ in .gitignore, got: %s", content)
	}
}

func TestInitJSON(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "folio")
	out, err := executeCmd(t, "--data", dir, "init", "--json")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var result map[string]interface{}
	parseJSON(t, out, &result)

	if result["template"] != "built-in" {
		t.Errorf("expected template=built-in, got %v", result["template"])
	}

	path, ok := result["path"].(string)
	if !ok || path == "" {
		t.Errorf("expected non-empty path, got %v", result["path"])
	}

	files, ok := result["files_created"].([]interface{})
	if !ok {
		t.Fatalf("expected files_created array, got %v", result["files_created"])
	}
	if len(files) == 0 {
		t.Error("expected at least one file in files_created")
	}

	// Verify expected files are listed.
	fileNames := make([]string, len(files))
	for i, f := range files {
		fileNames[i] = f.(string)
	}
	expectedFiles := []string{"folio.yaml", "team.md", ".gitignore"}
	for _, ef := range expectedFiles {
		found := false
		for _, fn := range fileNames {
			if fn == ef {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("expected %s in files_created, got: %v", ef, fileNames)
		}
	}
}

func TestInitAlreadyExists(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "folio")
	// Create the directory first.
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatalf("failed to create dir: %v", err)
	}

	_, err := executeCmd(t, "--data", dir, "init")
	if err == nil {
		t.Fatal("expected error when directory already exists")
	}
	if !strings.Contains(err.Error(), "directory already exists") {
		t.Errorf("expected 'directory already exists' error, got: %v", err)
	}
}

func TestInitForce(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "folio")
	// Create the directory with a dummy file.
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatalf("failed to create dir: %v", err)
	}
	dummyFile := filepath.Join(dir, "old-file.txt")
	if err := os.WriteFile(dummyFile, []byte("old content"), 0644); err != nil {
		t.Fatalf("failed to write dummy file: %v", err)
	}

	out, err := executeCmd(t, "--data", dir, "init", "--force")
	if err != nil {
		t.Fatalf("unexpected error with --force: %v", err)
	}
	if !strings.Contains(out, "Initialized folio/ directory at") {
		t.Errorf("expected init message, got: %s", out)
	}

	// Old file should be gone.
	if _, err := os.Stat(dummyFile); !os.IsNotExist(err) {
		t.Error("expected old-file.txt to be removed after --force init")
	}

	// New files should exist.
	if _, err := os.Stat(filepath.Join(dir, "folio.yaml")); err != nil {
		t.Error("expected folio.yaml to exist after --force init")
	}
}

func TestInitForceJSON(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "folio")
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatalf("failed to create dir: %v", err)
	}

	out, err := executeCmd(t, "--data", dir, "init", "--force", "--json")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var result map[string]interface{}
	parseJSON(t, out, &result)
	if result["template"] != "built-in" {
		t.Errorf("expected template=built-in, got %v", result["template"])
	}
}

func TestInitCreatesUsableDataDir(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "folio")

	// Init the directory.
	_, err := executeCmd(t, "--data", dir, "init")
	if err != nil {
		t.Fatalf("init failed: %v", err)
	}

	// Use the initialized directory with other commands.
	out, err := executeCmd(t, "--data", dir, "features", "list")
	if err != nil {
		t.Fatalf("features list failed after init: %v", err)
	}
	if !strings.Contains(out, "No features found") {
		t.Errorf("expected empty features list, got: %s", out)
	}

	out, err = executeCmd(t, "--data", dir, "issues", "list")
	if err != nil {
		t.Fatalf("issues list failed after init: %v", err)
	}
	if !strings.Contains(out, "No issues found") {
		t.Errorf("expected empty issues list, got: %s", out)
	}

	out, err = executeCmd(t, "--data", dir, "docs", "list")
	if err != nil {
		t.Fatalf("docs list failed after init: %v", err)
	}
	if !strings.Contains(out, "project-brief") {
		t.Errorf("expected project-brief in docs list, got: %s", out)
	}
}

func TestInitThenCreateFeature(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "folio")

	_, err := executeCmd(t, "--data", dir, "init")
	if err != nil {
		t.Fatalf("init failed: %v", err)
	}

	// Create a feature in the initialized directory.
	out, err := executeCmd(t, "--data", dir, "features", "create", "My First Feature")
	if err != nil {
		t.Fatalf("feature create failed: %v", err)
	}
	if !strings.Contains(out, "Created feature: My First Feature") {
		t.Errorf("expected creation message, got: %s", out)
	}

	// Verify it shows up in the list.
	out, err = executeCmd(t, "--data", dir, "features", "list")
	if err != nil {
		t.Fatalf("features list failed: %v", err)
	}
	if !strings.Contains(out, "my-first-feature") {
		t.Errorf("expected feature in list, got: %s", out)
	}
}

// --- Doctor Tests ---

// setupDoctorDir creates a fully valid folio data directory for doctor tests.
func setupDoctorDir(t *testing.T) string {
	t.Helper()
	dir := setupTestDir(t)

	// Add the extra directories doctor expects.
	for _, d := range []string{"sprints"} {
		if err := os.MkdirAll(filepath.Join(dir, d), 0755); err != nil {
			t.Fatalf("failed to create directory %s: %v", d, err)
		}
	}

	// Write valid folio.yaml.
	if err := os.WriteFile(filepath.Join(dir, "folio.yaml"), []byte(`project: test-project
version: "0.1.0"
workflow:
  states: [draft, ready, in-progress, done]
  default: draft
`), 0644); err != nil {
		t.Fatalf("failed to write folio.yaml: %v", err)
	}

	// Write valid team.md.
	if err := os.WriteFile(filepath.Join(dir, "team.md"), []byte(`---
members:
  - name: Alice
    role: Developer
---
`), 0644); err != nil {
		t.Fatalf("failed to write team.md: %v", err)
	}

	// Write valid roadmap.md.
	if err := os.WriteFile(filepath.Join(dir, "roadmap.md"), []byte(`---
title: Roadmap
columns:
  - now
  - next
  - later
rows: []
cards: []
---
`), 0644); err != nil {
		t.Fatalf("failed to write roadmap.md: %v", err)
	}

	return dir
}

func TestDoctorHealthy(t *testing.T) {
	dir := setupDoctorDir(t)
	writeFeature(t, dir, "auth", `---
title: Authentication
status: draft
priority: medium
created: "2025-01-01"
modified: "2025-01-01"
---
Body.
`)

	out, err := executeCmd(t, "--data", dir, "doctor")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "Folio Doctor") {
		t.Errorf("expected header, got: %s", out)
	}
	if !strings.Contains(out, "PASS") {
		t.Errorf("expected at least one PASS, got: %s", out)
	}
	if strings.Contains(out, "FAIL") {
		t.Errorf("expected no FAIL in healthy dir, got: %s", out)
	}
	if !strings.Contains(out, "0 failed") {
		t.Errorf("expected '0 failed' in summary, got: %s", out)
	}
}

func TestDoctorHealthyJSON(t *testing.T) {
	dir := setupDoctorDir(t)

	out, err := executeCmd(t, "--data", dir, "doctor", "--json")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var result map[string]interface{}
	parseJSON(t, out, &result)

	if result["failed"] != float64(0) {
		t.Errorf("expected 0 failures, got %v", result["failed"])
	}

	checks, ok := result["checks"].([]interface{})
	if !ok {
		t.Fatalf("expected checks array, got: %v", result["checks"])
	}
	if len(checks) == 0 {
		t.Error("expected at least one check")
	}

	// All checks should be pass level.
	for _, c := range checks {
		check := c.(map[string]interface{})
		if check["level"] != "pass" {
			t.Errorf("expected all pass checks, got: %v", check)
		}
	}
}

func TestDoctorWithFailures(t *testing.T) {
	dir := setupDoctorDir(t)

	// Remove a required directory.
	os.RemoveAll(filepath.Join(dir, "wiki"))

	_, err := executeCmd(t, "--data", dir, "doctor")
	if err == nil {
		t.Fatal("expected error when health checks fail")
	}
	if !strings.Contains(err.Error(), "health check(s) failed") {
		t.Errorf("expected 'health check(s) failed' error, got: %v", err)
	}
}

func TestDoctorWithWarnings(t *testing.T) {
	dir := setupDoctorDir(t)
	writeFeature(t, dir, "bad-status", `---
title: Bad Feature
status: banana
priority: medium
---
`)

	out, err := executeCmd(t, "--data", dir, "doctor")
	if err != nil {
		t.Fatalf("unexpected error (warnings should not cause failure): %v", err)
	}
	if !strings.Contains(out, "WARN") {
		t.Errorf("expected WARN in output, got: %s", out)
	}
	if !strings.Contains(out, "banana") {
		t.Errorf("expected invalid status 'banana' mentioned, got: %s", out)
	}
}

func TestDoctorMissingDataDir(t *testing.T) {
	_, err := executeCmd(t, "--data", "/nonexistent/path", "doctor")
	if err == nil {
		t.Fatal("expected error for missing data directory")
	}
	if !strings.Contains(err.Error(), "data directory does not exist") {
		t.Errorf("expected data dir error, got: %v", err)
	}
}

func TestDoctorWithBrokenRefs(t *testing.T) {
	dir := setupDoctorDir(t)
	writeIssue(t, dir, "orphan-issue", `---
title: Orphan Issue
status: open
type: task
feature: nonexistent-feature
---
`)

	out, err := executeCmd(t, "--data", dir, "doctor")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "WARN") {
		t.Errorf("expected WARN for broken reference, got: %s", out)
	}
	if !strings.Contains(out, "nonexistent-feature") {
		t.Errorf("expected broken feature reference mentioned, got: %s", out)
	}
}

func TestDoctorInitThenDoctor(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "folio")

	// Init a new directory.
	_, err := executeCmd(t, "--data", dir, "init")
	if err != nil {
		t.Fatalf("init failed: %v", err)
	}

	// Doctor should pass on a freshly initialized directory.
	out, err := executeCmd(t, "--data", dir, "doctor")
	if err != nil {
		t.Fatalf("doctor failed on init'd dir: %v", err)
	}
	if !strings.Contains(out, "0 failed") {
		t.Errorf("expected '0 failed' on fresh init, got: %s", out)
	}
}

// --- Version Tests ---

func TestVersion(t *testing.T) {
	out, err := executeCmd(t, "version")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "folio") {
		t.Errorf("expected 'folio' in output, got: %s", out)
	}
	if !strings.Contains(out, "commit:") {
		t.Errorf("expected 'commit:' in output, got: %s", out)
	}
	if !strings.Contains(out, "built:") {
		t.Errorf("expected 'built:' in output, got: %s", out)
	}
	if !strings.Contains(out, "go:") {
		t.Errorf("expected 'go:' in output, got: %s", out)
	}
}

func TestVersionJSON(t *testing.T) {
	out, err := executeCmd(t, "version", "--json")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var result map[string]interface{}
	parseJSON(t, out, &result)

	if _, ok := result["version"]; !ok {
		t.Error("expected 'version' key in JSON output")
	}
	if _, ok := result["commit"]; !ok {
		t.Error("expected 'commit' key in JSON output")
	}
	if _, ok := result["date"]; !ok {
		t.Error("expected 'date' key in JSON output")
	}
	if _, ok := result["go_version"]; !ok {
		t.Error("expected 'go_version' key in JSON output")
	}
}
