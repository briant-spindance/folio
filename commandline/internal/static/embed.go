// Package static provides the embedded frontend dist files.
package static

import "embed"

// FrontendDist embeds the frontend/dist directory.
// The go:embed directive is relative to the module root; we use a placeholder
// that gets resolved at build time via -ldflags or a symlink.
// For now, we embed a minimal placeholder. The actual embed directive
// referencing the frontend dist is in the main package.

// Placeholder to satisfy the package import. The real FS is in cmd/folio/main.go.
var FrontendFS embed.FS
