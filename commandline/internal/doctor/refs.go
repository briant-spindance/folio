package doctor

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/briant-spindance/folio/internal/frontmatter"
	"github.com/briant-spindance/folio/internal/store"
)

// checkDuplicateSlugs checks for duplicate slugs within features and issues.
func checkDuplicateSlugs(featureSlugs, issueSlugs map[string]bool) []Check {
	// Since slugs are directory names, duplicates within a single entity type
	// are impossible at the filesystem level. However, we still report the
	// check result for completeness.
	//
	// What we can check: whether any feature slug collides with an issue slug.
	// This isn't necessarily an error, but it can cause confusion.
	var checks []Check

	for slug := range featureSlugs {
		if issueSlugs[slug] {
			checks = append(checks, warn(fmt.Sprintf("Slug '%s' exists as both a feature and an issue", slug)))
		}
	}

	if len(checks) == 0 {
		return []Check{pass("No duplicate slugs found")}
	}

	return checks
}

// checkRefs validates cross-entity references.
func checkRefs(paths *store.Paths, featureSlugs map[string]bool) []Check {
	var checks []Check

	// Check issue -> feature references.
	issueRefs := checkIssueFeatureRefs(paths, featureSlugs)
	checks = append(checks, issueRefs...)

	// Check roadmap card -> feature references.
	roadmapRefs := checkRoadmapFeatureRefs(paths, featureSlugs)
	checks = append(checks, roadmapRefs...)

	if len(checks) == 0 {
		return []Check{pass("All cross-references are valid")}
	}

	return checks
}

// checkIssueFeatureRefs validates that issue feature references point to existing features.
func checkIssueFeatureRefs(paths *store.Paths, featureSlugs map[string]bool) []Check {
	entries, err := os.ReadDir(paths.Issues)
	if err != nil {
		return nil
	}

	var checks []Check

	for _, entry := range entries {
		if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}
		slug := entry.Name()
		mdPath := filepath.Join(paths.Issues, slug, "ISSUE.md")

		data, err := os.ReadFile(mdPath)
		if err != nil {
			continue
		}

		doc, err := frontmatter.Parse(data)
		if err != nil {
			continue
		}

		featureRef := frontmatter.GetStringPtr(doc.Data, "feature")
		if featureRef != nil && *featureRef != "" && !featureSlugs[*featureRef] {
			checks = append(checks, warn(fmt.Sprintf("Issue '%s': references non-existent feature '%s'", slug, *featureRef)))
		}
	}

	return checks
}

// checkRoadmapFeatureRefs validates that roadmap card featureSlugs point to existing features.
func checkRoadmapFeatureRefs(paths *store.Paths, featureSlugs map[string]bool) []Check {
	data, err := os.ReadFile(paths.Roadmap)
	if err != nil {
		return nil
	}

	doc, err := frontmatter.Parse(data)
	if err != nil {
		return nil
	}

	cardsRaw, ok := doc.Data["cards"]
	if !ok {
		return nil
	}

	cardsSlice, ok := cardsRaw.([]interface{})
	if !ok {
		return nil
	}

	var checks []Check

	for _, item := range cardsSlice {
		m, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		featureSlug := frontmatter.GetStringPtr(m, "featureSlug")
		if featureSlug != nil && *featureSlug != "" && !featureSlugs[*featureSlug] {
			title := frontmatter.GetString(m, "title")
			if title == "" {
				title = frontmatter.GetString(m, "id")
			}
			checks = append(checks, warn(fmt.Sprintf("Roadmap card '%s': references non-existent feature '%s'", title, *featureSlug)))
		}
	}

	return checks
}
