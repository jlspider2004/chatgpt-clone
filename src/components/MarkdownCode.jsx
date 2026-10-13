import MermaidBlock from './MermaidBlock'

export default function MarkdownCode({ inline, className, children, ...props }) {
  const text = String(children).replace(/\n$/, '')
  const lang = /language-(\w+)/.exec(className || '')?.[1]

  if (!inline && lang === 'mermaid') {
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
