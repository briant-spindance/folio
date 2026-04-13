//go:build embed
// +build embed

package main

import "embed"

// When built with the "embed" tag, embed the frontend dist.
// Build with: go build -tags embed
// Requires: cp -r frontend/dist commandline/cmd/forge/dist

//go:embed all:dist
var embeddedDist embed.FS
