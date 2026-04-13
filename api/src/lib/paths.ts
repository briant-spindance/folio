import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

// FOLIO_DATA env var overrides — same convention the Go server will use.
// Default: ../../../testdata/folio relative to api/src/lib/
const dataRoot = process.env.FOLIO_DATA
  ? path.resolve(process.env.FOLIO_DATA)
  : path.resolve(__dirname, "../../../testdata/folio")

export const paths = {
  root: dataRoot,
  features: path.join(dataRoot, "features"),
  wiki: path.join(dataRoot, "wiki"),
  issues: path.join(dataRoot, "issues"),
  sprints: path.join(dataRoot, "sprints"),
  team: path.join(dataRoot, "team.md"),
  config: path.join(dataRoot, "folio.yaml"),
  roadmap: path.join(dataRoot, "roadmap.md"),
  aiSessions: path.join(dataRoot, ".sessions"),
  projectDocs: path.join(dataRoot, "project-docs"),
}
