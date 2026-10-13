import { useCallback, useRef, useState } from 'react'
import { useVoiceInput } from '../hooks/useVoiceInput'
import { ACCEPT_IMAGE_TYPES, MAX_ATTACHMENTS, prepareImageAttachment } from '../utils/imageFile'

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v10.17l3.59-3.58a1 1 0 0 1 1.42 0L15 17.17 18.59 13.6a1 1 0 0 1 1.41 0L19 14.6V5H5Zm14 14v-1.83l-2.59-2.58a1 1 0 0 0-1.42 0L11 18.83 7.41 15.2a1 1 0 0 0-1.41 0L5 16.2V19h14Z" />
    </svg>
  )
}

export default function ChatInput({ onSend, disabled, model, models, onModelChange }) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState([])
  const [voiceError, setVoiceError] = useState('')
  const [attachError, setAttachError] = useState('')
  const fileInputRef = useRef(null)

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

  const addFiles = useCallback(async (files) => {
    setAttachError('')
    const list = [...files].filter((f) => f.type.startsWith('image/'))
    if (!list.length) {
      setAttachError('请选择图片文件（JPG/PNG/WebP/GIF）')
      return
    }

    try {
      const prepared = await Promise.all(
        list.slice(0, MAX_ATTACHMENTS).map((file) => prepareImageAttachment(file)),
      )
      setAttachments((prev) => {
        const room = MAX_ATTACHMENTS - prev.length
        if (room <= 0) {
          setAttachError(`最多 ${MAX_ATTACHMENTS} 张图片`)
          return prev
        }
        const next = [...prev, ...prepared.slice(0, room)]
        if (list.length > room) {
          setAttachError(`最多 ${MAX_ATTACHMENTS} 张，已忽略多余文件`)
        }
        return next
      })
    } catch (err) {
      setAttachError(err.message || '添加图片失败')
    }
  }, [])

  const handlePaste = useCallback(
    (event) => {
      const items = event.clipboardData?.items
      if (!items) return
      const files = []
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }
      if (files.length) {
        event.preventDefault()
        addFiles(files)
      }
    },
    [addFiles],
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    const text = input.trim()
    if ((!text && !attachments.length) || disabled || isActive) return
    onSend({ text, images: attachments })
    setInput('')
    setAttachments([])
    setVoiceError('')
    setAttachError('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit(event)
    }
  }

  const selectedModel = models.find((item) => item.id === model)
  const inputDisabled = disabled || status === 'transcribing'
  const canSend = input.trim() || attachments.length

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
        {attachError && <div className="voice-error">{attachError}</div>}

        {attachments.length > 0 && (
          <div className="attachment-preview-row">
            {attachments.map((item, index) => (
              <div key={`${item.name}-${index}`} className="attachment-thumb">
                <img src={item.src} alt={item.name} />
                <button
                  type="button"
                  className="attachment-remove"
                  aria-label="移除图片"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                  disabled={inputDisabled}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="input-row">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_IMAGE_TYPES}
            multiple
            className="hidden-file-input"
            onChange={(event) => {
              if (event.target.files?.length) addFiles(event.target.files)
              event.target.value = ''
            }}
          />

          <button
            type="button"
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={inputDisabled || attachments.length >= MAX_ATTACHMENTS}
            aria-label="添加图片"
            title="上传或粘贴图片"
          >
            <ImageIcon />
          </button>

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
            onPaste={handlePaste}
            placeholder={
              supportsVoice
                ? '输入、语音或粘贴截图提问；可要求生成流程图/示意图…'
                : '输入或粘贴截图，Enter 发送…'
            }
            rows={3}
            disabled={inputDisabled}
          />

          <button
            type="submit"
            className="send-btn"
            disabled={inputDisabled || isActive || !canSend}
          >
            发送
          </button>
        </div>
      </form>
    </div>
  )
}
