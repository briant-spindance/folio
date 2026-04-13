// Package banner provides the startup ASCII art banner for the Folio web server.
package banner

import (
	"fmt"

	"github.com/fatih/color"
)

// lines contains the figlet-style ASCII art for "folio".
// Font: "Small" from figlet/toilet.
var lines = [6]string{
	`   __       _ _       `,
	`  / _| ___ | (_) ___  `,
	` | |_ / _ \| | |/ _ \ `,
	` |  _| (_) | | | (_) |`,
	` |_|  \___/|_|_|\___/ `,
	`                       `,
}

// gradient defines the color sequence applied top-to-bottom across the art lines.
var gradient = [6]*color.Color{
	color.New(color.FgHiCyan),
	color.New(color.FgCyan),
	color.New(color.FgHiBlue),
	color.New(color.FgBlue),
	color.New(color.FgHiMagenta),
	color.New(color.FgMagenta),
}

// Print renders the colored ASCII art banner with the given version string.
// Colors are automatically suppressed when output is piped or NO_COLOR is set.
func Print(version string) {
	fmt.Println()
	for i, line := range lines {
		if i == len(lines)-1 {
			// Last line: append version in a dim/white style.
			gradient[i].Print(line)
			color.New(color.FgWhite, color.Bold).Printf("v%s", version)
			fmt.Println()
		} else {
			gradient[i].Println(line)
		}
	}
	fmt.Println()
}
