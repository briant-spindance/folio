package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
)

var (
	initForce bool
)

func init() {
	initCmd.Flags().BoolVar(&initForce, "force", false, "Overwrite existing folio/ directory")
	initCmd.Flags().BoolVar(&jsonOutput, "json", false, "Output in JSON format")

	rootCmd.AddCommand(initCmd)
}

var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize a new folio/ directory",
	Long:  "Creates the folio/ directory structure with default configuration, wiki page templates, and example content.",
	RunE:  runInit,
}

// templateFile represents a file to create during init.
type templateFile struct {
	Path    string // Relative path within the folio/ directory.
	Content string // File content.
}

// defaultTemplate returns the built-in template files.
func defaultTemplate() []templateFile {
	return []templateFile{
		{
			Path: "folio.yaml",
			Content: `project: my-project
version: "0.1.0"
workflow:
  states: [draft, deferred, ready, in-progress, review, done]
  default: draft
`,
		},
		{
			Path: "team.md",
			Content: `---
members: []
---
`,
		},
		{
			Path: ".gitignore",
			Content: `.sessions/
.env.local
`,
		},
		{
			Path: "roadmap.md",
			Content: `---
title: Product Roadmap
columns:
  - now
  - next
  - later
rows: []
cards: []
---
`,
		},
		{
			Path: filepath.Join("project-docs", "project-brief.md"),
			Content: `---
title: Project Brief
order: 0
---
## Overview

Describe your project here.

## Goals

- Goal 1
- Goal 2

## Non-Goals

- Non-goal 1
`,
		},
		{
			Path: filepath.Join("features", "backlog.md"),
			Content: `---
title: Feature Backlog
---
Features are listed in priority order.
`,
		},
		{
			Path: filepath.Join("reviews", "architecture", "REVIEW.md"),
			Content: `---
title: Architecture Review
---
## Checklist

- [ ] Are modules and packages well-organized?
- [ ] Are dependencies appropriate and minimal?
- [ ] Is the error handling strategy consistent?
- [ ] Are there any circular dependencies?
- [ ] Is the code testable and tested?
`,
		},
	}
}

// directories returns the set of directories to create.
func directories() []string {
	return []string{
		"features",
		"issues",
		"wiki",
		"sprints",
		"project-docs",
		"reviews",
		filepath.Join("reviews", "architecture"),
		".sessions",
	}
}

func runInit(cmd *cobra.Command, args []string) error {
	out := cmd.OutOrStdout()

	// Determine target directory.
	root := filepath.Join(".", "folio")
	if dataDir != "" {
		root = dataDir
	}

	absRoot, err := filepath.Abs(root)
	if err != nil {
		return fmt.Errorf("failed to resolve path: %w", err)
	}

	// Check if directory already exists.
	if _, err := os.Stat(absRoot); err == nil {
		if !initForce {
			return fmt.Errorf("directory already exists: %s\nUse --force to overwrite", absRoot)
		}
		// --force: remove existing directory.
		if err := os.RemoveAll(absRoot); err != nil {
			return fmt.Errorf("failed to remove existing directory: %w", err)
		}
	}

	// Create all directories.
	for _, d := range directories() {
		dirPath := filepath.Join(absRoot, d)
		if err := os.MkdirAll(dirPath, 0755); err != nil {
			return fmt.Errorf("failed to create directory %s: %w", d, err)
		}
	}

	// Write all template files.
	template := defaultTemplate()
	filesCreated := make([]string, 0, len(template))

	for _, f := range template {
		filePath := filepath.Join(absRoot, f.Path)

		// Ensure parent directory exists (handles nested paths).
		if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
			return fmt.Errorf("failed to create directory for %s: %w", f.Path, err)
		}

		if err := os.WriteFile(filePath, []byte(f.Content), 0644); err != nil {
			return fmt.Errorf("failed to write %s: %w", f.Path, err)
		}
		filesCreated = append(filesCreated, f.Path)
	}

	if jsonOutput {
		printJSON(out, map[string]interface{}{
			"path":          absRoot,
			"template":      "built-in",
			"files_created": filesCreated,
		})
		return nil
	}

	fmt.Fprintf(out, "Initialized folio/ directory at %s\n", absRoot)
	for _, f := range filesCreated {
		fmt.Fprintf(out, "  Created %s\n", f)
	}
	return nil
}
