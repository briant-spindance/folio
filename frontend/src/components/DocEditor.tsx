/**
 * DocEditor.tsx
 *
 * Shared WYSIWYG editor for creating and editing wiki docs.
 * Props:
 *   initialTitle  – starting title string
 *   initialIcon   – starting icon name (or null)
 *   initialBody   – starting body as Markdown string
 *   onSave        – called with SaveDocPayload; used for both explicit saves and auto-save
 *   isSaving      – true while the save mutation is in-flight
 *   isNew         – optional; hides "Last saved" text when true
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useEditor, useEditorState, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Markdown } from "tiptap-markdown"
import type { SaveDocPayload } from "@/lib/types"
import { DocIcon, allIconNames } from "@/lib/docIcons"

type EditorMode = "wysiwyg" | "raw"

// ── IconPicker ────────────────────────────────────────────────────

const MAX_RESULTS = 80

interface IconPickerProps {
  value: string | null
  onChange: (name: string) => void
}

function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Filter icons by query
  const filtered = useMemo(() => {
    if (!query.trim()) return allIconNames.slice(0, MAX_RESULTS)
    const q = query.toLowerCase().trim()
    // Score: starts-with beats contains
    const starts = allIconNames.filter((n) => n.startsWith(q))
    const contains = allIconNames.filter((n) => !n.startsWith(q) && n.includes(q))
    return [...starts, ...contains].slice(0, MAX_RESULTS)
  }, [query])

  // Reset query & focus search input when popover opens/closes
  const prevOpenRef = useRef(open)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setTimeout(() => searchRef.current?.focus(), 30)
    }
    if (!open && prevOpenRef.current) {
      // Defer reset to avoid synchronous setState-in-effect
      queueMicrotask(() => setQuery(""))
    }
    prevOpenRef.current = open
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  const current = value ?? "file-text"

  return (
    <div className="doc-icon-picker-wrap" ref={wrapRef}>
      {/* Trigger: the icon itself */}
      <button
        type="button"
        className="doc-icon-picker-trigger"
        title={`Icon: ${current} — click to change`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Change document icon"
      >
        <DocIcon name={current} size={18} />
      </button>

      {open && (
        <div className="doc-icon-picker-popover">
          {/* Search bar */}
          <div className="doc-icon-picker-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search icons…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false)
                if (e.key === "Enter" && filtered.length > 0) {
                  onChange(filtered[0])
                  setOpen(false)
                }
              }}
            />
          </div>

          {/* Icon grid */}
          {filtered.length === 0 ? (
            <div className="doc-icon-picker-empty">No icons found</div>
          ) : (
            <div className="doc-icon-picker-grid">
              {filtered.map((name) => (
                <button
                  key={name}
                  type="button"
                  title={name}
                  className={`doc-icon-picker-item${name === current ? " selected" : ""}`}
                  onClick={() => {
                    onChange(name)
                    setOpen(false)
                  }}
                >
                  <DocIcon name={name} size={16} />
                </button>
              ))}
            </div>
          )}

          {/* Result count */}
          <div className="doc-icon-picker-count">
            {filtered.length === MAX_RESULTS
              ? `${MAX_RESULTS}+ results — refine search`
              : `${filtered.length} icon${filtered.length !== 1 ? "s" : ""}`}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Toolbar button ────────────────────────────────────────────────

interface ToolbarBtnProps {
  active?: boolean
  disabled?: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}

function ToolbarBtn({ active, disabled, title, onClick, children }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={`doc-editor-toolbar-btn${active ? " active" : ""}`}
    >
      {children}
    </button>
  )
}

// ── Toolbar SVG icons ─────────────────────────────────────────────

function IcBold() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12h8a4 4 0 0 0 0-8H6z" />
      <path d="M6 12h9a4 4 0 0 1 0 8H6z" />
    </svg>
  )
}

function IcItalic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  )
}

function IcBulletList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IcOrderedList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </svg>
  )
}

function IcBlockquote() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </svg>
  )
}

function IcCode() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

function IcCodeBlock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 9l-3 3 3 3" />
      <path d="M14 15l3-3-3-3" />
      <rect x="2" y="3" width="20" height="18" rx="2" />
    </svg>
  )
}

function IcHr() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  )
}

function IcSpinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

// ── DocEditor ─────────────────────────────────────────────────────

interface DocEditorProps {
  initialTitle: string
  initialIcon: string | null
  initialBody: string
  onSave: (payload: SaveDocPayload) => void
  isSaving: boolean
  isNew?: boolean
  /** If provided, a "View" link is shown next to the Save button */
  viewHref?: string
}

export function DocEditor({
  initialTitle,
  initialIcon,
  initialBody,
  onSave,
  isSaving,
  isNew = false,
  viewHref,
}: DocEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [icon, setIcon] = useState<string | null>(initialIcon)
  const [unsaved, setUnsaved] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(isNew ? null : new Date())
  const [mode, setMode] = useState<EditorMode>("wysiwyg")
  const [rawValue, setRawValue] = useState(initialBody)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const metaBarRef = useRef<HTMLDivElement>(null)
  const layoutRef = useRef<HTMLDivElement>(null)

  // Measure meta-bar height so toolbar sticks right below it
  useEffect(() => {
    const el = metaBarRef.current
    const layout = layoutRef.current
    if (!el || !layout) return
    const update = () => {
      layout.style.setProperty("--editor-meta-height", `${el.offsetHeight}px`)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing…" }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: false,
      }),
    ],
    content: initialBody,
    onUpdate: () => {
      setUnsaved(true)
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(() => triggerSave(), 1500)
    },
  })

  // Subscribe to selection/mark changes so toolbar active-states update on cursor move
  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      bold:        ctx.editor.isActive("bold"),
      italic:      ctx.editor.isActive("italic"),
      h1:          ctx.editor.isActive("heading", { level: 1 }),
      h2:          ctx.editor.isActive("heading", { level: 2 }),
      h3:          ctx.editor.isActive("heading", { level: 3 }),
      bulletList:  ctx.editor.isActive("bulletList"),
      orderedList: ctx.editor.isActive("orderedList"),
      blockquote:  ctx.editor.isActive("blockquote"),
      code:        ctx.editor.isActive("code"),
      codeBlock:   ctx.editor.isActive("codeBlock"),
    }),
  })

  const triggerSave = useCallback(() => {
    if (!editor) return
    const mdStorage = (editor.storage as unknown as Record<string, unknown>).markdown as { getMarkdown?: () => string } | undefined
    const body = mode === "raw"
      ? rawValue
      : (mdStorage?.getMarkdown?.() ?? editor.getText())
    onSave({ title, icon, body })
    setLastSavedAt(new Date())
    setUnsaved(false)
  }, [editor, title, icon, onSave, mode, rawValue])

  // Switch between WYSIWYG and raw, round-tripping content
  const switchMode = useCallback((next: EditorMode) => {
    if (next === mode) return
    if (next === "raw") {
      const mdStorage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.markdown as { getMarkdown?: () => string } | undefined
      const md = mdStorage?.getMarkdown?.() ?? editor?.getText() ?? ""
      setRawValue(md)
    } else {
      // Push raw Markdown back into Tiptap
      if (editor) {
        editor.commands.setContent(rawValue)
      }
    }
    setMode(next)
  }, [mode, editor, rawValue])

  // Re-arm auto-save when title or icon changes
  useEffect(() => {
    if (!unsaved) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => triggerSave(), 1500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, icon])

  useEffect(() => {
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [])

  function formatLastSaved(d: Date | null): string {
    if (!d) return ""
    return `Last saved ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  }

  const handleExplicitSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    triggerSave()
  }

  return (
    <div className="doc-editor-layout" ref={layoutRef}>
      {/* ── Meta bar ── */}
      <div className="doc-editor-meta-bar" ref={metaBarRef}>
        <IconPicker
          value={icon}
          onChange={(name) => {
            setIcon(name)
            setUnsaved(true)
          }}
        />
        <input
          type="text"
          className="doc-editor-title-input"
          value={title}
          placeholder="Untitled document"
          onChange={(e) => {
            setTitle(e.target.value)
            setUnsaved(true)
          }}
        />

        <div className="doc-editor-meta-actions">
          {!isNew && lastSavedAt && (
            <span className="doc-editor-save-meta">{formatLastSaved(lastSavedAt)}</span>
          )}
          {unsaved && <span className="doc-editor-unsaved-dot" title="Unsaved changes" />}
          {viewHref && (
            <Link
              to={viewHref}
              className="doc-editor-view-btn"
              title="View document"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              View
            </Link>
          )}
          <button
            type="button"
            className="doc-editor-save-btn"
            disabled={isSaving || !unsaved}
            onClick={handleExplicitSave}
          >
            {isSaving ? <IcSpinner /> : null}
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* ── Toolbar (sticky) ── */}
      <div className="doc-editor-toolbar" role="toolbar" aria-label="Formatting">
        {/* Formatting buttons — hidden in raw mode */}
        {mode === "wysiwyg" && (<>
          <ToolbarBtn title="Bold (Ctrl+B)" active={editorState?.bold} onClick={() => editor?.chain().focus().toggleBold().run()}>
            <IcBold />
          </ToolbarBtn>
          <ToolbarBtn title="Italic (Ctrl+I)" active={editorState?.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <IcItalic />
          </ToolbarBtn>

          <div className="doc-editor-toolbar-sep" />

          <ToolbarBtn title="Heading 1" active={editorState?.h1} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolbarBtn>
          <ToolbarBtn title="Heading 2" active={editorState?.h2} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarBtn>
          <ToolbarBtn title="Heading 3" active={editorState?.h3} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarBtn>

          <div className="doc-editor-toolbar-sep" />

          <ToolbarBtn title="Bullet list" active={editorState?.bulletList} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            <IcBulletList />
          </ToolbarBtn>
          <ToolbarBtn title="Ordered list" active={editorState?.orderedList} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            <IcOrderedList />
          </ToolbarBtn>

          <div className="doc-editor-toolbar-sep" />

          <ToolbarBtn title="Blockquote" active={editorState?.blockquote} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
            <IcBlockquote />
          </ToolbarBtn>
          <ToolbarBtn title="Inline code" active={editorState?.code} onClick={() => editor?.chain().focus().toggleCode().run()}>
            <IcCode />
          </ToolbarBtn>
          <ToolbarBtn title="Code block" active={editorState?.codeBlock} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
            <IcCodeBlock />
          </ToolbarBtn>

          <div className="doc-editor-toolbar-sep" />

          <ToolbarBtn title="Horizontal rule" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
            <IcHr />
          </ToolbarBtn>

          <div className="doc-editor-toolbar-sep" />
        </>)}

        {/* Mode toggle */}
        <div className="doc-editor-mode-toggle" role="group" aria-label="Editor mode">
          <button
            type="button"
            className={`doc-editor-mode-btn${mode === "wysiwyg" ? " active" : ""}`}
            onClick={() => switchMode("wysiwyg")}
            title="Rich text editor"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Rich
          </button>
          <button
            type="button"
            className={`doc-editor-mode-btn${mode === "raw" ? " active" : ""}`}
            onClick={() => switchMode("raw")}
            title="Raw Markdown"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
            Markdown
          </button>
        </div>
      </div>

      {/* ── Editor body ── */}
      {mode === "wysiwyg" ? (
        <div className="doc-editor-body">
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div className="doc-editor-raw">
          <textarea
            value={rawValue}
            spellCheck={false}
            onChange={(e) => {
              setRawValue(e.target.value)
              setUnsaved(true)
              if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
              autoSaveTimer.current = setTimeout(() => triggerSave(), 1500)
            }}
          />
        </div>
      )}
    </div>
  )
}
