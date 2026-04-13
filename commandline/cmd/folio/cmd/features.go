package cmd

import (
	"fmt"
	"strings"

	"github.com/briant-spindance/folio/internal/model"
	"github.com/briant-spindance/folio/internal/store"
	"github.com/spf13/cobra"
)

// Flags for features list filtering.
var (
	featStatus   []string
	featPriority []string
	featAssignee string
	featTags     []string
	featSort     string
	featDir      string
	featLimit    int
	featPage     int
)

// Flags for features create.
var (
	featCreatePriority string
	featCreateBody     string
)

// Flags for features update.
var (
	featUpdateTitle    string
	featUpdateStatus   string
	featUpdatePriority string
	featUpdateBody     string
	featUpdateTags     string
)

func init() {
	featuresCmd.PersistentFlags().BoolVar(&jsonOutput, "json", false, "Output in JSON format")

	// List flags
	featuresListCmd.Flags().StringSliceVar(&featStatus, "status", nil, "Filter by status (comma-separated: draft,ready,in-progress,review,done,deferred)")
	featuresListCmd.Flags().StringSliceVar(&featPriority, "priority", nil, "Filter by priority (comma-separated: critical,high,medium,low)")
	featuresListCmd.Flags().StringVar(&featAssignee, "assignee", "", "Filter by assignee")
	featuresListCmd.Flags().StringSliceVar(&featTags, "tags", nil, "Filter by tags (comma-separated)")
	featuresListCmd.Flags().StringVar(&featSort, "sort", "order", "Sort by field (order,title,status,priority,modified)")
	featuresListCmd.Flags().StringVar(&featDir, "dir", "asc", "Sort direction (asc,desc)")
	featuresListCmd.Flags().IntVar(&featLimit, "limit", 50, "Max items per page")
	featuresListCmd.Flags().IntVar(&featPage, "page", 1, "Page number")

	// Create flags
	featuresCreateCmd.Flags().StringVar(&featCreatePriority, "priority", "", "Priority (critical,high,medium,low)")
	featuresCreateCmd.Flags().StringVar(&featCreateBody, "body", "", "Feature body (markdown)")

	// Update flags
	featuresUpdateCmd.Flags().StringVar(&featUpdateTitle, "title", "", "New title")
	featuresUpdateCmd.Flags().StringVar(&featUpdateStatus, "status", "", "New status (draft,ready,in-progress,review,done,deferred)")
	featuresUpdateCmd.Flags().StringVar(&featUpdatePriority, "priority", "", "New priority (critical,high,medium,low)")
	featuresUpdateCmd.Flags().StringVar(&featUpdateBody, "body", "", "New body (markdown)")
	featuresUpdateCmd.Flags().StringVar(&featUpdateTags, "tags", "", "Set tags (comma-separated, use empty string to clear)")

	featuresCmd.AddCommand(featuresListCmd)
	featuresCmd.AddCommand(featuresGetCmd)
	featuresCmd.AddCommand(featuresCreateCmd)
	featuresCmd.AddCommand(featuresUpdateCmd)
	featuresCmd.AddCommand(featuresDeleteCmd)

	rootCmd.AddCommand(featuresCmd)
}

var featuresCmd = &cobra.Command{
	Use:     "features",
	Aliases: []string{"feature"},
	Short:   "Manage features",
	Long:    "List, view, create, update, and delete product features.",
}

var featuresListCmd = &cobra.Command{
	Use:   "list",
	Short: "List features",
	RunE:  runFeaturesList,
}

var featuresGetCmd = &cobra.Command{
	Use:   "get [slug]",
	Short: "Get a feature by slug",
	Args:  cobra.ExactArgs(1),
	RunE:  runFeaturesGet,
}

var featuresCreateCmd = &cobra.Command{
	Use:   "create [title]",
	Short: "Create a new feature",
	Args:  cobra.ExactArgs(1),
	RunE:  runFeaturesCreate,
}

var featuresUpdateCmd = &cobra.Command{
	Use:   "update [slug]",
	Short: "Update an existing feature",
	Args:  cobra.ExactArgs(1),
	RunE:  runFeaturesUpdate,
}

var featuresDeleteCmd = &cobra.Command{
	Use:   "delete [slug]",
	Short: "Delete a feature",
	Args:  cobra.ExactArgs(1),
	RunE:  runFeaturesDelete,
}

func runFeaturesList(cmd *cobra.Command, args []string) error {
	paths := resolvePaths()
	if err := checkDataDir(paths); err != nil {
		return err
	}

	out := cmd.OutOrStdout()
	params := model.ListFeaturesParams{
		Page:     featPage,
		Limit:    featLimit,
		Status:   featStatus,
		Priority: featPriority,
		Tags:     featTags,
		Sort:     featSort,
		Dir:      featDir,
	}
	if featAssignee != "" {
		params.Assignee = &featAssignee
	}

	featureStore := store.NewFeatureStore(paths)
	result := featureStore.List(params)

	if jsonOutput {
		printJSON(out, result)
		return nil
	}

	if len(result.Features) == 0 {
		fmt.Fprintln(out, "No features found.")
		return nil
	}

	tw := newTable(out)
	fmt.Fprintf(tw, "SLUG\tTITLE\tSTATUS\tPRIORITY\tASSIGNEES\tPOINTS\n")
	for _, f := range result.Features {
		assignees := strings.Join(f.Assignees, ", ")
		if assignees == "" {
			assignees = "-"
		}
		fmt.Fprintf(tw, "%s\t%s\t%s\t%s\t%s\t%s\n",
			f.Slug,
			truncate(f.Title, 40),
			f.Status,
			f.Priority,
			assignees,
			ptrFloat(f.Points, "-"),
		)
	}
	tw.Flush()

	if result.TotalPages > 1 {
		fmt.Fprintf(out, "\nPage %d of %d (%d total)\n", result.Page, result.TotalPages, result.Total)
	}
	return nil
}

func runFeaturesGet(cmd *cobra.Command, args []string) error {
	paths := resolvePaths()
	if err := checkDataDir(paths); err != nil {
		return err
	}

	out := cmd.OutOrStdout()
	featureStore := store.NewFeatureStore(paths)
	f := featureStore.Get(args[0])
	if f == nil {
		return fmt.Errorf("feature not found: %s", args[0])
	}

	if jsonOutput {
		printJSON(out, f)
		return nil
	}

	fmt.Fprintf(out, "Title:     %s\n", f.Title)
	fmt.Fprintf(out, "Slug:      %s\n", f.Slug)
	fmt.Fprintf(out, "Status:    %s\n", f.Status)
	fmt.Fprintf(out, "Priority:  %s\n", f.Priority)
	fmt.Fprintf(out, "Assignees: %s\n", strings.Join(f.Assignees, ", "))
	fmt.Fprintf(out, "Points:    %s\n", ptrFloat(f.Points, "-"))
	fmt.Fprintf(out, "Tags:      %s\n", strings.Join(f.Tags, ", "))
	fmt.Fprintf(out, "Created:   %s\n", f.Created)
	fmt.Fprintf(out, "Modified:  %s\n", f.Modified)
	if f.Body != "" {
		fmt.Fprintln(out)
		fmt.Fprintln(out, f.Body)
	}
	return nil
}

func runFeaturesCreate(cmd *cobra.Command, args []string) error {
	paths := resolvePaths()
	if err := checkDataDir(paths); err != nil {
		return err
	}

	out := cmd.OutOrStdout()
	input := model.CreateFeatureInput{
		Title: args[0],
	}
	if featCreatePriority != "" {
		input.Priority = &featCreatePriority
	}
	if featCreateBody != "" {
		input.Body = &featCreateBody
	}

	featureStore := store.NewFeatureStore(paths)
	f, err := featureStore.Create(input)
	if err != nil {
		return fmt.Errorf("failed to create feature: %w", err)
	}

	if jsonOutput {
		printJSON(out, f)
		return nil
	}

	fmt.Fprintf(out, "Created feature: %s (%s)\n", f.Title, f.Slug)
	return nil
}

func runFeaturesUpdate(cmd *cobra.Command, args []string) error {
	paths := resolvePaths()
	if err := checkDataDir(paths); err != nil {
		return err
	}

	out := cmd.OutOrStdout()
	input := model.UpdateFeatureInput{}
	changed := false

	if cmd.Flags().Changed("title") {
		input.Title = &featUpdateTitle
		changed = true
	}
	if cmd.Flags().Changed("status") {
		input.Status = &featUpdateStatus
		changed = true
	}
	if cmd.Flags().Changed("priority") {
		input.Priority = &featUpdatePriority
		changed = true
	}
	if cmd.Flags().Changed("body") {
		input.Body = &featUpdateBody
		changed = true
	}
	if cmd.Flags().Changed("tags") {
		input.TagsSet = true
		if featUpdateTags == "" {
			input.Tags = []string{}
		} else {
			input.Tags = strings.Split(featUpdateTags, ",")
		}
		changed = true
	}

	if !changed {
		return fmt.Errorf("no update flags provided; use --title, --status, --priority, --body, or --tags")
	}

	featureStore := store.NewFeatureStore(paths)
	f, err := featureStore.Update(args[0], input)
	if err != nil {
		return fmt.Errorf("failed to update feature: %w", err)
	}
	if f == nil {
		return fmt.Errorf("feature not found: %s", args[0])
	}

	if jsonOutput {
		printJSON(out, f)
		return nil
	}

	fmt.Fprintf(out, "Updated feature: %s (%s)\n", f.Title, f.Slug)
	return nil
}

func runFeaturesDelete(cmd *cobra.Command, args []string) error {
	paths := resolvePaths()
	if err := checkDataDir(paths); err != nil {
		return err
	}

	out := cmd.OutOrStdout()
	featureStore := store.NewFeatureStore(paths)
	if !featureStore.Delete(args[0]) {
		return fmt.Errorf("feature not found: %s", args[0])
	}

	if jsonOutput {
		printJSON(out, map[string]string{"deleted": args[0]})
		return nil
	}

	fmt.Fprintf(out, "Deleted feature: %s\n", args[0])
	return nil
}
