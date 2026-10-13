import mermaid from 'mermaid'
import { useEffect, useId, useRef, useState } from 'react'

let mermaidReady = false

function ensureMermaid() {
  if (mermaidReady) return
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'system-ui, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  })
  mermaidReady = true
}

export default function MermaidBlock({ chart }) {
  const containerRef = useRef(null)
  const reactId = useId().replace(/:/g, '')
  const [error, setError] = useState('')

  useEffect(() => {
    ensureMermaid()
    let cancelled = false
    const source = chart.trim()

    ;(async () => {
      setError('')
      try {
        const { svg } = await mermaid.render(`kuailv-mmd-${reactId}-${Date.now()}`, source)
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      } catch {
        if (!cancelled) {
          setError('流程图渲染失败，请查看下方 Mermaid 源码。')
          if (containerRef.current) containerRef.current.innerHTML = ''
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [chart, reactId])

  return (
    <div className="mermaid-wrap">
      {error && <p className="mermaid-error">{error}</p>}
      <div className="mermaid-block" ref={containerRef} />
    </div>
  )
}
