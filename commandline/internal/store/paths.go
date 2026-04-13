// Package store provides filesystem-backed data stores for Folio entities.
package store

import (
	"os"
	"path/filepath"
)

// Paths holds resolved filesystem paths for all entity types.
type Paths struct {
	Root        string
	Features    string
	Wiki        string
	Issues      string
	Sprints     string
	Team        string
	Config      string
	Roadmap     string
	AISessions  string
	ProjectDocs string
}

// NewPaths creates a Paths instance from a data root directory.
func NewPaths(root string) *Paths {
	return &Paths{
		Root:        root,
		Features:    filepath.Join(root, "features"),
		Wiki:        filepath.Join(root, "wiki"),
		Issues:      filepath.Join(root, "issues"),
		Sprints:     filepath.Join(root, "sprints"),
		Team:        filepath.Join(root, "team.md"),
		Config:      filepath.Join(root, "folio.yaml"),
		Roadmap:     filepath.Join(root, "roadmap.md"),
		AISessions:  filepath.Join(root, ".sessions"),
		ProjectDocs: filepath.Join(root, "project-docs"),
	}
}

// ResolvePaths resolves the data root from FOLIO_DATA env var or a default.
func ResolvePaths(defaultRoot string) *Paths {
	root := os.Getenv("FOLIO_DATA")
	if root == "" {
		root = defaultRoot
	}
	abs, err := filepath.Abs(root)
	if err != nil {
		abs = root
	}
	return NewPaths(abs)
}
