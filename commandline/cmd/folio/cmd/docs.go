package cmd

import (
	"fmt"

	"github.com/briant-spindance/folio/internal/store"
	"github.com/spf13/cobra"
)

func init() {
	docsCmd.PersistentFlags().BoolVar(&jsonOutput, "json", false, "Output in JSON format")

	docsCmd.AddCommand(docsListCmd)
	docsCmd.AddCommand(docsGetCmd)

	rootCmd.AddCommand(docsCmd)
}

var docsCmd = &cobra.Command{
	Use:   "docs",
	Short: "Manage project documents",
	Long:  "List and view project documents (read-only).",
}

var docsListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all project documents",
	RunE:  runDocsList,
}

var docsGetCmd = &cobra.Command{
	Use:   "get [slug]",
	Short: "Get a project document by slug",
	Args:  cobra.ExactArgs(1),
	RunE:  runDocsGet,
}

func runDocsList(cmd *cobra.Command, args []string) error {
	paths := resolvePaths()
	if err := checkDataDir(paths); err != nil {
		return err
	}

	out := cmd.OutOrStdout()
	docStore := store.NewProjectDocStore(paths)
	docs := docStore.List()

	if jsonOutput {
		printJSON(out, docs)
		return nil
	}

	if len(docs) == 0 {
		fmt.Fprintln(out, "No project documents found.")
		return nil
	}

	tw := newTable(out)
	fmt.Fprintf(tw, "SLUG\tTITLE\tICON\n")
	for _, d := range docs {
		fmt.Fprintf(tw, "%s\t%s\t%s\n", d.Slug, d.Title, ptrStr(d.Icon, ""))
	}
	tw.Flush()
	return nil
}

func runDocsGet(cmd *cobra.Command, args []string) error {
	paths := resolvePaths()
	if err := checkDataDir(paths); err != nil {
		return err
	}

	out := cmd.OutOrStdout()
	docStore := store.NewProjectDocStore(paths)
	doc := docStore.Get(args[0])
	if doc == nil {
		return fmt.Errorf("document not found: %s", args[0])
	}

	if jsonOutput {
		printJSON(out, doc)
		return nil
	}

	fmt.Fprintf(out, "Title: %s\n", doc.Title)
	fmt.Fprintf(out, "Slug:  %s\n", doc.Slug)
	if doc.Icon != nil {
		fmt.Fprintf(out, "Icon:  %s\n", *doc.Icon)
	}
	fmt.Fprintln(out)
	fmt.Fprintln(out, doc.Body)
	return nil
}
