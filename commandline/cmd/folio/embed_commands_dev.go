//go:build !embed_commands
// +build !embed_commands

package main

import "embed"

// When built without the "embed_commands" tag, provide an empty FS.
// The install-commands command will look for commands on the filesystem instead.
var embeddedCommands embed.FS
