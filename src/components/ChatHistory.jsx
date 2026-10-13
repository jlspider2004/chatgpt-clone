import { useEffect, useRef } from 'react'
import { APP_NAME } from '../config/kuailv'
import { stripImageGenDirective } from '../utils/messages'
import ActivityPanel from './ActivityPanel'
import AssistantMessage from './AssistantMessage'
import UserMessage from './UserMessage'

export default function ChatHistory({ messages, streaming, disabled, onEditMessage }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  if (messages.length === 0 && !streaming) {
    return (
      <div className="chat-history empty">
        <div className="empty-state">
          <div className="empty-logo">{APP_NAME}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-history">
      {messages.map((message, index) => (
        <div key={`${message.role}-${index}`} className={`message-row ${message.role}`}>
          <div className="message-avatar">{message.role === 'user' ? '我' : 'AI'}</div>
          <div className="message-content">
            {message.role === 'assistant' && message.activities?.length > 0 && (
              <ActivityPanel activities={message.activities} />
            )}
            {message.role === 'assistant' ? (
              <AssistantMessage content={message.content} images={message.images} />
            ) : (
              <UserMessage
                message={message}
                disabled={disabled}
                onSave={(text) => onEditMessage?.(index, text)}
              />
            )}
          </div>
        </div>
      ))}

      {streaming && (
        <div className="message-row assistant">
          <div className="message-avatar">AI</div>
          <div className="message-content">
            <ActivityPanel activities={streaming.activities} />
            {streaming.content ? (
              <AssistantMessage
                content={stripImageGenDirective(streaming.content)}
                images={streaming.images}
              />
            ) : (
              <div className="loading-dots">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
