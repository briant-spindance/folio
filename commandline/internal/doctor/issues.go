package doctor

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/briant-spindance/folio/internal/frontmatter"
	"github.com/briant-spindance/folio/internal/model"
	"github.com/briant-spindance/folio/internal/store"
)

// collectIssueSlugs returns a set of all issue directory names.
func collectIssueSlugs(paths *store.Paths) map[string]bool {
	slugs := make(map[string]bool)
	entries, err := os.ReadDir(paths.Issues)
	if err != nil {
		return slugs
	}
	for _, entry := range entries {
		if entry.IsDir() && !strings.HasPrefix(entry.Name(), ".") {
			slugs[entry.Name()] = true
		}
	}
	return slugs
}

// checkIssues validates all issue frontmatter.
func checkIssues(paths *store.Paths) []Check {
	entries, err := os.ReadDir(paths.Issues)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return []Check{fail(fmt.Sprintf("Cannot read issues directory: %v", err))}
	}

	var checks []Check
	count := 0

	for _, entry := range entries {
		if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}
		slug := entry.Name()
		mdPath := filepath.Join(paths.Issues, slug, "ISSUE.md")

		data, err := os.ReadFile(mdPath)
		if os.IsNotExist(err) {
			checks = append(checks, fail(fmt.Sprintf("Issue '%s': missing ISSUE.md", slug)))
			continue
		}
		if err != nil {
			checks = append(checks, fail(fmt.Sprintf("Issue '%s': cannot read ISSUE.md", slug)))
			continue
		}

		doc, err := frontmatter.Parse(data)
		if err != nil {
			checks = append(checks, fail(fmt.Sprintf("Issue '%s': invalid frontmatter", slug)))
			continue
		}

		count++
		checks = append(checks, validateIssueFrontmatter(slug, doc.Data)...)
	}

	hasProblems := false
	for _, c := range checks {
		if c.Level != LevelPass {
			hasProblems = true
			break
		}
	}

	if !hasProblems {
		if count == 0 {
			return []Check{pass("No issues to check")}
		}
		return []Check{pass(fmt.Sprintf("All %d issues have valid frontmatter", count))}
	}

	return checks
}

// validateIssueFrontmatter checks individual issue field validity.
func validateIssueFrontmatter(slug string, data map[string]interface{}) []Check {
	var checks []Check

	title := frontmatter.GetString(data, "title")
	if title == "" {
		checks = append(checks, warn(fmt.Sprintf("Issue '%s': missing title", slug)))
	}

	status := frontmatter.GetString(data, "status")
	if status != "" && !model.ValidIssueStatuses[model.IssueStatus(status)] {
		checks = append(checks, warn(fmt.Sprintf("Issue '%s': invalid status '%s'", slug, status)))
	}

	issueType := frontmatter.GetString(data, "type")
	if issueType != "" && !model.ValidIssueTypes[model.IssueType(issueType)] {
		checks = append(checks, warn(fmt.Sprintf("Issue '%s': invalid type '%s'", slug, issueType)))
	}

	priority := frontmatter.GetString(data, "priority")
	if priority != "" && !model.ValidPriorities[model.Priority(priority)] {
		if _, ok := data["priority"].(string); ok {
			checks = append(checks, warn(fmt.Sprintf("Issue '%s': invalid priority '%s'", slug, priority)))
		}
	}

	return checks
}
