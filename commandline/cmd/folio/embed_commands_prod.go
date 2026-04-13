//go:build embed_commands
// +build embed_commands

package main

import "embed"

// When built with the "embed_commands" tag, embed the commands directory.
// Build with: go build -tags embed_commands
// Requires: cp -r commands commandline/cmd/folio/commands

//go:embed all:commands
var embeddedCommands embed.FS
