//go:build embed_skills
// +build embed_skills

package main

import "embed"

// When built with the "embed_skills" tag, embed the skills directory.
// Build with: go build -tags embed_skills
// Requires: cp -r skills commandline/cmd/folio/skills

//go:embed all:skills
var embeddedSkills embed.FS
