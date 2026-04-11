import { Hono } from "hono"
import { execSync } from "node:child_process"
import { getGitRoot, getDirtyFiles } from "../lib/git.js"
import { paths } from "../lib/paths.js"

const router = new Hono()

function runGit(cmd: string, cwd: string): string {
  return execSync(cmd, {
    cwd,
    encoding: "utf-8",
    timeout: 3_000,
    stdio: ["ignore", "pipe", "ignore"],
  }).trim()
}

router.get("/", (c) => {
  const gitRoot = getGitRoot(paths.root)

  if (!gitRoot) {
    return c.json({ branch: null, commit: null, dirty: false })
  }

  let branch: string | null = null
  let commit: string | null = null

  try {
    branch = runGit("git rev-parse --abbrev-ref HEAD", gitRoot)
  } catch {
    // detached HEAD or no commits yet
  }

  try {
    commit = runGit("git rev-parse --short HEAD", gitRoot)
  } catch {
    // no commits yet
  }

  const dirtyFiles = getDirtyFiles(gitRoot)
  const dirty = dirtyFiles.size > 0

  return c.json({ branch, commit, dirty })
})

export default router
