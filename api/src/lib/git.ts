import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"

/**
 * Walk up the directory tree from `fromDir` until we find a `.git` directory.
 * Returns the absolute path of the git root, or null if not in a repo.
 */
export function getGitRoot(fromDir: string): string | null {
  let dir = path.resolve(fromDir)
  const { root } = path.parse(dir)
  while (dir !== root) {
    if (existsSync(path.join(dir, ".git"))) return dir
    dir = path.dirname(dir)
  }
  return null
}

/**
 * Cached result shape.
 */
interface DirtyCache {
  files: Set<string>   // repo-relative paths that are dirty
  ts: number           // Date.now() when cached
}

const CACHE_TTL_MS = 2_000
let cache: DirtyCache | null = null

/**
 * Return the set of repo-relative file paths that are dirty (modified,
 * untracked, staged, or deleted) according to `git status --porcelain`.
 * Results are cached for 2 seconds to avoid hammering git on rapid re-renders.
 *
 * Returns an empty Set if gitRoot is null or git is unavailable.
 */
export function getDirtyFiles(gitRoot: string | null): Set<string> {
  if (!gitRoot) return new Set()

  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL_MS) return cache.files

  try {
    const stdout = execSync("git status --porcelain", {
      cwd: gitRoot,
      encoding: "utf-8",
      timeout: 3_000,
      stdio: ["ignore", "pipe", "ignore"],
    })

    const files = new Set<string>()
    for (const line of stdout.split("\n")) {
      if (line.length < 4) continue
      // Format: XY <space> path  (XY are two status chars, then a space)
      // For renames: "R  old -> new" — we care about the new path (after " -> ")
      const rawPath = line.slice(3).trim()
      const filePath = rawPath.includes(" -> ")
        ? rawPath.split(" -> ")[1].trim()
        : rawPath
      files.add(filePath)
    }

    cache = { files, ts: now }
    return files
  } catch {
    // git not available, not a repo, or timed out — treat as clean
    cache = { files: new Set(), ts: now }
    return cache.files
  }
}
