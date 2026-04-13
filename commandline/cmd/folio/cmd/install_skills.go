package cmd

import (
	"bufio"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/briant-spindance/folio/internal/skills"
	"github.com/spf13/cobra"
)

func init() {
	installSkillsCmd.Flags().BoolVar(&jsonOutput, "json", false, "Output in JSON format")
	rootCmd.AddCommand(installSkillsCmd)
}

var installSkillsCmd = &cobra.Command{
	Use:   "install-skills",
	Short: "Install Folio agent skills into your project",
	Long:  "Copies Folio agent skills (SKILL.md files) into the configuration directory for your chosen AI coding tool.",
	RunE:  runInstallSkills,
}

func runInstallSkills(cmd *cobra.Command, args []string) error {
	out := cmd.OutOrStdout()

	// Determine project root (parent of the folio data directory).
	projectRoot, err := resolveProjectRoot()
	if err != nil {
		return err
	}

	// Check that we have skills available (embedded or on filesystem).
	hasSkills, err := checkSkillsAvailable()
	if err != nil {
		return err
	}
	if !hasSkills {
		return fmt.Errorf("no skills found; ensure skills are embedded in the binary or available on the filesystem")
	}

	// Get supported tools.
	tools := skills.SupportedTools()

	// Select tool — if only one tool, prompt for confirmation. Otherwise prompt to choose.
	var selectedTool skills.Tool
	if len(tools) == 1 {
		selectedTool = tools[0]
	} else {
		// Prompt user to choose a tool.
		fmt.Fprintf(out, "Select the AI tool to install skills for:\n\n")
		for i, t := range tools {
			fmt.Fprintf(out, "  %d) %s\n", i+1, t.Name)
		}
		fmt.Fprintf(out, "\n")

		choice, err := promptChoice(cmd, "Enter choice", len(tools))
		if err != nil {
			return err
		}
		selectedTool = tools[choice-1]
	}

	// If skills are not embedded, copy from filesystem into the embedded FS via
	// the Install function by loading them from the local skills/ directory.
	// For dev builds, we load from the filesystem directly.
	if !hasEmbeddedSkills() {
		err := loadSkillsFromFilesystem()
		if err != nil {
			return fmt.Errorf("failed to load skills from filesystem: %w", err)
		}
	}

	// Install skills.
	result, err := skills.Install(projectRoot, selectedTool)
	if err != nil {
		return err
	}

	if jsonOutput {
		printJSON(out, result)
		return nil
	}

	fmt.Fprintf(out, "\nInstalled %d skills for %s:\n\n", len(result.SkillsInstalled), result.Tool)
	for _, s := range result.SkillsInstalled {
		fmt.Fprintf(out, "  %s → %s\n", s.Name, s.Path)
	}
	fmt.Fprintf(out, "\nSkills directory: %s\n", result.TargetDir)
	return nil
}

// resolveProjectRoot determines the project root directory.
// If --data is set, the project root is the parent of the data directory.
// Otherwise, use the current working directory.
func resolveProjectRoot() (string, error) {
	if dataDir != "" {
		abs, err := filepath.Abs(dataDir)
		if err != nil {
			return "", fmt.Errorf("failed to resolve data directory: %w", err)
		}
		return filepath.Dir(abs), nil
	}

	// Check for FOLIO_DATA env var.
	if envData := os.Getenv("FOLIO_DATA"); envData != "" {
		abs, err := filepath.Abs(envData)
		if err != nil {
			return "", fmt.Errorf("failed to resolve FOLIO_DATA: %w", err)
		}
		return filepath.Dir(abs), nil
	}

	// Default: current working directory (assumes folio/ is a subdirectory).
	cwd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("failed to get working directory: %w", err)
	}
	return cwd, nil
}

// hasEmbeddedSkills checks whether the embedded skills FS has content.
func hasEmbeddedSkills() bool {
	entries, err := fs.ReadDir(skills.EmbeddedSkills, ".")
	if err != nil {
		return false
	}
	// Check if there's a "skills" top-level directory in the embedded FS.
	for _, e := range entries {
		if e.IsDir() && e.Name() == "skills" {
			return true
		}
	}
	return false
}

// checkSkillsAvailable checks whether skills are available from any source.
func checkSkillsAvailable() (bool, error) {
	// Check embedded first.
	if hasEmbeddedSkills() {
		return true, nil
	}

	// Check filesystem — look for skills/ relative to the binary or cwd.
	candidates := []string{}

	// Try relative to current working directory.
	if cwd, err := os.Getwd(); err == nil {
		candidates = append(candidates, filepath.Join(cwd, "skills"))
	}

	// Try relative to the binary location.
	if exe, err := os.Executable(); err == nil {
		candidates = append(candidates, filepath.Join(filepath.Dir(exe), "..", "skills"))
	}

	for _, dir := range candidates {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			return true, nil
		}
	}

	return false, nil
}

// loadSkillsFromFilesystem finds the skills/ directory on the filesystem and
// installs directly from there (for dev builds without embedded skills).
func loadSkillsFromFilesystem() error {
	// Find skills directory.
	candidates := []string{}

	if cwd, err := os.Getwd(); err == nil {
		candidates = append(candidates, filepath.Join(cwd, "skills"))
	}
	if exe, err := os.Executable(); err == nil {
		candidates = append(candidates, filepath.Join(filepath.Dir(exe), "..", "skills"))
	}

	for _, dir := range candidates {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			// Use os.DirFS to create an fs.FS, then set it as the skills source.
			skills.FilesystemSkillsDir = dir
			return nil
		}
	}

	return fmt.Errorf("skills/ directory not found")
}

// promptChoice reads a numeric choice from stdin.
func promptChoice(cmd *cobra.Command, prompt string, max int) (int, error) {
	reader := bufio.NewReader(cmd.InOrStdin())
	for {
		fmt.Fprintf(cmd.OutOrStdout(), "%s [1-%d]: ", prompt, max)
		input, err := reader.ReadString('\n')
		if err != nil {
			return 0, fmt.Errorf("failed to read input: %w", err)
		}
		input = strings.TrimSpace(input)
		choice, err := strconv.Atoi(input)
		if err != nil || choice < 1 || choice > max {
			fmt.Fprintf(cmd.OutOrStdout(), "Please enter a number between 1 and %d.\n", max)
			continue
		}
		return choice, nil
	}
}
