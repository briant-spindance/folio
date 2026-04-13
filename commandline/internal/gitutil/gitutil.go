// Package gitutil provides helpers for detecting git state.
package gitutil

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// GetGitRoot walks up from dir looking for a .git directory.
// Returns the git root path or empty string if not in a repo.
func GetGitRoot(dir string) string {
	for {
		if info, err := os.Stat(filepath.Join(dir, ".git")); err == nil && info.IsDir() {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return ""
		}
		dir = parent
	}
}

var (
	dirtyCache     map[string]bool
	dirtyCacheMu   sync.RWMutex
	dirtyCacheTime time.Time
	dirtyCacheTTL  = 2 * time.Second
)

// GetDirtyFiles returns a set of repo-relative file paths that have uncommitted changes.
// Results are cached for 2 seconds.
func GetDirtyFiles(gitRoot string) map[string]bool {
	if gitRoot == "" {
		return nil
	}

	dirtyCacheMu.RLock()
	if dirtyCache != nil && time.Since(dirtyCacheTime) < dirtyCacheTTL {
		result := dirtyCache
		dirtyCacheMu.RUnlock()
		return result
	}
	dirtyCacheMu.RUnlock()

	dirtyCacheMu.Lock()
	defer dirtyCacheMu.Unlock()

	// Double-check after acquiring write lock
	if dirtyCache != nil && time.Since(dirtyCacheTime) < dirtyCacheTTL {
		return dirtyCache
	}

	result := make(map[string]bool)

	cmd := exec.Command("git", "status", "--porcelain")
	cmd.Dir = gitRoot
	out, err := cmd.Output()
	if err != nil {
		dirtyCache = result
		dirtyCacheTime = time.Now()
		return result
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	for _, line := range lines {
		if len(line) < 4 {
			continue
		}
		path := strings.TrimSpace(line[3:])
		// Handle renames: "R old -> new"
		if idx := strings.Index(path, " -> "); idx != -1 {
			path = path[idx+4:]
		}
		// Remove trailing /
		path = strings.TrimSuffix(path, "/")
		if path != "" {
			result[path] = true
		}
	}

	dirtyCache = result
	dirtyCacheTime = time.Now()
	return result
}

// ResetCache clears the dirty files cache (useful for testing).
func ResetCache() {
	dirtyCacheMu.Lock()
	defer dirtyCacheMu.Unlock()
	dirtyCache = nil
}
