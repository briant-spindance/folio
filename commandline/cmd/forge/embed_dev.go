//go:build !embed
// +build !embed

package main

import "embed"

// When built without the "embed" tag, provide an empty FS.
// The server will fall back to --static flag or auto-detection.
var embeddedDist embed.FS
