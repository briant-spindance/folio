package cmd

import (
	"fmt"

	"github.com/briant-spindance/folio/internal/doctor"
	"github.com/spf13/cobra"
)

func init() {
	doctorCmd.Flags().BoolVar(&jsonOutput, "json", false, "Output in JSON format")
	rootCmd.AddCommand(doctorCmd)
}

var doctorCmd = &cobra.Command{
	Use:   "doctor",
	Short: "Check the health of the folio/ directory",
	Long:  "Runs a series of health checks against the folio/ directory to find structural issues, invalid frontmatter, broken references, and other problems.",
	RunE:  runDoctor,
}

func runDoctor(cmd *cobra.Command, args []string) error {
	out := cmd.OutOrStdout()
	paths := resolvePaths()

	if err := checkDataDir(paths); err != nil {
		return err
	}

	result := doctor.Run(paths)

	if jsonOutput {
		printJSON(out, result)
		return nil
	}

	fmt.Fprintln(out, "Folio Doctor")
	fmt.Fprintln(out)

	for _, c := range result.Checks {
		var indicator string
		switch c.Level {
		case doctor.LevelPass:
			indicator = "  PASS"
		case doctor.LevelWarn:
			indicator = "  WARN"
		case doctor.LevelFail:
			indicator = "  FAIL"
		}
		fmt.Fprintf(out, "  %s  %s\n", indicator, c.Message)
	}

	fmt.Fprintln(out)
	fmt.Fprintf(out, "%d passed, %d warnings, %d failed\n",
		result.Passed, result.Warnings, result.Failed)

	if result.Failed > 0 {
		return fmt.Errorf("%d health check(s) failed", result.Failed)
	}

	return nil
}
