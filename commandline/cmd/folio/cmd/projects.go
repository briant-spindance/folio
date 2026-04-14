package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/briant-spindance/folio/internal/registry"
	"github.com/spf13/cobra"
)

// Flags for projects add.
var (
	projectAddName string
)

func init() {
	projectsCmd.PersistentFlags().BoolVar(&jsonOutput, "json", false, "Output in JSON format")

	// Add flags
	projectsAddCmd.Flags().StringVar(&projectAddName, "name", "", "Override project name (default: read from folio.yaml)")

	projectsCmd.AddCommand(projectsListCmd)
	projectsCmd.AddCommand(projectsAddCmd)
	projectsCmd.AddCommand(projectsRemoveCmd)
	projectsCmd.AddCommand(projectsActivateCmd)

	rootCmd.AddCommand(projectsCmd)
}

var projectsCmd = &cobra.Command{
	Use:     "projects",
	Aliases: []string{"project"},
	Short:   "Manage the project list",
	Long:    "List, add, remove, and activate projects in the Folio project list.",
	RunE:    runProjectsList, // Default to list when no subcommand given.
}

var projectsListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all registered projects",
	RunE:  runProjectsList,
}

var projectsAddCmd = &cobra.Command{
	Use:   "add <path>",
	Short: "Add a project to the project list",
	Long:  "Register a Folio project directory in the project list. The path should contain a folio.yaml file.",
	Args:  cobra.ExactArgs(1),
	RunE:  runProjectsAdd,
}

var projectsRemoveCmd = &cobra.Command{
	Use:   "remove <slug>",
	Short: "Remove a project from the project list",
	Args:  cobra.ExactArgs(1),
	RunE:  runProjectsRemove,
}

var projectsActivateCmd = &cobra.Command{
	Use:   "activate <slug>",
	Short: "Set the active project",
	Args:  cobra.ExactArgs(1),
	RunE:  runProjectsActivate,
}

// resolveProjectRegistry creates a Registry from the project list file only
// (no CWD discovery). Respects --projects flag if set.
func resolveProjectRegistry() (*registry.Registry, error) {
	var opts []registry.Option
	if projectList != "" {
		opts = append(opts, registry.WithProjectListPath(projectList))
	}
	// Pass empty cwdFolioDir and envDataDir — CLI project management
	// only works with the project-list.yaml file.
	reg, err := registry.New("", "", opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to load project list: %w\nRun 'folio projects add <path>' to register a project, or start the server with 'folio web' to auto-discover.", err)
	}
	return reg, nil
}

func runProjectsList(cmd *cobra.Command, args []string) error {
	out := cmd.OutOrStdout()

	var opts []registry.Option
	if projectList != "" {
		opts = append(opts, registry.WithProjectListPath(projectList))
	}

	// For list, we tolerate an empty registry — just show nothing.
	reg, _ := registry.New("", "", opts...)
	if reg == nil || reg.Count() == 0 {
		if jsonOutput {
			printJSON(out, map[string]interface{}{
				"active":   "",
				"projects": []interface{}{},
			})
			return nil
		}
		fmt.Fprintln(out, "No projects registered.")
		fmt.Fprintln(out, "Run 'folio projects add <path>' to register a project.")
		return nil
	}

	projects := reg.Projects()
	active := reg.Active()

	if jsonOutput {
		type jsonProject struct {
			Name   string `json:"name"`
			Slug   string `json:"slug"`
			Path   string `json:"path"`
			Active bool   `json:"active"`
		}
		jp := make([]jsonProject, len(projects))
		for i, p := range projects {
			jp[i] = jsonProject{
				Name:   p.Name,
				Slug:   p.Slug,
				Path:   p.Path,
				Active: p.Slug == active,
			}
		}
		printJSON(out, map[string]interface{}{
			"active":   active,
			"projects": jp,
		})
		return nil
	}

	tw := newTable(out)
	fmt.Fprintf(tw, "  \tNAME\tSLUG\tPATH\n")
	for _, p := range projects {
		marker := " "
		if p.Slug == active {
			marker = "*"
		}
		fmt.Fprintf(tw, "%s\t%s\t%s\t%s\n", marker, p.Name, p.Slug, p.Path)
	}
	tw.Flush()
	fmt.Fprintf(out, "\n  Config: %s\n", reg.FilePath())

	return nil
}

func runProjectsAdd(cmd *cobra.Command, args []string) error {
	out := cmd.OutOrStdout()
	projectPath := args[0]

	// Resolve to absolute path.
	abs, err := filepath.Abs(projectPath)
	if err != nil {
		return fmt.Errorf("invalid path: %w", err)
	}

	// Validate the directory exists.
	info, err := os.Stat(abs)
	if err != nil || !info.IsDir() {
		return fmt.Errorf("path does not exist or is not a directory: %s", abs)
	}

	// Validate it contains a folio.yaml.
	folioYaml := filepath.Join(abs, "folio.yaml")
	if _, err := os.Stat(folioYaml); os.IsNotExist(err) {
		return fmt.Errorf("no folio.yaml found at %s\nRun 'folio init --data %s' to initialize a project there.", abs, abs)
	}

	// Load existing registry (or create a fresh one if empty).
	var opts []registry.Option
	if projectList != "" {
		opts = append(opts, registry.WithProjectListPath(projectList))
	}
	reg, _ := registry.New("", "", opts...)
	if reg == nil {
		// No existing projects — create a minimal registry with the default file path.
		reg, _ = registry.New("", "", opts...)
	}

	// Ensure the config directory exists before persisting.
	if err := reg.EnsureConfigDir(); err != nil {
		return fmt.Errorf("failed to set up config directory: %w", err)
	}

	// Build the project to add.
	p := registry.Project{
		Name: projectAddName,
		Path: abs,
	}

	if err := reg.Add(p); err != nil {
		return err
	}

	// Re-fetch the project by path to get the resolved slug.
	added := reg.Get(registry.Slugify(func() string {
		if projectAddName != "" {
			return projectAddName
		}
		// The registry reads from folio.yaml internally.
		return ""
	}()))

	// If this is the only project, activate it.
	if reg.Count() == 1 {
		projects := reg.Projects()
		if err := reg.Activate(projects[0].Slug); err != nil {
			return fmt.Errorf("failed to activate project: %w", err)
		}
	}

	if jsonOutput {
		result := map[string]interface{}{
			"path":   abs,
			"config": reg.FilePath(),
		}
		if added != nil {
			result["name"] = added.Name
			result["slug"] = added.Slug
		}
		printJSON(out, result)
		return nil
	}

	fmt.Fprintf(out, "Added project at %s\n", abs)
	fmt.Fprintf(out, "  Config: %s\n", reg.FilePath())

	return nil
}

func runProjectsRemove(cmd *cobra.Command, args []string) error {
	out := cmd.OutOrStdout()
	slug := args[0]

	reg, err := resolveProjectRegistry()
	if err != nil {
		return err
	}

	project := reg.Get(slug)
	if project == nil {
		return fmt.Errorf("unknown project: %s", slug)
	}

	if err := reg.Remove(slug); err != nil {
		return err
	}

	if jsonOutput {
		printJSON(out, map[string]interface{}{
			"removed": slug,
			"name":    project.Name,
			"path":    project.Path,
			"config":  reg.FilePath(),
		})
		return nil
	}

	fmt.Fprintf(out, "Removed project %q (%s)\n", project.Name, project.Path)

	return nil
}

func runProjectsActivate(cmd *cobra.Command, args []string) error {
	out := cmd.OutOrStdout()
	slug := args[0]

	reg, err := resolveProjectRegistry()
	if err != nil {
		return err
	}

	project := reg.Get(slug)
	if project == nil {
		return fmt.Errorf("unknown project: %s\nRun 'folio projects list' to see available projects.", slug)
	}

	if err := reg.Activate(slug); err != nil {
		return err
	}

	if jsonOutput {
		printJSON(out, map[string]interface{}{
			"activated": slug,
			"name":      project.Name,
			"path":      project.Path,
		})
		return nil
	}

	fmt.Fprintf(out, "Activated project %q (%s)\n", project.Name, project.Path)

	return nil
}
