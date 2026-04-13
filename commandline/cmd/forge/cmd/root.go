// Package cmd implements the Forge CLI using Cobra.
package cmd

import (
	"embed"
	"os"

	"github.com/spf13/cobra"
)

// EmbeddedDist holds the embedded frontend filesystem, set by main.
var EmbeddedDist embed.FS

// rootCmd is the base command for the Forge CLI.
var rootCmd = &cobra.Command{
	Use:   "forge",
	Short: "Forge - filesystem-based project management",
	Long:  "Forge is a project management tool for agile teams that stores all data as plain markdown files.",
}

// Execute runs the root command.
func Execute(embeddedFS embed.FS) {
	EmbeddedDist = embeddedFS
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
