// Package skills provides the embedded agent skill files and installation logic.
package skills

import (
	"embed"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
)

// EmbeddedSkills holds the embedded skills filesystem, set by the main package.
var EmbeddedSkills embed.FS

// FilesystemSkillsDir is set for dev builds when skills are not embedded.
// When set, Install reads skills from this directory instead of the embedded FS.
var FilesystemSkillsDir string

// Tool represents a supported agent tool that skills can be installed into.
type Tool struct {
	Name string // Display name for the user.
	Dir  string // Subdirectory under the project root where skills are installed.
}

// SupportedTools returns the list of tools that skills can be installed into.
func SupportedTools() []Tool {
	return []Tool{
		{Name: "OpenCode", Dir: filepath.Join(".opencode", "skills")},
	}
}

// InstalledSkill records a skill that was installed.
type InstalledSkill struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

// InstallResult captures the outcome of an install operation.
type InstallResult struct {
	Tool            string           `json:"tool"`
	TargetDir       string           `json:"target_dir"`
	SkillsInstalled []InstalledSkill `json:"skills_installed"`
}

// Install copies skills into the target directory for the given tool.
// It reads from the embedded FS if available, otherwise from FilesystemSkillsDir.
// The projectRoot is the root of the user's project (where .opencode/ etc. live).
func Install(projectRoot string, tool Tool) (*InstallResult, error) {
	targetDir := filepath.Join(projectRoot, tool.Dir)

	result := &InstallResult{
		Tool:      tool.Name,
		TargetDir: targetDir,
	}

	// Choose the source: embedded FS or filesystem directory.
	if FilesystemSkillsDir != "" {
		return installFromFilesystem(FilesystemSkillsDir, targetDir, result)
	}
	return installFromEmbedded(targetDir, result)
}

// installFromEmbedded copies skills from the embedded FS.
func installFromEmbedded(targetDir string, result *InstallResult) (*InstallResult, error) {
	skillsFS, err := fs.Sub(EmbeddedSkills, "skills")
	if err != nil {
		return nil, fmt.Errorf("failed to access embedded skills: %w", err)
	}

	err = fs.WalkDir(skillsFS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		return copyEntry(skillsFS, path, d, targetDir, result)
	})

	if err != nil {
		return nil, fmt.Errorf("failed to install skills: %w", err)
	}
	return result, nil
}

// installFromFilesystem copies skills from a local directory.
func installFromFilesystem(srcDir string, targetDir string, result *InstallResult) (*InstallResult, error) {
	srcFS := os.DirFS(srcDir)

	err := fs.WalkDir(srcFS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		return copyEntry(srcFS, path, d, targetDir, result)
	})

	if err != nil {
		return nil, fmt.Errorf("failed to install skills: %w", err)
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

	// Track installed skills (only SKILL.md files).
	if d.Name() == "SKILL.md" {
		skillName := filepath.Dir(path)
		result.SkillsInstalled = append(result.SkillsInstalled, InstalledSkill{
			Name: skillName,
			Path: destPath,
		})
	}

	return nil
}
