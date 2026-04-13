package main

import (
	"github.com/briantol/folio/cmd/folio/cmd"
)

func main() {
	cmd.Execute(embeddedDist, isEmbed)
}
