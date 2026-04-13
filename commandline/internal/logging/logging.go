// Package logging configures log output for the Folio server.
// In dev mode, logs are written to stderr (console).
// In production mode, logs are written to ~/.local/folio/logs/folio.log
// unless overridden with --log-dir.
package logging

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
)

const (
	defaultLogDir = ".local/folio/logs"
	logFile       = "folio.log"
)

// resolvedLogPath is set by Setup so LogPath can return it later.
var resolvedLogPath string

// Setup configures the global logger and returns the log writer.
//
// In dev mode (isDev=true), logs go to stderr.
// In production mode (isDev=false), logs go to a file. The directory
// defaults to ~/.local/folio/logs/ but can be overridden with logDirOverride.
//
// Returns the log writer and an optional closer. The caller should defer
// closer.Close() if it is non-nil.
func Setup(isDev bool, logDirOverride string) (io.Writer, io.Closer, error) {
	if isDev {
		log.SetOutput(os.Stderr)
		return os.Stderr, nil, nil
	}

	// Production: write to log file.
	dir, err := resolveLogDir(logDirOverride)
	if err != nil {
		return nil, nil, fmt.Errorf("logging: %w", err)
	}

	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, nil, fmt.Errorf("logging: failed to create log directory: %w", err)
	}

	path := filepath.Join(dir, logFile)
	resolvedLogPath = path

	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, nil, fmt.Errorf("logging: failed to open log file: %w", err)
	}

	log.SetOutput(f)
	return f, f, nil
}

// resolveLogDir returns the log directory, using the override if provided,
// otherwise falling back to ~/.local/folio/logs/.
func resolveLogDir(override string) (string, error) {
	if override != "" {
		abs, err := filepath.Abs(override)
		if err != nil {
			return "", fmt.Errorf("invalid log directory: %w", err)
		}
		return abs, nil
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("cannot determine home directory: %w", err)
	}
	return filepath.Join(home, defaultLogDir), nil
}

// LogPath returns the path where production logs are written.
// Returns a meaningful value only after Setup has been called in production mode.
func LogPath() string {
	if resolvedLogPath != "" {
		return resolvedLogPath
	}
	// Best-effort fallback if Setup hasn't been called yet.
	home, err := os.UserHomeDir()
	if err != nil {
		return "(unknown)"
	}
	return filepath.Join(home, defaultLogDir, logFile)
}
