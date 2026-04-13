# Releasing Folio

This project uses [GoReleaser](https://goreleaser.com) and GitHub Actions to
automate cross-platform builds and GitHub releases. Pushing a version tag
triggers the release workflow automatically.

## Quick Start

```bash
# 1. Tag the release
git tag v0.1.0

# 2. Push the tag — this triggers the release workflow
git push origin v0.1.0
```

GitHub Actions will build binaries for all platforms, generate a changelog from
commits, and publish a GitHub release with downloadable archives.

## How It Works

1. You push a tag matching `v*` (e.g., `v0.1.0`, `v1.0.0-beta.1`).
2. The **Release** workflow (`.github/workflows/release.yml`) runs on GitHub Actions.
3. [GoReleaser](https://goreleaser.com) (configured in `.goreleaser.yaml`):
   - Builds the frontend with pnpm and prepares embedded assets.
   - Cross-compiles the Go binary for all target platforms.
   - Injects the version, commit hash, and build date via `-ldflags`.
   - Creates archives (`.tar.gz` for macOS/Linux, `.zip` for Windows).
   - Generates a `checksums.txt` file.
   - Publishes a GitHub release with auto-generated changelog.

## Target Platforms

| OS      | Architecture |
| ------- | ------------ |
| macOS   | amd64, arm64 |
| Linux   | amd64, arm64 |
| Windows | amd64, arm64 |

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (`v1.0.0` → `v2.0.0`) — breaking changes
- **MINOR** (`v1.0.0` → `v1.1.0`) — new features, backward-compatible
- **PATCH** (`v1.0.0` → `v1.0.1`) — bug fixes, backward-compatible

Pre-release tags (e.g., `v1.0.0-beta.1`, `v1.0.0-rc.1`) are automatically
marked as pre-releases on GitHub.

## Release Checklist

1. Ensure `main` is in a clean, passing state (CI green).
2. Decide the next version number based on changes since the last release.
3. Tag and push:

   ```bash
   git tag v<version>
   git push origin v<version>
   ```

4. Monitor the [Actions tab](https://github.com/briant-spindance/folio/actions)
   for the release workflow.
5. Once complete, review the release on the
   [Releases page](https://github.com/briant-spindance/folio/releases) and edit
   the notes if desired.

## Testing a Release Locally

Install GoReleaser to test the build process without publishing:

```bash
# Install GoReleaser (macOS)
brew install goreleaser

# Run a snapshot build (no publish, no tag required)
goreleaser release --snapshot --clean
```

This produces all archives in `dist/` so you can verify the build output.

## Release Artifacts

Each release includes:

```
folio_<version>_darwin_amd64.tar.gz
folio_<version>_darwin_arm64.tar.gz
folio_<version>_linux_amd64.tar.gz
folio_<version>_linux_arm64.tar.gz
folio_<version>_windows_amd64.zip
folio_<version>_windows_arm64.zip
checksums.txt
```

## Changelog

GoReleaser auto-generates release notes from commits between the previous tag
and the new tag. Commits are grouped by prefix:

| Prefix                          | Category    |
| ------------------------------- | ----------- |
| `Add ...`                       | New Features |
| `Fix ...`                       | Bug Fixes   |
| `Reduce / Optimize / Improve ...` | Performance |
| Everything else                 | Other       |
| `Merge ...`                     | Excluded    |

For the best release notes, use clear imperative commit messages
(e.g., "Add user authentication", "Fix dashboard rendering on mobile").

## Configuration Files

| File                              | Purpose                                      |
| --------------------------------- | -------------------------------------------- |
| `.goreleaser.yaml`                | GoReleaser build, archive, and release config |
| `.github/workflows/release.yml`   | GitHub Actions workflow triggered on tag push |
