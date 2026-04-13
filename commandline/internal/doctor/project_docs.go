package doctor

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/briant-spindance/folio/internal/frontmatter"
	"github.com/briant-spindance/folio/internal/store"
)

// checkProjectDocs validates all project document files.
func checkProjectDocs(paths *store.Paths) []Check {
	entries, err := os.ReadDir(paths.ProjectDocs)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // structure check already reported this
		}
		return []Check{fail(fmt.Sprintf("Cannot read project-docs directory: %v", err))}
	}

	var checks []Check
	count := 0

	// Track order values for duplicate detection.
	orderSlugs := make(map[int][]string)

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".md") {
			continue
		}

		slug := strings.TrimSuffix(entry.Name(), ".md")
		mdPath := filepath.Join(paths.ProjectDocs, entry.Name())

		data, err := os.ReadFile(mdPath)
		if err != nil {
			checks = append(checks, fail(fmt.Sprintf("Doc '%s': cannot read file", slug)))
			continue
		}

		doc, err := frontmatter.Parse(data)
		if err != nil {
			checks = append(checks, fail(fmt.Sprintf("Doc '%s': invalid frontmatter", slug)))
			continue
		}

		count++

		title := frontmatter.GetString(doc.Data, "title")
		if title == "" {
			checks = append(checks, warn(fmt.Sprintf("Doc '%s': missing title", slug)))
		}

		// Validate that order is an integer when present.
		if rawOrder, exists := doc.Data["order"]; exists {
			if !isIntegerValue(rawOrder) {
				checks = append(checks, warn(fmt.Sprintf("Doc '%s': 'order' should be an integer", slug)))
			} else {
				order := frontmatter.GetInt(doc.Data, "order")
				orderSlugs[order] = append(orderSlugs[order], slug)
			}
		} else {
			// No order specified — defaults to 0 implicitly.
			orderSlugs[0] = append(orderSlugs[0], slug)
		}
	}

	// Check for duplicate order values.
	for order, slugs := range orderSlugs {
		if len(slugs) > 1 {
			sort.Strings(slugs)
			checks = append(checks, warn(fmt.Sprintf("Duplicate order %d shared by: %s", order, strings.Join(slugs, ", "))))
		}
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
			return []Check{pass("No project docs to check")}
		}
		return []Check{pass(fmt.Sprintf("All %d project docs are valid", count))}
	}

	return checks
}

// isIntegerValue returns true if the value is an integer type (int, int64, or
// float64 with no fractional part).
func isIntegerValue(v interface{}) bool {
	switch n := v.(type) {
	case int:
		return true
	case int64:
		return true
	case float64:
		return float64(int(n)) == n
	default:
		return false
	}
}
