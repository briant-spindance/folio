package doctor

import (
	"fmt"
	"os"

	"github.com/briant-spindance/folio/internal/store"
)

// checkStructure verifies that required directories exist.
func checkStructure(paths *store.Paths) []Check {
	required := []struct {
		path string
		name string
	}{
		{paths.Features, "features/"},
		{paths.Issues, "issues/"},
		{paths.Wiki, "wiki/"},
		{paths.Sprints, "sprints/"},
		{paths.ProjectDocs, "project-docs/"},
	}

	var checks []Check
	allGood := true

	for _, r := range required {
		info, err := os.Stat(r.path)
		if os.IsNotExist(err) {
			checks = append(checks, fail(fmt.Sprintf("Required directory missing: %s", r.name)))
			allGood = false
		} else if err != nil {
			checks = append(checks, fail(fmt.Sprintf("Cannot access directory: %s", r.name)))
			allGood = false
		} else if !info.IsDir() {
			checks = append(checks, fail(fmt.Sprintf("Expected directory but found file: %s", r.name)))
			allGood = false
		}
	}

	if allGood {
		checks = []Check{pass("Directory structure is valid")}
	}

	return checks
}
