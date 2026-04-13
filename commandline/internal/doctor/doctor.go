// Package doctor provides health checks for a Folio data directory.
package doctor

import (
	"github.com/briant-spindance/folio/internal/store"
)

// Level represents the severity of a health check result.
type Level string

const (
	LevelPass Level = "pass"
	LevelWarn Level = "warn"
	LevelFail Level = "fail"
)

// Check represents a single health check result.
type Check struct {
	Level   Level  `json:"level"`
	Message string `json:"message"`
}

// Result aggregates all health check results.
type Result struct {
	Passed   int     `json:"passed"`
	Warnings int     `json:"warnings"`
	Failed   int     `json:"failed"`
	Checks   []Check `json:"checks"`
}

// pass creates a pass-level check.
func pass(msg string) Check {
	return Check{Level: LevelPass, Message: msg}
}

// warn creates a warn-level check.
func warn(msg string) Check {
	return Check{Level: LevelWarn, Message: msg}
}

// fail creates a fail-level check.
func fail(msg string) Check {
	return Check{Level: LevelFail, Message: msg}
}

// Run executes all health checks against the given data directory and returns
// the aggregated result. Checks are run in a deterministic order.
func Run(paths *store.Paths) Result {
	var checks []Check

	// 1. Directory structure
	checks = append(checks, checkStructure(paths)...)

	// 2. Config validation
	checks = append(checks, checkConfig(paths)...)

	// Collect feature and issue slugs for referential integrity checks later.
	featureSlugs := collectFeatureSlugs(paths)
	issueSlugs := collectIssueSlugs(paths)

	// 3. Feature frontmatter
	checks = append(checks, checkFeatures(paths)...)

	// 4. Issue frontmatter
	checks = append(checks, checkIssues(paths)...)

	// 5. Wiki validation
	checks = append(checks, checkWiki(paths)...)

	// 6. Team validation
	checks = append(checks, checkTeam(paths)...)

	// 7. Roadmap consistency
	checks = append(checks, checkRoadmap(paths, featureSlugs)...)

	// 8. Duplicate slugs
	checks = append(checks, checkDuplicateSlugs(featureSlugs, issueSlugs)...)

	// 9. Referential integrity
	checks = append(checks, checkRefs(paths, featureSlugs)...)

	// Tally results.
	result := Result{Checks: checks}
	for _, c := range checks {
		switch c.Level {
		case LevelPass:
			result.Passed++
		case LevelWarn:
			result.Warnings++
		case LevelFail:
			result.Failed++
		}
	}

	return result
}
