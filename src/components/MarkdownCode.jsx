import MermaidBlock from './MermaidBlock'

export default function MarkdownCode({
  inline,
  className,
  children,
  renderDiagrams = true,
  ...props
}) {
  const text = String(children).replace(/\n$/, '')
  const lang = /language-(\w+)/.exec(className || '')?.[1]

  if (!inline && lang === 'mermaid') {
    if (!renderDiagrams) {
      return (
        <pre className="md-code-block mermaid-pending-block">
          <code className={className}>{text}</code>
          <span className="mermaid-pending-hint">流程图将在回答完成后渲染…</span>
        </pre>
      )
    }
    return <MermaidBlock chart={text} />
  }

  if (inline) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  }

  return (
    <pre className="md-code-block">
      <code className={className} {...props}>
        {children}
      </code>
    </pre>
  )
}
