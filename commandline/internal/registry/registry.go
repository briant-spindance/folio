// Package registry manages the list of known Folio projects and tracks
// the currently-active project.
package registry

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"

	"gopkg.in/yaml.v3"
)

// Project describes a single Folio project.
type Project struct {
	Name string `yaml:"name" json:"name"`
	Path string `yaml:"path" json:"path"`
	Slug string `yaml:"-"    json:"slug"`
}

// projectListFile is the on-disk shape of ~/.local/folio/project-list.yaml.
type projectListFile struct {
	Active   string    `yaml:"active"`
	Projects []Project `yaml:"projects"`
}

// Registry holds the set of known projects and the active selection.
type Registry struct {
	mu             sync.RWMutex
	projects       []Project           // ordered list
	bySlug         map[string]*Project // lookup index
	active         string              // slug of active project
	filePath       string              // path to project-list.yaml (empty = no file)
	localDiscovery *Project            // CWD project that was not already in the file
}

// Option configures optional behaviour of the Registry.
type Option func(*Registry)

// WithProjectListPath overrides the default ~/.local/folio/project-list.yaml
// location with a custom path.
func WithProjectListPath(path string) Option {
	return func(r *Registry) {
		r.filePath = path
	}
}

// DefaultConfigDir returns the default path to ~/.local/folio.
func DefaultConfigDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("cannot determine home directory: %w", err)
	}
	return filepath.Join(home, ".local", "folio"), nil
}

// DefaultProjectListPath returns the default path to project-list.yaml.
func DefaultProjectListPath() (string, error) {
	dir, err := DefaultConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "project-list.yaml"), nil
}

// New creates a Registry by discovering projects from all sources.
// cwdFolioDir is the ./folio directory relative to the binary's CWD (may not exist).
// If envDataDir is non-empty it overrides discovery and is the sole project.
// opts can contain functional options like WithProjectListPath.
func New(cwdFolioDir, envDataDir string, opts ...Option) (*Registry, error) {
	r := &Registry{
		bySlug: make(map[string]*Project),
	}

	// If FOLIO_DATA / --data is set, use it as the sole project (single-project mode).
	if envDataDir != "" {
		abs, err := filepath.Abs(envDataDir)
		if err != nil {
			abs = envDataDir
		}
		name := readProjectName(abs)
		slug := Slugify(name)
		p := Project{Name: name, Path: abs, Slug: slug}
		r.projects = append(r.projects, p)
		r.bySlug[slug] = &r.projects[0]
		r.active = slug
		return r, nil
	}

	// Detect a ./folio directory at CWD (remember its path for later comparison).
	var localPath string
	if cwdFolioDir != "" {
		abs, err := filepath.Abs(cwdFolioDir)
		if err == nil {
			if info, err := os.Stat(abs); err == nil && info.IsDir() {
				localPath = abs
				name := readProjectName(abs)
				slug := Slugify(name)
				r.addProject(Project{Name: name, Path: abs, Slug: slug})
			}
		}
	}

	// Apply options.
	for _, opt := range opts {
		opt(r)
	}

	// Read project-list.yaml (from option override or default location).
	// Track which paths were already in the file so we can detect new local projects.
	filePaths := r.loadProjectList()

	// If a local ./folio directory was discovered and it wasn't already in the file,
	// record it so callers can prompt the user.
	if localPath != "" && !filePaths[localPath] {
		for i := range r.projects {
			if r.projects[i].Path == localPath {
				cp := r.projects[i]
				r.localDiscovery = &cp
				break
			}
		}
	}

	// If nothing was discovered, return an error.
	if len(r.projects) == 0 {
		return r, fmt.Errorf("no projects found: create a ./folio directory or add projects to ~/.local/folio/project-list.yaml")
	}

	// If no active was set (or the persisted active no longer exists), default to first.
	if _, ok := r.bySlug[r.active]; !ok {
		r.active = r.projects[0].Slug
	}

	return r, nil
}

// loadProjectList reads the project-list.yaml and merges projects.
// Returns the set of absolute paths that were already present in the file.
func (r *Registry) loadProjectList() map[string]bool {
	filePaths := make(map[string]bool)

	if r.filePath != "" {
		// Option override — use the path as-is.
		filePaths = r.loadFile(r.filePath)
	} else {
		home, err := os.UserHomeDir()
		if err == nil {
			listPath := filepath.Join(home, ".local", "folio", "project-list.yaml")
			r.filePath = listPath
			filePaths = r.loadFile(listPath)
		}
	}

	return filePaths
}

// EnsureConfigDir creates the ~/.local/folio directory and an empty
// project-list.yaml if they do not already exist. This is a no-op when
// a --projects override is active (filePath was set via option).
func (r *Registry) EnsureConfigDir() error {
	if r.filePath == "" {
		return nil
	}

	// Check if the path was set via option (non-default location).
	// We only auto-create for the default ~/.local/folio location.
	defaultPath, err := DefaultProjectListPath()
	if err != nil || r.filePath != defaultPath {
		return nil
	}

	dir := filepath.Dir(r.filePath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("failed to create config directory %s: %w", dir, err)
	}

	// Create the file only if it doesn't exist.
	if _, err := os.Stat(r.filePath); os.IsNotExist(err) {
		f := projectListFile{
			Projects: []Project{},
		}
		data, err := yaml.Marshal(&f)
		if err != nil {
			return fmt.Errorf("failed to marshal default project list: %w", err)
		}
		if err := os.WriteFile(r.filePath, data, 0o644); err != nil {
			return fmt.Errorf("failed to create project list file: %w", err)
		}
	}

	return nil
}

// NewlyDiscovered returns a project discovered at ./folio that was not
// already present in the project-list.yaml file, or nil if there is none.
func (r *Registry) NewlyDiscovered() *Project {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.localDiscovery == nil {
		return nil
	}
	cp := *r.localDiscovery
	return &cp
}

// Projects returns a copy of the project list.
func (r *Registry) Projects() []Project {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]Project, len(r.projects))
	copy(out, r.projects)
	return out
}

// Active returns the slug of the active project.
func (r *Registry) Active() string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.active
}

// Get returns the project with the given slug, or nil.
func (r *Registry) Get(slug string) *Project {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.bySlug[slug]
	if !ok {
		return nil
	}
	// Return a copy.
	cp := *p
	return &cp
}

// Activate sets the active project by slug and persists to disk.
func (r *Registry) Activate(slug string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.bySlug[slug]; !ok {
		return fmt.Errorf("unknown project: %s", slug)
	}
	r.active = slug
	return r.persist()
}

// Add registers a new project and persists the updated list.
// Returns an error if the path is already registered.
func (r *Registry) Add(p Project) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Validate path.
	abs, err := filepath.Abs(p.Path)
	if err != nil {
		return fmt.Errorf("invalid path: %w", err)
	}
	p.Path = abs

	// Check for duplicate path.
	for _, existing := range r.projects {
		if existing.Path == abs {
			return fmt.Errorf("project already registered at %s", abs)
		}
	}

	// Read project name from folio.yaml if not provided.
	if p.Name == "" {
		p.Name = readProjectName(abs)
	}
	if p.Slug == "" {
		p.Slug = Slugify(p.Name)
	}

	r.addProject(p)

	// Clear localDiscovery if we just persisted that project.
	if r.localDiscovery != nil && r.localDiscovery.Path == abs {
		r.localDiscovery = nil
	}

	return r.persist()
}

// Remove unregisters a project by slug and persists the updated list.
// Returns an error if the slug is the active project or doesn't exist.
func (r *Registry) Remove(slug string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.bySlug[slug]; !ok {
		return fmt.Errorf("unknown project: %s", slug)
	}
	if r.active == slug {
		return fmt.Errorf("cannot remove the active project %q; activate a different project first", slug)
	}

	// Remove from the list and index.
	delete(r.bySlug, slug)
	filtered := make([]Project, 0, len(r.projects)-1)
	for _, p := range r.projects {
		if p.Slug != slug {
			filtered = append(filtered, p)
		}
	}
	r.projects = filtered

	// Rebuild bySlug pointers (since slice backing array changed).
	r.bySlug = make(map[string]*Project, len(r.projects))
	for i := range r.projects {
		r.bySlug[r.projects[i].Slug] = &r.projects[i]
	}

	return r.persist()
}

// HasPath returns true if a project with the given absolute path is registered.
func (r *Registry) HasPath(path string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, p := range r.projects {
		if p.Path == path {
			return true
		}
	}
	return false
}

// Count returns the number of registered projects.
func (r *Registry) Count() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.projects)
}

// FilePath returns the path to the project-list.yaml file being used.
func (r *Registry) FilePath() string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.filePath
}

// addProject adds a project if its path is not already registered.
func (r *Registry) addProject(p Project) {
	// Deduplicate by path.
	for _, existing := range r.projects {
		if existing.Path == p.Path {
			return
		}
	}
	// Deduplicate slug — append numeric suffix if needed.
	base := p.Slug
	suffix := 2
	for {
		if _, ok := r.bySlug[p.Slug]; !ok {
			break
		}
		p.Slug = fmt.Sprintf("%s-%d", base, suffix)
		suffix++
	}
	r.projects = append(r.projects, p)
	r.bySlug[p.Slug] = &r.projects[len(r.projects)-1]
}

// loadFile reads a project-list.yaml and merges its projects.
// Returns a set of absolute paths found in the file.
func (r *Registry) loadFile(path string) map[string]bool {
	filePaths := make(map[string]bool)

	data, err := os.ReadFile(path)
	if err != nil {
		return filePaths // File doesn't exist yet, that's fine.
	}

	var f projectListFile
	if err := yaml.Unmarshal(data, &f); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: failed to parse %s: %v\n", path, err)
		return filePaths
	}

	// Set active from file if we don't have one yet.
	if r.active == "" && f.Active != "" {
		r.active = f.Active
	}

	for _, p := range f.Projects {
		if p.Path == "" {
			continue
		}
		abs, err := filepath.Abs(p.Path)
		if err != nil {
			abs = p.Path
		}
		filePaths[abs] = true

		// Validate path exists.
		if info, err := os.Stat(abs); err != nil || !info.IsDir() {
			fmt.Fprintf(os.Stderr, "Warning: project path does not exist, skipping: %s\n", abs)
			continue
		}
		name := p.Name
		if name == "" {
			name = readProjectName(abs)
		}
		slug := Slugify(name)
		r.addProject(Project{Name: name, Path: abs, Slug: slug})
	}

	return filePaths
}

// persist writes the current state back to project-list.yaml.
func (r *Registry) persist() error {
	if r.filePath == "" {
		return nil
	}

	// Ensure directory exists.
	dir := filepath.Dir(r.filePath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("failed to create directory %s: %w", dir, err)
	}

	f := projectListFile{
		Active:   r.active,
		Projects: make([]Project, len(r.projects)),
	}
	copy(f.Projects, r.projects)

	data, err := yaml.Marshal(&f)
	if err != nil {
		return fmt.Errorf("failed to marshal project list: %w", err)
	}
	return os.WriteFile(r.filePath, data, 0o644)
}

// readProjectName reads the project name from a folio.yaml inside dataDir.
// Falls back to the directory name if the file is absent or missing the field.
func readProjectName(dataDir string) string {
	cfgPath := filepath.Join(dataDir, "folio.yaml")
	data, err := os.ReadFile(cfgPath)
	if err != nil {
		return filepath.Base(dataDir)
	}
	var cfg struct {
		Project string `yaml:"project"`
	}
	if err := yaml.Unmarshal(data, &cfg); err != nil || cfg.Project == "" {
		return filepath.Base(dataDir)
	}
	return cfg.Project
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

// Slugify converts a project name to a URL-safe slug.
func Slugify(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = slugRe.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "project"
	}
	return s
}
