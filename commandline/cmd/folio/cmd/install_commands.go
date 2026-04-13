package cmd

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	"github.com/briant-spindance/folio/internal/commands"
	"github.com/spf13/cobra"
)

func init() {
	installCommandsCmd.Flags().BoolVar(&jsonOutput, "json", false, "Output in JSON format")
	rootCmd.AddCommand(installCommandsCmd)
}

var installCommandsCmd = &cobra.Command{
	Use:   "install-commands",
	Short: "Install OpenCode slash commands into your project",
	Long:  "Copies Folio OpenCode command files (.md) into .opencode/commands/ so they are available as /feature, /plan, /issue, /fix, /review, and /doctor slash commands.",
	RunE:  runInstallCommands,
}

func runInstallCommands(cmd *cobra.Command, args []string) error {
	out := cmd.OutOrStdout()

	// Determine project root.
	projectRoot, err := resolveProjectRoot()
	if err != nil {
		return err
	}

	// Check that we have commands available (embedded or on filesystem).
	hasCommands, err := checkCommandsAvailable()
	if err != nil {
		return err
	}
	if !hasCommands {
		return fmt.Errorf("no commands found; ensure commands are embedded in the binary or available on the filesystem")
	}

	// For dev builds, load from filesystem.
	if !hasEmbeddedCommands() {
		if err := loadCommandsFromFilesystem(); err != nil {
			return fmt.Errorf("failed to load commands from filesystem: %w", err)
		}
	}

	// Install commands.
	result, err := commands.Install(projectRoot)
	if err != nil {
		return err
	}

	if jsonOutput {
		printJSON(out, result)
		return nil
	}

	fmt.Fprintf(out, "\nInstalled %d commands:\n\n", len(result.CommandsInstalled))
	for _, c := range result.CommandsInstalled {
		fmt.Fprintf(out, "  /%s → %s\n", c.Name, c.Path)
	}
	fmt.Fprintf(out, "\nCommands directory: %s\n", result.TargetDir)
	fmt.Fprintf(out, "Use these commands in OpenCode by typing /<command-name>\n")
	return nil
}

// hasEmbeddedCommands checks whether the embedded commands FS has content.
func hasEmbeddedCommands() bool {
	entries, err := fs.ReadDir(commands.EmbeddedCommands, ".")
	if err != nil {
		return false
	}
	for _, e := range entries {
		if e.IsDir() && e.Name() == "commands" {
			return true
		}
	}
	return false
}

// checkCommandsAvailable checks whether commands are available from any source.
func checkCommandsAvailable() (bool, error) {
	if hasEmbeddedCommands() {
		return true, nil
	}

	// Check filesystem — look for commands/ relative to cwd or binary.
	candidates := []string{}

	if cwd, err := os.Getwd(); err == nil {
		candidates = append(candidates, filepath.Join(cwd, "commands"))
	}

	if exe, err := os.Executable(); err == nil {
		candidates = append(candidates, filepath.Join(filepath.Dir(exe), "..", "commands"))
	}

	for _, dir := range candidates {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			return true, nil
		}
	}

	return false, nil
}

// loadCommandsFromFilesystem finds the commands/ directory on the filesystem
// (for dev builds without embedded commands).
func loadCommandsFromFilesystem() error {
	candidates := []string{}

	if cwd, err := os.Getwd(); err == nil {
		candidates = append(candidates, filepath.Join(cwd, "commands"))
	}
	if exe, err := os.Executable(); err == nil {
		candidates = append(candidates, filepath.Join(filepath.Dir(exe), "..", "commands"))
	}

	for _, dir := range candidates {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			commands.FilesystemCommandsDir = dir
			return nil
		}
	}

	return fmt.Errorf("commands/ directory not found")
}
