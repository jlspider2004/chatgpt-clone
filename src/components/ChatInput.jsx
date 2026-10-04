import { useState } from 'react'

export default function ChatInput({ onSend, disabled, model, models, onModelChange }) {
  const [input, setInput] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || disabled) return
    onSend(text)
    setInput('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit(event)
    }
  }

  return (
    <div className="chat-input-area">
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="input-toolbar">
          <label className="model-select-label" htmlFor="model-select">
            Model
          </label>
          <select
            id="model-select"
            className="model-select"
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
            disabled={disabled}
          >
            {models.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="input-row">
          <textarea
            className="chat-textarea"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            rows={3}
            disabled={disabled}
          />
          <button type="submit" className="send-btn" disabled={disabled || !input.trim()}>
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
