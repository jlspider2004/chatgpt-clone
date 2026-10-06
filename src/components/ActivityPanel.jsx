export default function ActivityPanel({ activities = [] }) {
  if (!activities.length) return null

  return (
    <div className="activity-panel">
      <div className="activity-header">工作过程</div>
      <ul className="activity-list">
        {activities.map((item, index) => (
          <li key={`${item.text}-${index}`} className={`activity-item ${item.status}`}>
            <span className="activity-icon">
              {item.status === 'done' ? '✓' : '●'}
            </span>
            <span className="activity-text">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
