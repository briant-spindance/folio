package main

import (
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/briantol/forge/internal/server"
	"github.com/briantol/forge/internal/store"
)

func main() {
	port := flag.Int("port", 3001, "Port to listen on")
	dataDir := flag.String("data", "", "Path to the Forge data directory (overrides FORGE_DATA env var)")
	staticDir := flag.String("static", "", "Path to the frontend dist directory (default: embedded)")
	flag.Parse()

	// Resolve data directory
	if *dataDir != "" {
		os.Setenv("FORGE_DATA", *dataDir)
	}

	defaultRoot := filepath.Join(".", "testdata", "forge")
	paths := store.ResolvePaths(defaultRoot)

	// Verify data directory exists
	if _, err := os.Stat(paths.Root); os.IsNotExist(err) {
		log.Fatalf("Data directory does not exist: %s\nSet FORGE_DATA env var or use --data flag", paths.Root)
	}

	// Resolve frontend filesystem
	var frontendFS fs.FS

	// Try --static flag first
	if *staticDir != "" {
		if _, err := os.Stat(*staticDir); err == nil {
			frontendFS = os.DirFS(*staticDir)
			fmt.Printf("  Serving frontend from: %s\n", *staticDir)
		} else {
			log.Printf("Warning: Static directory not found: %s", *staticDir)
		}
	}

	// Try embedded FS
	if frontendFS == nil {
		if sub, err := fs.Sub(embeddedDist, "dist"); err == nil {
			// Check if there's actually an index.html in the embedded FS
			if f, err := sub.Open("index.html"); err == nil {
				f.Close()
				frontendFS = sub
				fmt.Println("  Serving frontend from: embedded")
			}
		}
	}

	// Fallback: try ../frontend/dist relative to the binary
	if frontendFS == nil {
		exe, _ := os.Executable()
		fallbackDir := filepath.Join(filepath.Dir(exe), "..", "frontend", "dist")
		if _, err := os.Stat(filepath.Join(fallbackDir, "index.html")); err == nil {
			frontendFS = os.DirFS(fallbackDir)
			fmt.Printf("  Serving frontend from: %s\n", fallbackDir)
		}
	}

	if frontendFS == nil {
		fmt.Println("  Warning: No frontend files found. API-only mode.")
		fmt.Println("  Use --static flag to specify the frontend dist directory.")
	}

	r := server.New(paths, frontendFS)

	addr := fmt.Sprintf(":%d", *port)
	fmt.Printf("  Forge server running at http://localhost:%d\n", *port)
	fmt.Printf("  Data directory: %s\n", paths.Root)

	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal(err)
	}
}
