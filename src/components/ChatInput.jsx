import { useCallback, useState } from 'react'
import { useVoiceInput } from '../hooks/useVoiceInput'

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
    </svg>
  )
}

export default function ChatInput({ onSend, disabled, model, models, onModelChange }) {
  const [input, setInput] = useState('')
  const [voiceError, setVoiceError] = useState('')

  const appendTranscript = useCallback((text) => {
    setInput((prev) => {
      const trimmed = text.trim()
      if (!trimmed) return prev
      return prev ? `${prev}${prev.endsWith('\n') ? '' : ' '}${trimmed}` : trimmed
    })
    setVoiceError('')
  }, [])

  const handleVoiceError = useCallback((message) => {
    setVoiceError(message)
  }, [])

  const { status, statusLabel, isActive, toggle, supportsVoice } = useVoiceInput({
    onTranscript: appendTranscript,
    onError: handleVoiceError,
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || disabled || isActive) return
    onSend(text)
    setInput('')
    setVoiceError('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit(event)
    }
  }

  const selectedModel = models.find((item) => item.id === model)
  const inputDisabled = disabled || status === 'transcribing'

  return (
    <div className="chat-input-area">
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="input-toolbar">
          <label className="model-select-label" htmlFor="model-select">
            模型
          </label>
          <select
            id="model-select"
            className="model-select"
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
            disabled={inputDisabled}
          >
            {models.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label || item.id}
              </option>
            ))}
          </select>
          {selectedModel?.description && (
            <span className="model-hint">{selectedModel.description}</span>
          )}
        </div>

        {statusLabel && <div className="voice-status">{statusLabel}</div>}
        {voiceError && <div className="voice-error">{voiceError}</div>}

        <div className="input-row">
          {supportsVoice && (
            <button
              type="button"
              className={`voice-btn ${status === 'listening' ? 'listening' : ''} ${status === 'transcribing' ? 'transcribing' : ''}`}
              onClick={toggle}
              disabled={disabled || status === 'transcribing'}
              aria-label={status === 'listening' ? '停止语音输入' : '开始语音输入'}
              title={status === 'listening' ? '点击停止' : '语音输入'}
            >
              <MicIcon />
            </button>
          )}

          <textarea
            className="chat-textarea"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              supportsVoice
                ? '输入或点击麦克风语音提问，Enter 发送…'
                : '输入物流相关问题，Enter 发送，Shift+Enter 换行…'
            }
            rows={3}
            disabled={inputDisabled}
          />

          <button
            type="submit"
            className="send-btn"
            disabled={inputDisabled || isActive || !input.trim()}
          >
            发送
          </button>
        </div>
      </form>
    </div>
  )
}
