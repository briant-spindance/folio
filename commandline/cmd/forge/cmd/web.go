package cmd

import (
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	forgemdns "github.com/briantol/forge/internal/mdns"
	"github.com/briantol/forge/internal/server"
	"github.com/briantol/forge/internal/store"
	"github.com/spf13/cobra"
)

const defaultMDNSHost = "forge"

var (
	port      int
	dataDir   string
	staticDir string
	mdnsHost  string
)

func init() {
	webCmd.Flags().IntVar(&port, "port", 3001, "Port to listen on")
	webCmd.Flags().StringVar(&dataDir, "data", "", "Path to the Forge data directory (overrides FORGE_DATA env var)")
	webCmd.Flags().StringVar(&staticDir, "static", "", "Path to the frontend dist directory (default: embedded)")
	webCmd.Flags().StringVar(&mdnsHost, "mdns", "", "Enable mDNS discovery with optional hostname (default: forge.local when flag is present)")

	// NoOptDefVal makes --mdns work without a value (bare flag).
	// When the user passes just --mdns, the value is set to defaultMDNSHost.
	// When the user passes --mdns=something, the value is "something".
	webCmd.Flags().Lookup("mdns").NoOptDefVal = defaultMDNSHost

	rootCmd.AddCommand(webCmd)
}

var webCmd = &cobra.Command{
	Use:   "web",
	Short: "Start the Forge web server",
	Long:  "Start the Forge web server, serving the API and optional frontend SPA.",
	RunE:  runWeb,
}

func runWeb(cmd *cobra.Command, args []string) error {
	// Resolve data directory.
	if dataDir != "" {
		os.Setenv("FORGE_DATA", dataDir)
	}

	defaultRoot := filepath.Join(".", "testdata", "forge")
	paths := store.ResolvePaths(defaultRoot)

	// Verify data directory exists.
	if _, err := os.Stat(paths.Root); os.IsNotExist(err) {
		return fmt.Errorf("data directory does not exist: %s\nSet FORGE_DATA env var or use --data flag", paths.Root)
	}

	// Resolve frontend filesystem.
	frontendFS := resolveFrontendFS()

	// Build the router.
	r := server.New(paths, frontendFS)

	// Start mDNS if requested.
	if mdnsHost != "" {
		hostname := normalizeMDNSHost(mdnsHost)
		shutdown, err := forgemdns.Advertise(hostname, port)
		if err != nil {
			log.Printf("Warning: failed to start mDNS: %v", err)
		} else {
			defer shutdown()
			fmt.Printf("  Forge server running at http://%s:%d\n", hostname, port)
		}
	}

	addr := fmt.Sprintf(":%d", port)
	fmt.Printf("  Forge server running at http://localhost:%d\n", port)
	fmt.Printf("  Data directory: %s\n", paths.Root)

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
