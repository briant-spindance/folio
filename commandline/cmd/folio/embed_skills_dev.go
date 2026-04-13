//go:build !embed_skills
// +build !embed_skills

package main

import "embed"

// When built without the "embed_skills" tag, provide an empty FS.
// The install-skills command will look for skills on the filesystem instead.
var embeddedSkills embed.FS
