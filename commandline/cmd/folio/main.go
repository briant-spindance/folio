package main

import (
	"github.com/briant-spindance/folio/cmd/folio/cmd"
	"github.com/briant-spindance/folio/internal/commands"
	"github.com/briant-spindance/folio/internal/skills"
)

func main() {
	skills.EmbeddedSkills = embeddedSkills
	commands.EmbeddedCommands = embeddedCommands
	cmd.Execute(embeddedDist, isEmbed)
}
