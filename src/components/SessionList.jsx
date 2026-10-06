import { APP_NAME } from '../config/kuailv'

export default function SessionList({
  appName = APP_NAME,
  sessions,
  activeSessionId,
  open,
  onClose,
  onSelect,
  onCreate,
  onDelete,
}) {
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)

  const handleSelect = (id) => {
    onSelect(id)
    onClose?.()
  }

  const handleCreate = () => {
    onCreate()
    onClose?.()
  }

  return (
    <>
      <div
        className={`sidebar-overlay ${open ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-badge">{appName}</div>
        </div>

        <div className="sidebar-header">
          <button type="button" className="new-chat-btn" onClick={handleCreate}>
            <span className="new-chat-icon">+</span>
            新建对话
          </button>
        </div>

        <div className="session-list">
          {sorted.length === 0 && <p className="session-empty">暂无对话</p>}
          {sorted.map((session) => (
            <div
              key={session.id}
              className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
            >
              <button
                type="button"
                className="session-title-btn"
                onClick={() => handleSelect(session.id)}
                title={session.title}
              >
                {session.title}
              </button>
              <button
                type="button"
                className="session-delete-btn"
                onClick={() => onDelete(session.id)}
                aria-label="删除对话"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
