import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'chatgpt-clone-sessions'

function createSession(model = 'deepseek-v4-flash') {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: 'New chat',
    model,
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveSessions(sessions, activeSessionId) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, activeSessionId }))
}

export function useSessions(defaultModel) {
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = loadSessions()
    if (stored?.sessions?.length) {
      setSessions(stored.sessions)
      setActiveSessionId(stored.activeSessionId || stored.sessions[0].id)
    } else {
      const initial = createSession(defaultModel)
      setSessions([initial])
      setActiveSessionId(initial.id)
    }
    setReady(true)
  }, [defaultModel])

  useEffect(() => {
    if (!ready || !activeSessionId) return
    saveSessions(sessions, activeSessionId)
  }, [sessions, activeSessionId, ready])

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null

  const createNewSession = useCallback(() => {
    const session = createSession(defaultModel)
    setSessions((prev) => [session, ...prev])
    setActiveSessionId(session.id)
    return session
  }, [defaultModel])

  const selectSession = useCallback((id) => {
    setActiveSessionId(id)
  }, [])

  const deleteSession = useCallback((id) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (next.length === 0) {
        const session = createSession(defaultModel)
        setActiveSessionId(session.id)
        return [session]
      }
      if (id === activeSessionId) {
        setActiveSessionId(next[0].id)
      }
      return next
    })
  }, [activeSessionId, defaultModel])

  const updateSession = useCallback((id, updater) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== id) return session
        const updated = typeof updater === 'function' ? updater(session) : { ...session, ...updater }
        return { ...updated, updatedAt: Date.now() }
      }),
    )
  }, [])

  return {
    sessions,
    activeSession,
    activeSessionId,
    createNewSession,
    selectSession,
    deleteSession,
    updateSession,
    ready,
  }
}
