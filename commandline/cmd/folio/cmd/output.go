package cmd

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"text/tabwriter"

	"github.com/briant-spindance/folio/internal/store"
)

// jsonOutput is a package-level flag for JSON output mode.
var jsonOutput bool

// resolvePaths resolves the store paths, respecting the --data flag.
func resolvePaths() *store.Paths {
	if dataDir != "" {
		os.Setenv("FOLIO_DATA", dataDir)
	}
	defaultRoot := filepath.Join(".", "folio")
	return store.ResolvePaths(defaultRoot)
}

// checkDataDir verifies the data directory exists.
func checkDataDir(paths *store.Paths) error {
	if _, err := os.Stat(paths.Root); os.IsNotExist(err) {
		return fmt.Errorf("data directory does not exist: %s\nSet FOLIO_DATA env var or use --data flag", paths.Root)
	}
	return nil
}

// printJSON encodes v as indented JSON and writes it to w.
func printJSON(w io.Writer, v interface{}) {
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	enc.Encode(v)
}

// newTable creates a tabwriter for aligned column output.
func newTable(w io.Writer) *tabwriter.Writer {
	return tabwriter.NewWriter(w, 0, 0, 2, ' ', 0)
}

// truncate shortens a string to maxLen, adding "..." if truncated.
func truncate(s string, maxLen int) string {
	s = strings.ReplaceAll(s, "\n", " ")
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

// ptrStr safely dereferences a string pointer, returning fallback if nil.
func ptrStr(p *string, fallback string) string {
	if p == nil {
		return fallback
	}
	return *p
}

// ptrFloat safely dereferences a float64 pointer, returning fallback if nil.
func ptrFloat(p *float64, fallback string) string {
	if p == nil {
		return fallback
	}
	return fmt.Sprintf("%.0f", *p)
}
