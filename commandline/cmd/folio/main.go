package main

import (
	"github.com/briant-spindance/folio/cmd/folio/cmd"
)

func main() {
	cmd.Execute(embeddedDist, isEmbed)
}
