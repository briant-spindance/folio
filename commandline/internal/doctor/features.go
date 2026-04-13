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

// collectFeatureSlugs returns a set of all feature directory names.
func collectFeatureSlugs(paths *store.Paths) map[string]bool {
	slugs := make(map[string]bool)
	entries, err := os.ReadDir(paths.Features)
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

// checkFeatures validates all feature frontmatter.
func checkFeatures(paths *store.Paths) []Check {
	entries, err := os.ReadDir(paths.Features)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // structure check already reported this
		}
		return []Check{fail(fmt.Sprintf("Cannot read features directory: %v", err))}
	}

	var checks []Check
	count := 0

	for _, entry := range entries {
		if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}
		slug := entry.Name()
		mdPath := filepath.Join(paths.Features, slug, "FEATURE.md")

		data, err := os.ReadFile(mdPath)
		if os.IsNotExist(err) {
			checks = append(checks, fail(fmt.Sprintf("Feature '%s': missing FEATURE.md", slug)))
			continue
		}
		if err != nil {
			checks = append(checks, fail(fmt.Sprintf("Feature '%s': cannot read FEATURE.md", slug)))
			continue
		}

		doc, err := frontmatter.Parse(data)
		if err != nil {
			checks = append(checks, fail(fmt.Sprintf("Feature '%s': invalid frontmatter", slug)))
			continue
		}

		count++
		checks = append(checks, validateFeatureFrontmatter(slug, doc.Data)...)
	}

	// Only add a pass summary if there were no problems.
	hasProblems := false
	for _, c := range checks {
		if c.Level != LevelPass {
			hasProblems = true
			break
		}
	}

	if !hasProblems {
		if count == 0 {
			return []Check{pass("No features to check")}
		}
		return []Check{pass(fmt.Sprintf("All %d features have valid frontmatter", count))}
	}

	return checks
}

// validateFeatureFrontmatter checks individual feature field validity.
func validateFeatureFrontmatter(slug string, data map[string]interface{}) []Check {
	var checks []Check

	title := frontmatter.GetString(data, "title")
	if title == "" {
		checks = append(checks, warn(fmt.Sprintf("Feature '%s': missing title", slug)))
	}

	status := frontmatter.GetString(data, "status")
	if status != "" && !model.ValidFeatureStatuses[model.FeatureStatus(status)] {
		checks = append(checks, warn(fmt.Sprintf("Feature '%s': invalid status '%s'", slug, status)))
	}

	priority := frontmatter.GetString(data, "priority")
	if priority != "" && !model.ValidPriorities[model.Priority(priority)] {
		// Check if it's a numeric priority (which is valid but legacy).
		if _, ok := data["priority"].(string); ok {
			checks = append(checks, warn(fmt.Sprintf("Feature '%s': invalid priority '%s'", slug, priority)))
		}
	}

	return checks
}
