import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

// FORGE_DATA env var overrides — same convention the Go server will use.
// Default: ../../../testdata/forge relative to api/src/lib/
const dataRoot = process.env.FORGE_DATA
  ? path.resolve(process.env.FORGE_DATA)
  : path.resolve(__dirname, "../../../testdata/forge")

export const paths = {
  root: dataRoot,
  features: path.join(dataRoot, "features"),
  wiki: path.join(dataRoot, "wiki"),
  issues: path.join(dataRoot, "issues"),
  sprints: path.join(dataRoot, "sprints"),
  team: path.join(dataRoot, "team.md"),
  config: path.join(dataRoot, "forge.yaml"),
}
