import { useEffect, useRef, useState } from 'react'
import { getMessageText } from '../utils/messages'
import MessageImages from './MessageImages'

export default function UserMessage({ message, onSave, disabled }) {
  const text = typeof message === 'string' ? message : getMessageText(message)
  const images = typeof message === 'object' && message?.images ? message.images : []

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!editing) setDraft(text)
  }, [text, editing])

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(draft.length, draft.length)
    }
  }, [editing, draft.length])

  const handleCancel = () => {
    setDraft(text)
    setEditing(false)
  }

  const handleSave = () => {
    const next = draft.trim()
    if (!next || disabled) return
    setEditing(false)
    if (next !== text) onSave(next)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      handleCancel()
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      handleSave()
    }
  }

  if (editing) {
    return (
      <div className="user-message-edit">
        <textarea
          ref={textareaRef}
          className="edit-textarea"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={Math.min(8, Math.max(3, draft.split('\n').length))}
          disabled={disabled}
        />
        <div className="edit-actions">
          <button type="button" className="edit-cancel-btn" onClick={handleCancel} disabled={disabled}>
            取消
          </button>
          <button
            type="button"
            className="edit-save-btn"
            onClick={handleSave}
            disabled={disabled || !draft.trim()}
          >
            保存并重新生成
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="user-message-view">
      <MessageImages images={images} />
      {text ? <p>{text}</p> : null}
      {!disabled && (
        <button
          type="button"
          className="message-edit-btn"
          onClick={() => setEditing(true)}
          aria-label="编辑问题"
        >
          编辑
        </button>
      )}
    </div>
  )
}
