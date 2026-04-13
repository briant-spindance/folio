package handler

import (
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/briantol/folio/internal/model"
	"github.com/briantol/folio/internal/store"
	"github.com/go-chi/chi/v5"
)

// SearchHandler handles GET /api/search.
type SearchHandler struct {
	search *store.SearchStore
}

// NewSearchHandler creates a new SearchHandler.
func NewSearchHandler(s *store.SearchStore) *SearchHandler {
	return &SearchHandler{search: s}
}

func (h *SearchHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		ErrorJSON(w, 400, "Query parameter 'q' is required")
		return
	}

	types := QueryCSV(r, "type")
	if types == nil {
		types = []string{}
	}
	limit := QueryInt(r, "limit", 20, 1, 100)

	result := h.search.Search(q, types, limit)
	JSON(w, 200, result)
}

// GitHandler handles GET /api/git.
type GitHandler struct {
	dataRoot string
}

// NewGitHandler creates a new GitHandler.
func NewGitHandler(dataRoot string) *GitHandler {
	return &GitHandler{dataRoot: dataRoot}
}

func (h *GitHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	gitRoot := findGitRoot(h.dataRoot)
	if gitRoot == "" {
		JSON(w, 200, map[string]interface{}{
			"branch": nil,
			"commit": nil,
			"dirty":  false,
		})
		return
	}

	branch := runGitCmd(gitRoot, "rev-parse", "--abbrev-ref", "HEAD")
	commit := runGitCmd(gitRoot, "rev-parse", "--short", "HEAD")

	dirty := false
	status := runGitCmd(gitRoot, "status", "--porcelain")
	if status != "" {
		dirty = true
	}

	response := map[string]interface{}{
		"dirty": dirty,
	}
	if branch != "" {
		response["branch"] = branch
	} else {
		response["branch"] = nil
	}
	if commit != "" {
		response["commit"] = commit
	} else {
		response["commit"] = nil
	}

	JSON(w, 200, response)
}

// SessionsHandler handles /api/ai-sessions routes.
type SessionsHandler struct {
	sessions *store.SessionStore
}

// NewSessionsHandler creates a new SessionsHandler.
func NewSessionsHandler(s *store.SessionStore) *SessionsHandler {
	return &SessionsHandler{sessions: s}
}

// Routes returns a chi router for /api/ai-sessions.
func (h *SessionsHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Route("/{key}", func(r chi.Router) {
		r.Get("/", h.list)
		r.Put("/", h.upsert)
		r.Delete("/{id}", h.delete)
	})

	return r
}

func (h *SessionsHandler) list(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "key")
	sessions := h.sessions.List(key)
	JSON(w, 200, sessions)
}

func (h *SessionsHandler) upsert(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "key")

	var input struct {
		ID       string        `json:"id"`
		Name     *string       `json:"name"`
		SavedAt  *int64        `json:"saved_at"`
		Messages []interface{} `json:"messages"`
	}
	if err := ReadJSON(r, &input); err != nil {
		ErrorJSON(w, 400, "Invalid JSON body")
		return
	}
	if input.ID == "" {
		ErrorJSON(w, 422, "id: ID is required")
		return
	}

	name := "Conversation"
	if input.Name != nil {
		name = *input.Name
	}

	var savedAt int64
	if input.SavedAt != nil {
		savedAt = *input.SavedAt
	} else {
		savedAt = currentTimeMillis()
	}

	session := model.ChatSession{
		ID:       input.ID,
		Name:     name,
		SavedAt:  savedAt,
		Messages: input.Messages,
	}
	if session.Messages == nil {
		session.Messages = []interface{}{}
	}

	if err := h.sessions.Upsert(key, session); err != nil {
		ErrorJSON(w, 500, "Failed to save session")
		return
	}

	JSON(w, 200, map[string]interface{}{"ok": true, "id": session.ID})
}

func (h *SessionsHandler) delete(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "key")
	id := chi.URLParam(r, "id")
	h.sessions.Delete(key, id)
	JSON(w, 200, map[string]interface{}{"ok": true})
}

func findGitRoot(dir string) string {
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

func runGitCmd(gitRoot string, args ...string) string {
	cmd := exec.Command("git", args...)
	cmd.Dir = gitRoot
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

func currentTimeMillis() int64 {
	return time.Now().UnixMilli()
}
