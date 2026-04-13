/**
 * docIcons.tsx
 *
 * Renders Lucide icons by kebab-case name (as stored in wiki frontmatter).
 * Uses lucide-react's DynamicIcon to avoid bundling all 1000+ icons.
 *
 * Also exports `allIconNames` — the sorted list of every available kebab-case
 * icon name — used by the IconPicker search.
 *
 * Usage:
 *   import { DocIcon, allIconNames } from "@/lib/docIcons"
 *   <DocIcon name="book-open" size={16} />
 */

import { memo } from "react"
import { DynamicIcon, type IconName } from "lucide-react/dynamic"
import { FileText } from "lucide-react"
import dynamicIconImports from "lucide-react/dynamicIconImports"

// ── kebab-case → PascalCase (kept for tests) ─────────────────────

export function toPascalCase(kebab: string): string {
  return kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}

// ── Public API: render an icon ────────────────────────────────────

const validIcons = new Set<string>(Object.keys(dynamicIconImports))

const Fallback = <FileText size={16} strokeWidth={1.75} />

/**
 * DocIcon — renders a Lucide icon by kebab-case name.
 * Falls back to FileText for unknown/missing names.
 * Uses DynamicIcon which lazy-loads only the icons actually used.
 */
export const DocIcon = memo(function DocIcon({
  name,
  size = 16,
}: {
  name: string | null | undefined
  size?: number
}) {
  if (!name || !validIcons.has(name)) {
    return <FileText size={size} strokeWidth={1.75} />
  }
  return (
    <DynamicIcon
      name={name as IconName}
      size={size}
      strokeWidth={1.75}
      fallback={() => <FileText size={size} strokeWidth={1.75} />}
    />
  )
})

// ── Public API: all searchable icon names ─────────────────────────

export function pascalToKebab(pascal: string): string {
  return pascal
    .replace(/([A-Z])/g, (_, c, i) => (i === 0 ? c.toLowerCase() : "-" + c.toLowerCase()))
}

export const allIconNames: string[] = Object.keys(dynamicIconImports).sort()
