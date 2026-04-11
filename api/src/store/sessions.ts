import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { paths } from "../lib/paths.js"

export interface ChatSession {
  id: string
  name: string
  savedAt: number
  // UIMessage[] — stored as opaque JSON, typed loosely
  messages: unknown[]
}

const MAX_SESSIONS = 20

function ensureDir() {
  if (!existsSync(paths.aiSessions)) {
    mkdirSync(paths.aiSessions, { recursive: true })
  }
}

function sessionFile(contextKey: string): string {
  // contextKey is e.g. "doc:project-brief" or "global" — sanitise for filename
  const safe = contextKey.replace(/[^a-z0-9_-]/gi, "_")
  return path.join(paths.aiSessions, `${safe}.json`)
}

export function listSessions(contextKey: string): ChatSession[] {
  ensureDir()
  const file = sessionFile(contextKey)
  if (!existsSync(file)) return []
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as ChatSession[]
  } catch {
    return []
  }
}

export function saveSessions(contextKey: string, sessions: ChatSession[]): void {
  ensureDir()
  writeFileSync(sessionFile(contextKey), JSON.stringify(sessions, null, 2), "utf-8")
}

export function upsertSession(contextKey: string, session: ChatSession): void {
  const sessions = listSessions(contextKey)
  // Remove existing entry with same id (for updates), then prepend
  const filtered = sessions.filter((s) => s.id !== session.id)
  const updated = [session, ...filtered].slice(0, MAX_SESSIONS)
  saveSessions(contextKey, updated)
}

export function deleteSession(contextKey: string, id: string): void {
  const sessions = listSessions(contextKey)
  saveSessions(contextKey, sessions.filter((s) => s.id !== id))
}
