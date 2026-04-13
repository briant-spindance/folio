package doctor

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/briant-spindance/folio/internal/frontmatter"
	"github.com/briant-spindance/folio/internal/store"
)

// checkWiki validates all wiki page files.
func checkWiki(paths *store.Paths) []Check {
	entries, err := os.ReadDir(paths.Wiki)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return []Check{fail(fmt.Sprintf("Cannot read wiki directory: %v", err))}
	}

	var checks []Check
	count := 0

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".md") {
			continue
		}

		slug := strings.TrimSuffix(entry.Name(), ".md")
		mdPath := filepath.Join(paths.Wiki, entry.Name())

		data, err := os.ReadFile(mdPath)
		if err != nil {
			checks = append(checks, fail(fmt.Sprintf("Wiki '%s': cannot read file", slug)))
			continue
		}

		doc, err := frontmatter.Parse(data)
		if err != nil {
			checks = append(checks, fail(fmt.Sprintf("Wiki '%s': invalid frontmatter", slug)))
			continue
		}

		count++

		title := frontmatter.GetString(doc.Data, "title")
		if title == "" {
			checks = append(checks, warn(fmt.Sprintf("Wiki '%s': missing title", slug)))
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
			return []Check{pass("No wiki pages to check")}
		}
		return []Check{pass(fmt.Sprintf("All %d wiki pages are valid", count))}
	}

	return checks
}
