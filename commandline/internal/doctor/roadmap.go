package doctor

import (
	"fmt"
	"os"

	"github.com/briant-spindance/folio/internal/frontmatter"
	"github.com/briant-spindance/folio/internal/store"
)

// checkRoadmap validates roadmap structure and card references.
func checkRoadmap(paths *store.Paths, featureSlugs map[string]bool) []Check {
	data, err := os.ReadFile(paths.Roadmap)
	if os.IsNotExist(err) {
		return []Check{warn("roadmap.md not found")}
	}
	if err != nil {
		return []Check{fail(fmt.Sprintf("Cannot read roadmap.md: %v", err))}
	}

	doc, err := frontmatter.Parse(data)
	if err != nil {
		return []Check{fail(fmt.Sprintf("roadmap.md: invalid frontmatter: %v", err))}
	}

	// Parse columns.
	columns := frontmatter.GetStringSlice(doc.Data, "columns")
	columnSet := make(map[string]bool)
	for _, col := range columns {
		columnSet[col] = true
	}

	// Parse row labels.
	rowSet := make(map[string]bool)
	if rowsRaw, ok := doc.Data["rows"]; ok {
		if rowsSlice, ok := rowsRaw.([]interface{}); ok {
			for _, item := range rowsSlice {
				if m, ok := item.(map[string]interface{}); ok {
					label := frontmatter.GetString(m, "label")
					if label != "" {
						rowSet[label] = true
					}
				}
			}
		}
	}

	// Parse and validate cards.
	var checks []Check
	if cardsRaw, ok := doc.Data["cards"]; ok {
		if cardsSlice, ok := cardsRaw.([]interface{}); ok {
			for _, item := range cardsSlice {
				m, ok := item.(map[string]interface{})
				if !ok {
					continue
				}
				title := frontmatter.GetString(m, "title")
				cardLabel := title
				if cardLabel == "" {
					cardLabel = frontmatter.GetString(m, "id")
				}

				col := frontmatter.GetString(m, "column")
				if col != "" && !columnSet[col] {
					checks = append(checks, warn(fmt.Sprintf("Roadmap card '%s': references non-existent column '%s'", cardLabel, col)))
				}

				row := frontmatter.GetString(m, "row")
				if row != "" && len(rowSet) > 0 && !rowSet[row] {
					checks = append(checks, warn(fmt.Sprintf("Roadmap card '%s': references non-existent row '%s'", cardLabel, row)))
				}

				// Feature slug validation is handled in refs.go.
			}
		}
	}

	if len(checks) == 0 {
		return []Check{pass("Roadmap structure is consistent")}
	}

	return checks
}
