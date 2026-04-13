// Package cmd implements the Folio CLI using Cobra.
package cmd

import (
	"embed"
	"os"

	"github.com/spf13/cobra"
)

// EmbeddedDist holds the embedded frontend filesystem, set by main.
var EmbeddedDist embed.FS

// IsProduction indicates whether the binary was built with the embed tag.
// When true, logs are written to file instead of the console.
var IsProduction bool

// Global flags available to all subcommands.
var (
	dataDir string
	logDir  string
)

// rootCmd is the base command for the Folio CLI.
var rootCmd = &cobra.Command{
	Use:   "folio",
	Short: "Folio - filesystem-based project management",
	Long:  "Folio is a project management tool for agile teams that stores all data as plain markdown files.",
}

func init() {
	rootCmd.PersistentFlags().StringVar(&dataDir, "data", "", "Path to the Folio data directory (overrides FOLIO_DATA env var)")
	rootCmd.PersistentFlags().StringVar(&logDir, "log-dir", "", "Override log file directory (default: ~/.local/folio/logs)")
}

// Execute runs the root command.
func Execute(embeddedFS embed.FS, isEmbed bool) {
	EmbeddedDist = embeddedFS
	IsProduction = isEmbed
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
