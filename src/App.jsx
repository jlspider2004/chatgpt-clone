import { useState } from 'react'
import { MODELS, sendChat } from './api/chat'
import ChatHistory from './components/ChatHistory'
import ChatInput from './components/ChatInput'
import SessionList from './components/SessionList'
import { useSessions } from './hooks/useSessions'
import './App.css'

const DEFAULT_MODEL = MODELS[0].id

function deriveTitle(text) {
  const trimmed = text.trim()
  if (!trimmed) return 'New chat'
  return trimmed.length > 32 ? `${trimmed.slice(0, 32)}...` : trimmed
}

export default function App() {
  const {
    sessions,
    activeSession,
    activeSessionId,
    createNewSession,
    selectSession,
    deleteSession,
    updateSession,
    ready,
  } = useSessions(DEFAULT_MODEL)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleModelChange = (model) => {
    if (!activeSessionId) return
    updateSession(activeSessionId, { model })
  }

  const handleSend = async (text) => {
    if (!activeSession) return

    const userMessage = { role: 'user', content: text }
    const nextMessages = [...activeSession.messages, userMessage]

    updateSession(activeSession.id, {
      messages: nextMessages,
      title: activeSession.messages.length === 0 ? deriveTitle(text) : activeSession.title,
    })

    setLoading(true)
    setError('')

    try {
      const reply = await sendChat(nextMessages, activeSession.model)
      updateSession(activeSession.id, {
        messages: [...nextMessages, { role: 'assistant', content: reply }],
      })
    } catch (err) {
      setError(err.message || 'Failed to get a response.')
    } finally {
      setLoading(false)
    }
  }

  if (!ready) {
    return <div className="app-loading">Loading...</div>
  }

  return (
    <div className="app">
      <SessionList
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={selectSession}
        onCreate={createNewSession}
        onDelete={deleteSession}
      />

      <main className="main-panel">
        <ChatHistory messages={activeSession?.messages ?? []} loading={loading} />

        {error && <div className="error-banner">{error}</div>}

        <ChatInput
          onSend={handleSend}
          disabled={loading}
          model={activeSession?.model ?? DEFAULT_MODEL}
          models={MODELS}
          onModelChange={handleModelChange}
        />
      </main>
    </div>
  )
}
