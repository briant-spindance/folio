// Package commands provides the embedded OpenCode command files and installation logic.
package commands

import (
	"embed"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
)

// EmbeddedCommands holds the embedded commands filesystem, set by the main package.
var EmbeddedCommands embed.FS

// FilesystemCommandsDir is set for dev builds when commands are not embedded.
// When set, Install reads commands from this directory instead of the embedded FS.
var FilesystemCommandsDir string

// InstalledCommand records a command that was installed.
type InstalledCommand struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

// InstallResult captures the outcome of an install operation.
type InstallResult struct {
	TargetDir         string             `json:"target_dir"`
	CommandsInstalled []InstalledCommand `json:"commands_installed"`
}

// Install copies OpenCode command files into the .opencode/commands/ directory.
// The projectRoot is the root of the user's project (where .opencode/ lives).
func Install(projectRoot string) (*InstallResult, error) {
	targetDir := filepath.Join(projectRoot, ".opencode", "commands")

	result := &InstallResult{
		TargetDir: targetDir,
	}

	// Choose the source: embedded FS or filesystem directory.
	if FilesystemCommandsDir != "" {
		return installFromFilesystem(FilesystemCommandsDir, targetDir, result)
	}
	return installFromEmbedded(targetDir, result)
}

// installFromEmbedded copies commands from the embedded FS.
func installFromEmbedded(targetDir string, result *InstallResult) (*InstallResult, error) {
	commandsFS, err := fs.Sub(EmbeddedCommands, "commands")
	if err != nil {
		return nil, fmt.Errorf("failed to access embedded commands: %w", err)
	}

	err = fs.WalkDir(commandsFS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		return copyEntry(commandsFS, path, d, targetDir, result)
	})

	if err != nil {
		return nil, fmt.Errorf("failed to install commands: %w", err)
	}
	return result, nil
}

// installFromFilesystem copies commands from a local directory.
func installFromFilesystem(srcDir string, targetDir string, result *InstallResult) (*InstallResult, error) {
	srcFS := os.DirFS(srcDir)

	err := fs.WalkDir(srcFS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		return copyEntry(srcFS, path, d, targetDir, result)
	})

	if err != nil {
		return nil, fmt.Errorf("failed to install commands: %w", err)
	}
	return result, nil
}

// copyEntry copies a single file or creates a directory in the target.
func copyEntry(source fs.FS, path string, d fs.DirEntry, targetDir string, result *InstallResult) error {
	destPath := filepath.Join(targetDir, path)

	if d.IsDir() {
		return os.MkdirAll(destPath, 0755)
	}

	// Read the source file.
	content, err := fs.ReadFile(source, path)
	if err != nil {
		return fmt.Errorf("failed to read %s: %w", path, err)
	}

	// Ensure parent directory exists.
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return fmt.Errorf("failed to create directory for %s: %w", path, err)
	}

	// Write to destination.
	if err := os.WriteFile(destPath, content, 0644); err != nil {
		return fmt.Errorf("failed to write %s: %w", path, err)
	}

	// Track installed commands (.md files).
	if filepath.Ext(path) == ".md" {
		name := path[:len(path)-len(".md")]
		result.CommandsInstalled = append(result.CommandsInstalled, InstalledCommand{
			Name: name,
			Path: destPath,
		})
	}

	return nil
}
