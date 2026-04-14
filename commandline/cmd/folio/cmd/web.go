package cmd

import (
	"bufio"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/briant-spindance/folio/internal/banner"
	"github.com/briant-spindance/folio/internal/logging"
	foliomdns "github.com/briant-spindance/folio/internal/mdns"
	"github.com/briant-spindance/folio/internal/registry"
	"github.com/briant-spindance/folio/internal/server"
	"github.com/briant-spindance/folio/internal/store"
	"github.com/spf13/cobra"
	"golang.org/x/term"
)

const defaultMDNSHost = "folio"

var (
	port        int
	staticDir   string
	mdnsHost    string
	projectList string
)

func init() {
	webCmd.Flags().IntVar(&port, "port", 2600, "Port to listen on")
	webCmd.Flags().StringVar(&staticDir, "static", "", "Path to the frontend dist directory (default: embedded)")
	webCmd.Flags().StringVar(&mdnsHost, "mdns", "", "Enable mDNS discovery with optional hostname (default: folio.local when flag is present)")
	webCmd.Flags().StringVar(&projectList, "projects", "", "Path to a project-list.yaml file (default: ~/.local/folio/project-list.yaml)")

	// NoOptDefVal makes --mdns work without a value (bare flag).
	// When the user passes just --mdns, the value is set to defaultMDNSHost.
	// When the user passes --mdns=something, the value is "something".
	webCmd.Flags().Lookup("mdns").NoOptDefVal = defaultMDNSHost

	rootCmd.AddCommand(webCmd)
}

var webCmd = &cobra.Command{
	Use:   "web",
	Short: "Start the Folio web server",
	Long:  "Start the Folio web server, serving the API and optional frontend SPA.",
	RunE:  runWeb,
}

func runWeb(cmd *cobra.Command, args []string) error {
	banner.Print(Version)

	// Configure logging based on build mode.
	isDev := !IsProduction
	logWriter, logCloser, err := logging.Setup(isDev, logDir)
	if err != nil {
		return fmt.Errorf("failed to configure logging: %w", err)
	}
	if logCloser != nil {
		defer logCloser.Close()
	}

	// Resolve data directory override from flag / env.
	envDataDir := dataDir
	if envDataDir == "" {
		envDataDir = os.Getenv("FOLIO_DATA")
	}

	// Discover projects via the registry.
	defaultRoot := filepath.Join(".", "folio")
	var regOpts []registry.Option
	if projectList != "" {
		regOpts = append(regOpts, registry.WithProjectListPath(projectList))
	}
	reg, err := registry.New(defaultRoot, envDataDir, regOpts...)
	if err != nil {
		return fmt.Errorf("project discovery failed: %w\nSet FOLIO_DATA env var, use --data flag, or add projects to ~/.local/folio/project-list.yaml", err)
	}

	// Eagerly create ~/.local/folio/ and project-list.yaml on first run.
	if err := reg.EnsureConfigDir(); err != nil {
		log.Printf("Warning: %v", err)
	}

	// If a local ./folio directory was discovered that isn't in the project list,
	// offer to register it.
	if discovered := reg.NewlyDiscovered(); discovered != nil {
		if isInteractive() {
			promptRegisterProject(reg, discovered)
		} else {
			fmt.Printf("  Local project %q found at %s. Run 'folio projects add %s' to register it.\n",
				discovered.Name, discovered.Path, discovered.Path)
		}
	}

	// Build the store manager for the active project.
	activeProj := reg.Get(reg.Active())
	if activeProj == nil {
		return fmt.Errorf("no active project found")
	}
	paths := store.NewPaths(activeProj.Path)
	mgr := store.NewManager(paths)

	// Resolve frontend filesystem.
	frontendFS := resolveFrontendFS()

	// Build the router with the configured log writer.
	r := server.New(reg, mgr, frontendFS, logWriter)

	// Start mDNS if requested.
	if mdnsHost != "" {
		hostname := normalizeMDNSHost(mdnsHost)
		shutdown, err := foliomdns.Advertise(hostname, port)
		if err != nil {
			log.Printf("Warning: failed to start mDNS: %v", err)
		} else {
			defer shutdown()
			fmt.Printf("  Folio server running at http://%s:%d\n", hostname, port)
		}
	}

	addr := fmt.Sprintf(":%d", port)
	fmt.Printf("  Folio server running at http://localhost:%d\n", port)

	projects := reg.Projects()
	fmt.Printf("  Projects: %d\n", len(projects))
	for _, p := range projects {
		marker := "  "
		if p.Slug == reg.Active() {
			marker = "* "
		}
		fmt.Printf("    %s%s (%s)\n", marker, p.Name, p.Path)
	}

	if IsProduction {
		fmt.Printf("  Logs: %s\n", logging.LogPath())
	}

	if err := http.ListenAndServe(addr, r); err != nil {
		return fmt.Errorf("server error: %w", err)
	}
	return nil
}

// normalizeMDNSHost ensures the hostname ends with .local.
func normalizeMDNSHost(host string) string {
	host = strings.TrimSpace(host)
	if !strings.HasSuffix(host, ".local") {
		host += ".local"
	}
	return host
}

// resolveFrontendFS tries multiple sources for the frontend filesystem.
func resolveFrontendFS() fs.FS {
	// Try --static flag first.
	if staticDir != "" {
		if _, err := os.Stat(staticDir); err == nil {
			fmt.Printf("  Serving frontend from: %s\n", staticDir)
			return os.DirFS(staticDir)
		}
		log.Printf("Warning: Static directory not found: %s", staticDir)
	}

	// Try embedded FS.
	if sub, err := fs.Sub(EmbeddedDist, "dist"); err == nil {
		if f, err := sub.Open("index.html"); err == nil {
			f.Close()
			fmt.Println("  Serving frontend from: embedded")
			return sub
		}
	}

	// Fallback: try ../frontend/dist relative to the binary.
	exe, _ := os.Executable()
	fallbackDir := filepath.Join(filepath.Dir(exe), "..", "frontend", "dist")
	if _, err := os.Stat(filepath.Join(fallbackDir, "index.html")); err == nil {
		fmt.Printf("  Serving frontend from: %s\n", fallbackDir)
		return os.DirFS(fallbackDir)
	}

	fmt.Println("  Warning: No frontend files found. API-only mode.")
	fmt.Println("  Use --static flag to specify the frontend dist directory.")
	return nil
}

// isInteractive returns true if stdin is connected to a terminal.
func isInteractive() bool {
	return term.IsTerminal(int(os.Stdin.Fd()))
}

// promptRegisterProject asks the user whether to add a discovered local
// project to the project-list.yaml.
func promptRegisterProject(reg *registry.Registry, p *registry.Project) {
	fmt.Printf("  Found local project %q at %s\n", p.Name, p.Path)
	fmt.Print("  Add to project list? [Y/n] ")

	scanner := bufio.NewScanner(os.Stdin)
	if scanner.Scan() {
		answer := strings.TrimSpace(strings.ToLower(scanner.Text()))
		if answer == "" || answer == "y" || answer == "yes" {
			if err := reg.Add(*p); err != nil {
				fmt.Printf("  Warning: failed to register project: %v\n", err)
			} else {
				fmt.Printf("  Registered %q in %s\n", p.Name, reg.FilePath())
			}
		}
	}
}
