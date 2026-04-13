package cmd

import (
	"fmt"
	"strings"

	"github.com/briant-spindance/folio/internal/model"
	"github.com/briant-spindance/folio/internal/store"
	"github.com/spf13/cobra"
)

// Flags for issues list filtering.
var (
	issueStatus   []string
	issueType     []string
	issuePriority []string
	issueAssignee string
	issueFeature  string
	issueLabels   []string
	issueSort     string
	issueDir      string
	issueLimit    int
	issuePage     int
)

// Flags for issues create.
var (
	issueCreateType     string
	issueCreatePriority string
	issueCreateBody     string
	issueCreateFeature  string
)

// Flags for issues update.
var (
	issueUpdateTitle    string
	issueUpdateStatus   string
	issueUpdateType     string
	issueUpdatePriority string
	issueUpdateBody     string
	issueUpdateFeature  string
	issueUpdateLabels   string
)

func init() {
	issuesCmd.PersistentFlags().BoolVar(&jsonOutput, "json", false, "Output in JSON format")

	// List flags
	issuesListCmd.Flags().StringSliceVar(&issueStatus, "status", nil, "Filter by status (comma-separated: open,in-progress,closed)")
	issuesListCmd.Flags().StringSliceVar(&issueType, "type", nil, "Filter by type (comma-separated: bug,task,improvement,chore)")
	issuesListCmd.Flags().StringSliceVar(&issuePriority, "priority", nil, "Filter by priority (comma-separated: critical,high,medium,low)")
	issuesListCmd.Flags().StringVar(&issueAssignee, "assignee", "", "Filter by assignee")
	issuesListCmd.Flags().StringVar(&issueFeature, "feature", "", "Filter by linked feature slug")
	issuesListCmd.Flags().StringSliceVar(&issueLabels, "labels", nil, "Filter by labels (comma-separated)")
	issuesListCmd.Flags().StringVar(&issueSort, "sort", "order", "Sort by field (order,title,status,type,priority,modified)")
	issuesListCmd.Flags().StringVar(&issueDir, "dir", "asc", "Sort direction (asc,desc)")
	issuesListCmd.Flags().IntVar(&issueLimit, "limit", 50, "Max items per page")
	issuesListCmd.Flags().IntVar(&issuePage, "page", 1, "Page number")

	// Create flags
	issuesCreateCmd.Flags().StringVar(&issueCreateType, "type", "", "Issue type (bug,task,improvement,chore)")
	issuesCreateCmd.Flags().StringVar(&issueCreatePriority, "priority", "", "Priority (critical,high,medium,low)")
	issuesCreateCmd.Flags().StringVar(&issueCreateBody, "body", "", "Issue body (markdown)")
	issuesCreateCmd.Flags().StringVar(&issueCreateFeature, "feature", "", "Linked feature slug")

	// Update flags
	issuesUpdateCmd.Flags().StringVar(&issueUpdateTitle, "title", "", "New title")
	issuesUpdateCmd.Flags().StringVar(&issueUpdateStatus, "status", "", "New status (open,in-progress,closed)")
	issuesUpdateCmd.Flags().StringVar(&issueUpdateType, "type", "", "New type (bug,task,improvement,chore)")
	issuesUpdateCmd.Flags().StringVar(&issueUpdatePriority, "priority", "", "New priority (critical,high,medium,low)")
	issuesUpdateCmd.Flags().StringVar(&issueUpdateBody, "body", "", "New body (markdown)")
	issuesUpdateCmd.Flags().StringVar(&issueUpdateFeature, "feature", "", "Linked feature slug (empty to unlink)")
	issuesUpdateCmd.Flags().StringVar(&issueUpdateLabels, "labels", "", "Set labels (comma-separated, use empty string to clear)")

	issuesCmd.AddCommand(issuesListCmd)
	issuesCmd.AddCommand(issuesGetCmd)
	issuesCmd.AddCommand(issuesCreateCmd)
	issuesCmd.AddCommand(issuesUpdateCmd)
	issuesCmd.AddCommand(issuesDeleteCmd)

	rootCmd.AddCommand(issuesCmd)
}

var issuesCmd = &cobra.Command{
	Use:     "issues",
	Aliases: []string{"issue"},
	Short:   "Manage issues",
	Long:    "List, view, create, update, and delete project issues.",
}

var issuesListCmd = &cobra.Command{
	Use:   "list",
	Short: "List issues",
	RunE:  runIssuesList,
}

var issuesGetCmd = &cobra.Command{
	Use:   "get [slug]",
	Short: "Get an issue by slug",
	Args:  cobra.ExactArgs(1),
	RunE:  runIssuesGet,
}

var issuesCreateCmd = &cobra.Command{
	Use:   "create [title]",
	Short: "Create a new issue",
	Args:  cobra.ExactArgs(1),
	RunE:  runIssuesCreate,
}

var issuesUpdateCmd = &cobra.Command{
	Use:   "update [slug]",
	Short: "Update an existing issue",
	Args:  cobra.ExactArgs(1),
	RunE:  runIssuesUpdate,
}

var issuesDeleteCmd = &cobra.Command{
	Use:   "delete [slug]",
	Short: "Delete an issue",
	Args:  cobra.ExactArgs(1),
	RunE:  runIssuesDelete,
}

func runIssuesList(cmd *cobra.Command, args []string) error {
	paths := resolvePaths()
	if err := checkDataDir(paths); err != nil {
		return err
	}

	out := cmd.OutOrStdout()
	params := model.ListIssuesParams{
		Page:     issuePage,
		Limit:    issueLimit,
		Status:   issueStatus,
		Type:     issueType,
		Priority: issuePriority,
		Labels:   issueLabels,
		Sort:     issueSort,
		Dir:      issueDir,
	}
	if issueAssignee != "" {
		params.Assignee = &issueAssignee
	}
	if issueFeature != "" {
		params.Feature = &issueFeature
	}

	issueStore := store.NewIssueStore(paths)
	result := issueStore.List(params)

	if jsonOutput {
		printJSON(out, result)
		return nil
	}

	if len(result.Issues) == 0 {
		fmt.Fprintln(out, "No issues found.")
		return nil
	}

	tw := newTable(out)
	fmt.Fprintf(tw, "SLUG\tTITLE\tSTATUS\tTYPE\tPRIORITY\tASSIGNEES\n")
	for _, issue := range result.Issues {
		assignees := strings.Join(issue.Assignees, ", ")
		if assignees == "" {
			assignees = "-"
		}
		fmt.Fprintf(tw, "%s\t%s\t%s\t%s\t%s\t%s\n",
			issue.Slug,
			truncate(issue.Title, 40),
			issue.Status,
			issue.Type,
			issue.Priority,
			assignees,
		)
	}
	tw.Flush()

	if result.TotalPages > 1 {
		fmt.Fprintf(out, "\nPage %d of %d (%d total)\n", result.Page, result.TotalPages, result.Total)
	}
	return nil
}

func runIssuesGet(cmd *cobra.Command, args []string) error {
	paths := resolvePaths()
	if err := checkDataDir(paths); err != nil {
		return err
	}

	out := cmd.OutOrStdout()
	issueStore := store.NewIssueStore(paths)
	issue := issueStore.Get(args[0])
	if issue == nil {
		return fmt.Errorf("issue not found: %s", args[0])
	}

	if jsonOutput {
		printJSON(out, issue)
		return nil
	}

	fmt.Fprintf(out, "Title:     %s\n", issue.Title)
	fmt.Fprintf(out, "Slug:      %s\n", issue.Slug)
	fmt.Fprintf(out, "Status:    %s\n", issue.Status)
	fmt.Fprintf(out, "Type:      %s\n", issue.Type)
	fmt.Fprintf(out, "Priority:  %s\n", issue.Priority)
	fmt.Fprintf(out, "Assignees: %s\n", strings.Join(issue.Assignees, ", "))
	fmt.Fprintf(out, "Points:    %s\n", ptrFloat(issue.Points, "-"))
	fmt.Fprintf(out, "Feature:   %s\n", ptrStr(issue.Feature, "-"))
	fmt.Fprintf(out, "Labels:    %s\n", strings.Join(issue.Labels, ", "))
	fmt.Fprintf(out, "Created:   %s\n", issue.Created)
	fmt.Fprintf(out, "Modified:  %s\n", issue.Modified)
	if issue.Body != "" {
		fmt.Fprintln(out)
		fmt.Fprintln(out, issue.Body)
	}
	return nil
}

func runIssuesCreate(cmd *cobra.Command, args []string) error {
	paths := resolvePaths()
	if err := checkDataDir(paths); err != nil {
		return err
	}

	out := cmd.OutOrStdout()
	input := model.CreateIssueInput{
		Title: args[0],
	}
	if issueCreateType != "" {
		input.Type = &issueCreateType
	}
	if issueCreatePriority != "" {
		input.Priority = &issueCreatePriority
	}
	if issueCreateBody != "" {
		input.Body = &issueCreateBody
	}
	if issueCreateFeature != "" {
		input.Feature = &issueCreateFeature
	}

	issueStore := store.NewIssueStore(paths)
	issue, err := issueStore.Create(input)
	if err != nil {
		return fmt.Errorf("failed to create issue: %w", err)
	}

	if jsonOutput {
		printJSON(out, issue)
		return nil
	}

	fmt.Fprintf(out, "Created issue: %s (%s)\n", issue.Title, issue.Slug)
	return nil
}

func runIssuesUpdate(cmd *cobra.Command, args []string) error {
	paths := resolvePaths()
	if err := checkDataDir(paths); err != nil {
		return err
	}

	out := cmd.OutOrStdout()
	input := model.UpdateIssueInput{}
	changed := false

	if cmd.Flags().Changed("title") {
		input.Title = &issueUpdateTitle
		changed = true
	}
	if cmd.Flags().Changed("status") {
		input.Status = &issueUpdateStatus
		changed = true
	}
	if cmd.Flags().Changed("type") {
		input.Type = &issueUpdateType
		changed = true
	}
	if cmd.Flags().Changed("priority") {
		input.Priority = &issueUpdatePriority
		changed = true
	}
	if cmd.Flags().Changed("body") {
		input.Body = &issueUpdateBody
		changed = true
	}
	if cmd.Flags().Changed("feature") {
		input.FeatureSet = true
		if issueUpdateFeature == "" {
			input.Feature = nil
		} else {
			input.Feature = &issueUpdateFeature
		}
		changed = true
	}
	if cmd.Flags().Changed("labels") {
		input.LabelsSet = true
		if issueUpdateLabels == "" {
			input.Labels = []string{}
		} else {
			input.Labels = strings.Split(issueUpdateLabels, ",")
		}
		changed = true
	}

	if !changed {
		return fmt.Errorf("no update flags provided; use --title, --status, --type, --priority, --body, --feature, or --labels")
	}

	issueStore := store.NewIssueStore(paths)
	issue, err := issueStore.Update(args[0], input)
	if err != nil {
		return fmt.Errorf("failed to update issue: %w", err)
	}
	if issue == nil {
		return fmt.Errorf("issue not found: %s", args[0])
	}

	if jsonOutput {
		printJSON(out, issue)
		return nil
	}

	fmt.Fprintf(out, "Updated issue: %s (%s)\n", issue.Title, issue.Slug)
	return nil
}

func runIssuesDelete(cmd *cobra.Command, args []string) error {
	paths := resolvePaths()
	if err := checkDataDir(paths); err != nil {
		return err
	}

	out := cmd.OutOrStdout()
	issueStore := store.NewIssueStore(paths)
	if !issueStore.Delete(args[0]) {
		return fmt.Errorf("issue not found: %s", args[0])
	}

	if jsonOutput {
		printJSON(out, map[string]string{"deleted": args[0]})
		return nil
	}

	fmt.Fprintf(out, "Deleted issue: %s\n", args[0])
	return nil
}
