import { describe, it, expect } from "vitest"
import { toPascalCase, pascalToKebab } from "./docIcons"

describe("toPascalCase", () => {
  it("converts a single word", () => {
    expect(toPascalCase("home")).toBe("Home")
  })

  it("converts a multi-segment name", () => {
    expect(toPascalCase("book-open")).toBe("BookOpen")
  })

  it("converts a three-segment name", () => {
    expect(toPascalCase("circle-arrow-up")).toBe("CircleArrowUp")
  })
})

describe("pascalToKebab", () => {
  it("converts a single word", () => {
    expect(pascalToKebab("Home")).toBe("home")
  })

  it("converts a multi-word name", () => {
    expect(pascalToKebab("BookOpen")).toBe("book-open")
  })

  it("converts a three-word name", () => {
    expect(pascalToKebab("CircleArrowUp")).toBe("circle-arrow-up")
  })

  it("round-trips with toPascalCase", () => {
    const names = ["home", "book-open", "circle-arrow-up", "file-text"]
    for (const name of names) {
      expect(pascalToKebab(toPascalCase(name))).toBe(name)
    }
  })
})
