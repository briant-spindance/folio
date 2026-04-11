# Search Implementation Plan (Phase 1)

In-memory substring search for the Forge web UI and CLI.

## Overview

Phase 1 implements scan-on-demand substring matching across all project
content. The search engine reads markdown files from the `forge/` directory,
parses YAML frontmatter, and performs case-insensitive substring matching
against filenames, frontmatter values, and markdown body text. No persistent
index or external dependencies beyond the Go standard library and `gopkg.in/yaml.v3`.

The search package is consumed by two surfaces:

- **API** — `GET /api/search?q=<query>&type=<filter>&limit=<n>`
- **CLI** — `forge search <query> [--type <type>] [--limit <n>]`

## Architecture

```
internal/
├── model/
│   └── model.go            # Entity types, SearchResult, SearchResponse
├── store/
│   └── store.go            # Filesystem reader: walk forge/, parse frontmatter
├── search/
│   └── search.go           # Search engine: matching, snippets, filtering
└── server/
    └── search_handler.go   # HTTP handler for GET /api/search
cmd/
    └── search.go           # CLI command (Cobra) for `forge search`
```

## Implementation Steps

### 1. Data types (`internal/model/`)

Define structs for each searchable entity and for search results.

```go
// Entity represents any searchable item in the forge/ directory.
type Entity struct {
    Type     string            // "feature", "issue", "doc", "sprint", "review"
    Name     string            // from frontmatter `name` or derived from filename
    Slug     string            // directory or filename stem
    Path     string            // relative path, e.g. "forge/features/auth/FEATURE.md"
    Status   string            // from frontmatter, empty if N/A
    Assignee string            // from frontmatter, empty if N/A
    Labels   []string          // issues only
    Meta     map[string]string // all frontmatter key-value pairs (stringified)
    Lines    []string          // body split by newline, for line-level searching
}

type SearchResult struct {
    Type     string  `json:"type"`
    Name     string  `json:"name"`
    Slug     string  `json:"slug"`
    Path     string  `json:"path"`
    Status   *string `json:"status,omitempty"`
    Assignee *string `json:"assignee,omitempty"`
    Snippet  string  `json:"snippet"`
    Line     int     `json:"line"`
}

type SearchResponse struct {
    Query   string         `json:"query"`
    Total   int            `json:"total"`
    Results []SearchResult `json:"results"`
}

type SearchOptions struct {
    Types []string // filter to these entity types; empty = all
    Limit int      // max results; 0 = default (20)
}
```

### 2. Filesystem reader (`internal/store/`)

The store walks the `forge/` directory and returns a slice of `Entity` values.

**File discovery conventions:**

| Entity Type | Path Pattern | Frontmatter Fields |
|-------------|-------------|-------------------|
| `feature` | `forge/features/*/FEATURE.md` | `name`, `status`, `assignee`, `points` |
| `issue` | `forge/issues/*/ISSUE.md` | `name`, `status`, `assignee`, `labels`, `feature` |
| `sprint` | `forge/sprints/*/SPRINT.md` | `name`, `status`, `start_date`, `end_date`, `goal` |
| `doc` | `forge/project-docs/*.md` | (none — title derived from filename) |
| `review` | `forge/reviews/*/REVIEW.md` | (minimal) |

**Frontmatter parsing:**

1. Read the file contents.
2. Split on `---` delimiters to separate frontmatter from body.
3. Unmarshal frontmatter YAML into `map[string]interface{}` using `gopkg.in/yaml.v3`.
4. Stringify all values into `Entity.Meta` for uniform searching.
5. Split body into `Entity.Lines` by newline.

**Slug derivation:**

- For directory-based entities: the directory name is the slug.
- For flat files (`project-docs/*.md`): the filename stem is the slug.

**Name derivation:**

- Use the `name` field from frontmatter if present.
- Otherwise, title-case the slug (replace hyphens with spaces).

### 3. Search engine (`internal/search/`)

```go
func Search(entities []Entity, query string, opts SearchOptions) SearchResponse
```

**Matching logic:**

1. Lowercase the query once.
2. For each entity:
   a. If `opts.Types` is non-empty and the entity type is not in the list, skip.
   b. Check the slug (case-insensitive substring match).
   c. Check each frontmatter value in `Entity.Meta`.
   d. Check each line in `Entity.Lines`.
   e. On the first match, record the source (slug/meta-key/line-number) and stop.
3. Build a `SearchResult` with the match context.
4. Stop after `opts.Limit` results.

**Snippet generation:**

- Extract approximately 80 characters of context around the matched substring.
- Wrap the matched term in `**bold**` markers.
- Prepend `...` if the snippet doesn't start at the beginning of the line.
- Append `...` if the snippet doesn't reach the end of the line.
- For slug/frontmatter matches, use the matched value as the snippet source.

**Result ordering:**

Phase 1 returns results in discovery order — no relevance ranking. The
discovery order is: features, issues, docs, sprints, reviews (matching the
directory walk order).

### 4. HTTP handler (`internal/server/`)

Wire `GET /api/search` into the HTTP server.

```go
func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request) {
    q := r.URL.Query().Get("q")
    if q == "" {
        http.Error(w, `{"error":"query parameter 'q' is required"}`, 400)
        return
    }

    types := splitComma(r.URL.Query().Get("type"))
    limit := parseIntOr(r.URL.Query().Get("limit"), 20)

    entities := s.store.LoadAll()
    resp := search.Search(entities, q, search.Options{Types: types, Limit: limit})

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}
```

### 5. CLI command (`cmd/search.go`)

Using Cobra:

```
forge search <query> [--type feature,issue] [--limit 10] [--json]
```

- Positional argument: search query (required).
- `--type` (`-t`): comma-separated entity types to filter.
- `--limit` (`-l`): max results (default 20).
- `--json`: output raw JSON instead of formatted table.

**Terminal output format (non-JSON):**

```
Found 3 results for "authentication":

  [feature] User Authentication (in-progress)
  forge/features/user-authentication/FEATURE.md:12
  ...implement **authentication** using OAuth 2.0...

  [issue] Login Timeout on Slow Connections (open)
  forge/issues/login-timeout-on-slow-connections/ISSUE.md:5
  ...users experience **authentication** timeouts...

  [doc] Security Architecture
  forge/project-docs/security-architecture.md:28
  ...the **authentication** layer handles all identity...
```

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scan vs. cache | Scan on demand | Dataset is tiny (dozens of files). Avoids cache invalidation. |
| Frontmatter lib | Hand-roll `---` split + `yaml.v3` | Simple, no extra dependency. |
| Search scope | Slug + frontmatter values + body lines | Matches API spec exactly. |
| Result ordering | Discovery order | Phase 1 simplicity. |
| Snippet length | ~80 chars | Enough context without clutter. |
| CLI framework | Cobra | Industry standard for Go CLIs. |

## Dependencies

| Package | Purpose |
|---------|---------|
| `gopkg.in/yaml.v3` | YAML frontmatter parsing |
| `github.com/spf13/cobra` | CLI framework |
| Go stdlib (`strings`, `os`, `path/filepath`, `encoding/json`, `net/http`) | Everything else |

## What This Does NOT Include

These are deferred to Phase 2 (upgrade to Bleve or similar):

- Fuzzy matching / typo tolerance
- Relevance scoring / ranking
- Stemming (e.g. "running" → "run")
- File watching / live re-indexing
- Persistent index on disk
- Pagination
