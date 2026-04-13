package cmd

import (
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/briant-spindance/folio/internal/logging"
	foliomdns "github.com/briant-spindance/folio/internal/mdns"
	"github.com/briant-spindance/folio/internal/server"
	"github.com/briant-spindance/folio/internal/store"
	"github.com/spf13/cobra"
)

const defaultMDNSHost = "folio"

var (
	port      int
	staticDir string
	mdnsHost  string
)

func init() {
	webCmd.Flags().IntVar(&port, "port", 2600, "Port to listen on")
	webCmd.Flags().StringVar(&staticDir, "static", "", "Path to the frontend dist directory (default: embedded)")
	webCmd.Flags().StringVar(&mdnsHost, "mdns", "", "Enable mDNS discovery with optional hostname (default: folio.local when flag is present)")

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
	// Configure logging based on build mode.
	isDev := !IsProduction
	logWriter, logCloser, err := logging.Setup(isDev, logDir)
	if err != nil {
		return fmt.Errorf("failed to configure logging: %w", err)
	}
	if logCloser != nil {
		defer logCloser.Close()
	}

	// Resolve data directory.
	if dataDir != "" {
		os.Setenv("FOLIO_DATA", dataDir)
	}

	defaultRoot := filepath.Join(".", "folio")
	paths := store.ResolvePaths(defaultRoot)

	// Verify data directory exists.
	if _, err := os.Stat(paths.Root); os.IsNotExist(err) {
		return fmt.Errorf("data directory does not exist: %s\nSet FOLIO_DATA env var or use --data flag", paths.Root)
	}

	// Resolve frontend filesystem.
	frontendFS := resolveFrontendFS()

	// Build the router with the configured log writer.
	r := server.New(paths, frontendFS, logWriter)

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
	fmt.Printf("  Data directory: %s\n", paths.Root)
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
