// helpContent.ts — Build-time loader for help documentation.
//
// Uses Vite's import.meta.glob to import all markdown files from src/help/
// at build time as raw strings. Parses simple YAML frontmatter from each
// file and exports a sorted list of articles.

/** Metadata parsed from a help article's YAML frontmatter. */
export interface HelpArticle {
  slug: string
  title: string
  description: string
  order: number
  icon: string
  body: string
}

// Import all .md files from the help directory as raw strings at build time.
const helpModules = import.meta.glob('/src/help/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

/**
 * Parse simple YAML frontmatter from a markdown string.
 * Expects frontmatter delimited by `---` on its own line.
 * Returns the frontmatter fields and the remaining body.
 */
function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const meta: Record<string, string> = {}

  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (!match) {
    return { meta, body: raw }
  }

  const frontmatterBlock = match[1]
  const body = match[2]

  for (const line of frontmatterBlock.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    if (key && value) {
      meta[key] = value
    }
  }

  return { meta, body }
}

/**
 * Extract the slug from a module path.
 * e.g. "/src/help/quick-start.md" -> "quick-start"
 */
function slugFromPath(path: string): string {
  const filename = path.split('/').pop() ?? ''
  return filename.replace(/\.md$/, '')
}

/** All help articles, sorted by their `order` frontmatter field. */
export const helpArticles: HelpArticle[] = Object.entries(helpModules)
  .map(([path, raw]) => {
    const { meta, body } = parseFrontmatter(raw)
    return {
      slug: slugFromPath(path),
      title: meta.title ?? slugFromPath(path),
      description: meta.description ?? '',
      order: parseInt(meta.order ?? '99', 10),
      icon: meta.icon ?? '',
      body,
    }
  })
  .sort((a, b) => a.order - b.order)

/** Look up a single help article by slug. Returns undefined if not found. */
export function getHelpArticle(slug: string): HelpArticle | undefined {
  return helpArticles.find((a) => a.slug === slug)
}
