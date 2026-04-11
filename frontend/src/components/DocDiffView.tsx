import { useMemo } from "react"
import { diffLines } from "diff"

interface DocDiffViewProps {
  oldBody: string
  newBody: string
  onClose: () => void
}

const CONTEXT_LINES = 2

type DiffLine = { text: string; type: "added" | "removed" | "context" }
type VisibleItem = DiffLine | "ellipsis"

/**
 * Renders a compact line-diff between two markdown strings.
 * Shows CONTEXT_LINES of unchanged context around each changed block.
 */
export function DocDiffView({ oldBody, newBody, onClose }: DocDiffViewProps) {
  const lines: DiffLine[] = useMemo(() => {
    const result = diffLines(oldBody, newBody)
    const out: DiffLine[] = []
    for (const part of result) {
      const partLines = part.value.replace(/\n$/, "").split("\n")
      const type: DiffLine["type"] = part.added
        ? "added"
        : part.removed
          ? "removed"
          : "context"
      for (const text of partLines) {
        out.push({ text, type })
      }
    }
    return out
  }, [oldBody, newBody])

  const visible = useMemo(() => computeVisibleLines(lines, CONTEXT_LINES), [lines])

  if (visible.length === 0) return null

  return (
    <div className="ai-diff-banner">
      <div className="ai-diff-banner-header">
        <span className="ai-diff-banner-title">Changes</span>
        <button className="ai-diff-banner-close" onClick={onClose} title="Dismiss diff">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
      <div className="ai-diff-content">
        {visible.map((item, i) => {
          if (item === "ellipsis") {
            return (
              <span key={i} className="ai-diff-line ai-diff-line--context" style={{ opacity: 0.4 }}>
                ···
              </span>
            )
          }
          return (
            <span key={i} className={`ai-diff-line ai-diff-line--${item.type}`}>
              {item.text || " "}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function computeVisibleLines(lines: DiffLine[], context: number): VisibleItem[] {
  const changedIdx = new Set<number>()
  lines.forEach((l, i) => {
    if (l.type !== "context") changedIdx.add(i)
  })

  if (changedIdx.size === 0) return []

  const showIdx = new Set<number>()
  for (const idx of changedIdx) {
    for (let j = Math.max(0, idx - context); j <= Math.min(lines.length - 1, idx + context); j++) {
      showIdx.add(j)
    }
  }

  const result: VisibleItem[] = []
  let prev = -1
  const sorted = Array.from(showIdx).sort((a, b) => a - b)
  for (const idx of sorted) {
    if (prev !== -1 && idx > prev + 1) {
      result.push("ellipsis")
    }
    result.push(lines[idx])
    prev = idx
  }
  return result
}
