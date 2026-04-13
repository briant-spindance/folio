import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { StatusBadge, IssueTypeBadge, LabelBadge } from "./Badges"

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="draft" />)
    expect(screen.getByText("draft")).toBeInTheDocument()
  })

  it("applies the status class", () => {
    render(<StatusBadge status="in-progress" />)
    const badge = screen.getByText("in-progress")
    expect(badge).toHaveClass("badge", "badge-in-progress")
  })
})

describe("IssueTypeBadge", () => {
  it("renders the type text", () => {
    render(<IssueTypeBadge type="bug" />)
    expect(screen.getByText("bug")).toBeInTheDocument()
  })

  it("applies the correct type class", () => {
    render(<IssueTypeBadge type="improvement" />)
    const badge = screen.getByText("improvement")
    expect(badge).toHaveClass("badge", "badge-improvement")
  })
})

describe("LabelBadge", () => {
  it("renders the label text", () => {
    render(<LabelBadge label="frontend" />)
    expect(screen.getByText("frontend")).toBeInTheDocument()
  })

  it("applies the label class", () => {
    render(<LabelBadge label="backend" />)
    const badge = screen.getByText("backend")
    expect(badge).toHaveClass("badge", "badge-label")
  })
})
