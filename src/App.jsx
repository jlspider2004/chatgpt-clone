import { useCallback, useEffect, useState } from 'react'
import { fetchModels, generateTitle, streamChat } from './api/chat'
import { APP_NAME, DEFAULT_MODEL } from './config/kuailv'
import ChatHistory from './components/ChatHistory'
import ChatInput from './components/ChatInput'
import SessionList from './components/SessionList'
import { useSessions } from './hooks/useSessions'
import './App.css'

function deriveTitle(text) {
  const trimmed = text.trim()
  if (!trimmed) return '新对话'
  return trimmed.length > 20 ? `${trimmed.slice(0, 20)}…` : trimmed
}

function upsertActivity(activities, next) {
  const existing = activities.findIndex((item) => item.text === next.text)
  if (existing >= 0) {
    const updated = [...activities]
    updated[existing] = { ...updated[existing], ...next }
    return updated
  }
  return [...activities, next]
}

function finalizeActivities(activities) {
  return activities.map((item) =>
    item.status === 'running' ? { ...item, status: 'done' } : item,
  )
}

export default function App() {
  const [models, setModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const defaultModel = DEFAULT_MODEL
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const {
    sessions,
    activeSession,
    activeSessionId,
    createNewSession,
    selectSession,
    deleteSession,
    updateSession,
    ready,
  } = useSessions(defaultModel)

  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchModels().then((list) => {
      setModels(list)
      setModelsLoading(false)
    })
  }, [])

  const generateReply = useCallback(
    async (sessionId, contextMessages, model, { refreshTitle = false, titleSource } = {}) => {
      setLoading(true)
      setError('')
      setStreaming({ content: '', activities: [] })

      let activities = []
      let content = ''

      try {
        for await (const event of streamChat(contextMessages, model)) {
          if (event.type === 'activity') {
            activities = upsertActivity(activities, event.activity)
            setStreaming({ content, activities: [...activities] })
          }

          if (event.type === 'delta') {
            content = event.fullContent
            setStreaming({ content, activities: [...activities] })
          }

          if (event.type === 'done') {
            content = event.content || content
          }
        }

        const finalActivities = finalizeActivities(activities)
        const assistantMessage = {
          role: 'assistant',
          content,
          activities: finalActivities.length ? finalActivities : undefined,
        }

        updateSession(sessionId, {
          messages: [...contextMessages, assistantMessage],
        })

        if (refreshTitle && titleSource && content) {
          generateTitle(titleSource, content).then((title) => {
            if (title) updateSession(sessionId, { title })
          })
        }
      } catch (err) {
        setError(err.message || '获取回复失败，请稍后重试。')
      } finally {
        setStreaming(null)
        setLoading(false)
      }
    },
    [updateSession],
  )

  const handleModelChange = (model) => {
    if (!activeSessionId) return
    updateSession(activeSessionId, { model })
  }

  const handleSend = async (text) => {
    if (!activeSession || loading) return

    const userMessage = { role: 'user', content: text }
    const nextMessages = [...activeSession.messages, userMessage]
    const isFirstExchange = activeSession.messages.length === 0
    const sessionId = activeSession.id
    const model = activeSession.model

    updateSession(sessionId, {
      messages: nextMessages,
      title: isFirstExchange ? deriveTitle(text) : activeSession.title,
    })

    await generateReply(sessionId, nextMessages, model, {
      refreshTitle: isFirstExchange,
      titleSource: text,
    })
  }

  const handleEditMessage = async (messageIndex, newContent) => {
    if (!activeSession || loading) return

    const text = newContent.trim()
    if (!text) return

    const message = activeSession.messages[messageIndex]
    if (!message || message.role !== 'user') return
    if (text === message.content) return

    const sessionId = activeSession.id
    const model = activeSession.model
    const truncated = activeSession.messages.slice(0, messageIndex)
    const updatedMessages = [...truncated, { role: 'user', content: text }]
    const isFirstMessage = messageIndex === 0

    updateSession(sessionId, {
      messages: updatedMessages,
      title: isFirstMessage ? deriveTitle(text) : activeSession.title,
    })

    await generateReply(sessionId, updatedMessages, model, {
      refreshTitle: isFirstMessage,
      titleSource: text,
    })
  }

  if (!ready || modelsLoading) {
    return <div className="app-loading">加载中…</div>
  }

  return (
    <div className="app">
      <SessionList
        appName={APP_NAME}
        sessions={sessions}
        activeSessionId={activeSessionId}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={selectSession}
        onCreate={createNewSession}
        onDelete={deleteSession}
      />

      <main className="main-panel">
        <header className="main-header">
          <button
            type="button"
            className="menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="打开对话列表"
          >
            ☰
          </button>
          <h1 className="main-title">{activeSession?.title ?? '新对话'}</h1>
        </header>

        <ChatHistory
          messages={activeSession?.messages ?? []}
          streaming={streaming}
          disabled={loading}
          onEditMessage={handleEditMessage}
        />

        {error && <div className="error-banner">{error}</div>}

        <ChatInput
          onSend={handleSend}
          disabled={loading}
          model={activeSession?.model ?? defaultModel}
          models={models}
          onModelChange={handleModelChange}
        />
      </main>
    </div>
  )
}
