import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ChatHistory({ messages, loading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  if (messages.length === 0 && !loading) {
    return (
      <div className="chat-history empty">
        <div className="empty-state">
          <h2>How can I help you today?</h2>
          <p>Start a conversation below.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-history">
      {messages.map((message, index) => (
        <div key={`${message.role}-${index}`} className={`message-row ${message.role}`}>
          <div className="message-avatar">{message.role === 'user' ? 'You' : 'AI'}</div>
          <div className="message-content">
            {message.role === 'assistant' ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            ) : (
              <p>{message.content}</p>
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div className="message-row assistant">
          <div className="message-avatar">AI</div>
          <div className="message-content loading-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
