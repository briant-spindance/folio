package cmd

import (
	"fmt"
	"runtime/debug"

	"github.com/spf13/cobra"
)

// Build-time variables, set via -ldflags.
var (
	Version = "dev"
	Commit  = "unknown"
	Date    = "unknown"
)

func init() {
	versionCmd.Flags().BoolVar(&jsonOutput, "json", false, "Output in JSON format")
	rootCmd.AddCommand(versionCmd)
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the folio version",
	Long:  "Displays the folio version, commit hash, build date, and Go version.",
	RunE:  runVersion,
}

func runVersion(cmd *cobra.Command, args []string) error {
	out := cmd.OutOrStdout()

	goVersion := "unknown"
	if info, ok := debug.ReadBuildInfo(); ok {
		goVersion = info.GoVersion
	}

	if jsonOutput {
		printJSON(out, map[string]string{
			"version":    Version,
			"commit":     Commit,
			"date":       Date,
			"go_version": goVersion,
		})
		return nil
	}

	fmt.Fprintf(out, "folio %s\n", Version)
	fmt.Fprintf(out, "  commit:  %s\n", Commit)
	fmt.Fprintf(out, "  built:   %s\n", Date)
	fmt.Fprintf(out, "  go:      %s\n", goVersion)
	return nil
}
