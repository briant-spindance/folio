package store

import (
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/briantol/forge/internal/frontmatter"
	"github.com/briantol/forge/internal/model"
)

// ProjectDocStore provides read-only access to project documents.
type ProjectDocStore struct {
	paths *Paths
}

// NewProjectDocStore creates a new ProjectDocStore.
func NewProjectDocStore(p *Paths) *ProjectDocStore {
	return &ProjectDocStore{paths: p}
}

// List returns all project docs, sorted by order then title.
func (s *ProjectDocStore) List() []model.ProjectDoc {
	entries, err := os.ReadDir(s.paths.ProjectDocs)
	if err != nil {
		return []model.ProjectDoc{}
	}

	var docs []model.ProjectDoc
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".md") {
			continue
		}
		slug := strings.TrimSuffix(e.Name(), ".md")
		doc := s.readDoc(slug, e.Name())
		if doc != nil {
			docs = append(docs, *doc)
		}
	}

	sort.Slice(docs, func(i, j int) bool {
		if docs[i].Order != docs[j].Order {
			return docs[i].Order < docs[j].Order
		}
		return docs[i].Title < docs[j].Title
	})

	if docs == nil {
		docs = []model.ProjectDoc{}
	}
	return docs
}

// Get returns a single project doc by slug, or nil if not found.
func (s *ProjectDocStore) Get(slug string) *model.ProjectDoc {
	fileName := slug + ".md"
	filePath := filepath.Join(s.paths.ProjectDocs, fileName)
	if _, err := os.Stat(filePath); err != nil {
		return nil
	}
	return s.readDoc(slug, fileName)
}

func (s *ProjectDocStore) readDoc(slug, fileName string) *model.ProjectDoc {
	filePath := filepath.Join(s.paths.ProjectDocs, fileName)
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil
	}

	doc, err := frontmatter.Parse(data)
	if err != nil {
		// No frontmatter — treat entire content as body, title from slug
		return &model.ProjectDoc{
			Slug:  slug,
			Title: slug,
			Body:  string(data),
		}
	}

	return &model.ProjectDoc{
		Slug:  slug,
		Title: frontmatter.GetString(doc.Data, "title"),
		Icon:  frontmatter.GetStringPtr(doc.Data, "icon"),
		Order: frontmatter.GetInt(doc.Data, "order"),
		Body:  doc.Body,
	}
}
