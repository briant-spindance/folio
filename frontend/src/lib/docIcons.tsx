/**
 * docIcons.tsx
 *
 * Renders Lucide icons by kebab-case name (as stored in wiki frontmatter).
 * Converts "book-open" → BookOpen and renders via lucide-react.
 *
 * Also exports `allIconNames` — the sorted list of every available kebab-case
 * icon name — used by the IconPicker search.
 *
 * Usage:
 *   import { docIcon, allIconNames } from "@/lib/docIcons"
 *   const icon = docIcon("book-open", 16)  // returns ReactNode
 */

import * as LucideIcons from "lucide-react"
import type { ReactNode } from "react"

// ── kebab-case → PascalCase ───────────────────────────────────────

function toPascalCase(kebab: string): string {
  return kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}

// ── Resolve a lucide-react component by kebab name ────────────────

type LucideComponent = React.ComponentType<{ size?: number; strokeWidth?: number }>

function resolveIcon(name: string): LucideComponent | null {
  const pascal = toPascalCase(name)
  const candidate = (LucideIcons as Record<string, unknown>)[pascal]
  if (typeof candidate === "function") return candidate as LucideComponent
  // Some icons export as e.g. "BookOpenIcon" — try that too
  const withSuffix = (LucideIcons as Record<string, unknown>)[pascal + "Icon"]
  if (typeof withSuffix === "function") return withSuffix as LucideComponent
  return null
}

// ── Public API: render an icon ────────────────────────────────────

const FallbackIcon = (LucideIcons as Record<string, unknown>)["FileText"] as LucideComponent

export function docIcon(name: string | null | undefined, size = 16): ReactNode {
  const Icon = name ? (resolveIcon(name) ?? FallbackIcon) : FallbackIcon
  return <Icon size={size} strokeWidth={1.75} />
}

// ── Public API: all searchable icon names ─────────────────────────

// Build the list once at module init time. Filter to base names only
// (no *Icon aliases) and convert to kebab-case.
function pascalToKebab(pascal: string): string {
  return pascal
    .replace(/([A-Z])/g, (_, c, i) => (i === 0 ? c.toLowerCase() : "-" + c.toLowerCase()))
}

const SKIP = new Set(["createLucideIcon", "icons", "default"])

export const allIconNames: string[] = Object.keys(LucideIcons)
  .filter((k) => !SKIP.has(k) && !k.endsWith("Icon"))
  .map(pascalToKebab)
  .sort()
