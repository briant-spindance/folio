package store

import (
	"sync"
)

// Manager holds all store instances for the active project and supports
// hot-swapping to a different data directory.
type Manager struct {
	mu          sync.RWMutex
	paths       *Paths
	Features    *FeatureStore
	Issues      *IssueStore
	Wiki        *WikiStore
	Roadmap     *RoadmapStore
	Team        *TeamStore
	Sessions    *SessionStore
	Search      *SearchStore
	ProjectDocs *ProjectDocStore
}

// NewManager creates a Manager for the given data root.
func NewManager(paths *Paths) *Manager {
	m := &Manager{}
	m.buildStores(paths)
	return m
}

// Rebuild re-creates all stores for a new data directory.
// This acquires a write lock, blocking all in-flight reads until complete.
func (m *Manager) Rebuild(paths *Paths) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.buildStores(paths)
}

// Paths returns the current Paths (thread-safe).
func (m *Manager) Paths() *Paths {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.paths
}

// RLock acquires a read lock so callers can safely access store fields.
// Must be paired with RUnlock.
func (m *Manager) RLock() { m.mu.RLock() }

// RUnlock releases the read lock.
func (m *Manager) RUnlock() { m.mu.RUnlock() }

// buildStores creates fresh store instances. Caller must hold write lock (or
// be in the constructor).
func (m *Manager) buildStores(paths *Paths) {
	m.paths = paths
	m.Features = NewFeatureStore(paths)
	m.Issues = NewIssueStore(paths)
	m.Wiki = NewWikiStore(paths)
	m.Roadmap = NewRoadmapStore(paths)
	m.Team = NewTeamStore(paths)
	m.Sessions = NewSessionStore(paths)
	m.ProjectDocs = NewProjectDocStore(paths)
	m.Search = NewSearchStore(m.Features, m.Issues, m.Wiki, m.Roadmap)
}
