package store

import (
	"fmt"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/briantol/forge/internal/frontmatter"
	"github.com/briantol/forge/internal/gitutil"
	"github.com/briantol/forge/internal/model"
)

// WikiStore provides filesystem-backed CRUD for wiki docs.
type WikiStore struct {
	paths *Paths
}

// NewWikiStore creates a new WikiStore.
func NewWikiStore(p *Paths) *WikiStore {
	return &WikiStore{paths: p}
}

func (s *WikiStore) readDoc(slug string) (*model.WikiDoc, error) {
	mdPath := filepath.Join(s.paths.Wiki, slug+".md")
	data, err := os.ReadFile(mdPath)
	if err != nil {
		return nil, err
	}

	doc, err := frontmatter.Parse(data)
	if err != nil {
		return nil, err
	}

	d := &model.WikiDoc{
		Slug:      slug,
		Title:     frontmatter.GetString(doc.Data, "title"),
		Icon:      frontmatter.GetStringPtr(doc.Data, "icon"),
		UpdatedAt: frontmatter.GetString(doc.Data, "modified"),
		Body:      doc.Body,
		Order:     frontmatter.GetInt(doc.Data, "order"),
	}

	// Description: use frontmatter value or auto-generate excerpt
	desc := frontmatter.GetStringPtr(doc.Data, "description")
	if desc != nil {
		d.Description = desc
	} else {
		excerpt := getExcerpt(doc.Body)
		if excerpt != "" {
			d.Description = &excerpt
		}
	}

	return d, nil
}

// getExcerpt extracts a plain-text description (up to 160 chars) from markdown body.
func getExcerpt(body string) string {
	if body == "" {
		return ""
	}

	// Strip headings, bold, italic, code, links
	lines := strings.Split(body, "\n")
	var plainParts []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "---") {
			continue
		}
		// Strip inline markdown
		re := regexp.MustCompile(`\*\*([^*]+)\*\*`)
		line = re.ReplaceAllString(line, "$1")
		re = regexp.MustCompile(`\*([^*]+)\*`)
		line = re.ReplaceAllString(line, "$1")
		re = regexp.MustCompile("`[^`]+`")
		line = re.ReplaceAllString(line, "")
		re = regexp.MustCompile(`\[([^\]]+)\]\([^)]+\)`)
		line = re.ReplaceAllString(line, "$1")
		// Strip list markers
		line = regexp.MustCompile(`^[-*+]\s+`).ReplaceAllString(line, "")
		line = regexp.MustCompile(`^\d+\.\s+`).ReplaceAllString(line, "")
		if line != "" {
			plainParts = append(plainParts, line)
		}
	}

	text := strings.Join(plainParts, " ")
	if utf8.RuneCountInString(text) > 160 {
		runes := []rune(text)
		text = string(runes[:157]) + "..."
	}
	return text
}

// ListAll returns all wiki docs sorted by order then title.
func (s *WikiStore) ListAll() []model.WikiDoc {
	entries, err := os.ReadDir(s.paths.Wiki)
	if err != nil {
		return nil
	}

	// Get dirty files for git integration
	gitRoot := gitutil.GetGitRoot(s.paths.Root)
	dirtyFiles := gitutil.GetDirtyFiles(gitRoot)

	docs := make([]model.WikiDoc, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".md") {
			continue
		}
		slug := strings.TrimSuffix(entry.Name(), ".md")
		doc, err := s.readDoc(slug)
		if err != nil {
			continue
		}

		// Check git dirty status
		if dirtyFiles != nil {
			relPath := filepath.Join("wiki", entry.Name())
			// Also check relative to data root
			if gitRoot != "" {
				absPath := filepath.Join(s.paths.Wiki, entry.Name())
				if rel, err := filepath.Rel(gitRoot, absPath); err == nil {
					doc.Dirty = dirtyFiles[rel]
				}
			} else {
				doc.Dirty = dirtyFiles[relPath]
			}
		}

		docs = append(docs, *doc)
	}

	sort.SliceStable(docs, func(i, j int) bool {
		if docs[i].Order != docs[j].Order {
			return docs[i].Order < docs[j].Order
		}
		return strings.ToLower(docs[i].Title) < strings.ToLower(docs[j].Title)
	})

	return docs
}

// List returns a paginated list of wiki docs.
func (s *WikiStore) List(page, limit int) model.PaginatedWikiDocs {
	all := s.ListAll()
	total := len(all)
	totalPages := int(math.Max(1, math.Ceil(float64(total)/float64(limit))))
	safePage := page
	if safePage > totalPages {
		safePage = totalPages
	}
	if safePage < 1 {
		safePage = 1
	}
	start := (safePage - 1) * limit
	end := start + limit
	if end > total {
		end = total
	}
	if start > total {
		start = total
	}

	return model.PaginatedWikiDocs{
		Docs:       all[start:end],
		Total:      total,
		Page:       safePage,
		Limit:      limit,
		TotalPages: totalPages,
	}
}

// Get returns a single wiki doc by slug.
func (s *WikiStore) Get(slug string) *model.WikiDoc {
	doc, err := s.readDoc(slug)
	if err != nil {
		return nil
	}

	// Check dirty status
	gitRoot := gitutil.GetGitRoot(s.paths.Root)
	if gitRoot != "" {
		dirtyFiles := gitutil.GetDirtyFiles(gitRoot)
		absPath := filepath.Join(s.paths.Wiki, slug+".md")
		if rel, err := filepath.Rel(gitRoot, absPath); err == nil {
			doc.Dirty = dirtyFiles[rel]
		}
	}

	return doc
}

// Save creates or updates a wiki doc at the given slug.
func (s *WikiStore) Save(slug string, input model.SaveWikiDocInput) *model.WikiDoc {
	if err := os.MkdirAll(s.paths.Wiki, 0755); err != nil {
		return nil
	}

	// Read existing data if the doc exists
	mdPath := filepath.Join(s.paths.Wiki, slug+".md")
	var existingData map[string]interface{}
	if existing, err := os.ReadFile(mdPath); err == nil {
		if doc, err := frontmatter.Parse(existing); err == nil {
			existingData = doc.Data
		}
	}

	data := make(map[string]interface{})
	if existingData != nil {
		for k, v := range existingData {
			data[k] = v
		}
	}
	data["title"] = input.Title
	data["modified"] = time.Now().Format("2006-01-02")
	if input.Icon != nil {
		data["icon"] = *input.Icon
	} else if _, ok := data["icon"]; !ok {
		data["icon"] = nil
	}

	content, err := frontmatter.Stringify(data, input.Body)
	if err != nil {
		return nil
	}

	if err := os.WriteFile(mdPath, content, 0644); err != nil {
		return nil
	}

	return s.Get(slug)
}

// Delete removes a wiki doc. Returns false if not found.
func (s *WikiStore) Delete(slug string) bool {
	mdPath := filepath.Join(s.paths.Wiki, slug+".md")
	if _, err := os.Stat(mdPath); err != nil {
		return false
	}
	os.Remove(mdPath)
	return true
}

// Reorder sets order for the given slugs.
func (s *WikiStore) Reorder(slugs []string) {
	for i, slug := range slugs {
		mdPath := filepath.Join(s.paths.Wiki, slug+".md")
		rawData, err := os.ReadFile(mdPath)
		if err != nil {
			continue
		}
		doc, err := frontmatter.Parse(rawData)
		if err != nil {
			continue
		}
		doc.Data["order"] = i
		content, err := frontmatter.Stringify(doc.Data, doc.Body)
		if err != nil {
			continue
		}
		os.WriteFile(mdPath, content, 0644)
	}
}

// SlugifyTitle converts a title to a URL-safe slug.
func SlugifyTitle(title string) string {
	return slugify(title)
}

// UniqueSlug generates a unique slug, appending -2, -3, etc. if needed.
func (s *WikiStore) UniqueSlug(base string) string {
	slug := base
	suffix := 2
	for {
		mdPath := filepath.Join(s.paths.Wiki, slug+".md")
		if _, err := os.Stat(mdPath); os.IsNotExist(err) {
			return slug
		}
		slug = fmt.Sprintf("%s-%d", base, suffix)
		suffix++
	}
}
