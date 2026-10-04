export default function SessionList({
  sessions,
  activeSessionId,
  onSelect,
  onCreate,
  onDelete,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button type="button" className="new-chat-btn" onClick={onCreate}>
          + New chat
        </button>
      </div>

      <div className="session-list">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
          >
            <button
              type="button"
              className="session-title-btn"
              onClick={() => onSelect(session.id)}
            >
              {session.title}
            </button>
            <button
              type="button"
              className="session-delete-btn"
              onClick={() => onDelete(session.id)}
              aria-label="Delete chat"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
