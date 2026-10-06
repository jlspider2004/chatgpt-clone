import { useEffect, useRef, useState } from 'react'

export default function UserMessage({ content, onSave, disabled }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!editing) setDraft(content)
  }, [content, editing])

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(draft.length, draft.length)
    }
  }, [editing, draft.length])

  const handleCancel = () => {
    setDraft(content)
    setEditing(false)
  }

  const handleSave = () => {
    const text = draft.trim()
    if (!text || disabled) return
    setEditing(false)
    if (text !== content) onSave(text)
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
      <p>{content}</p>
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
