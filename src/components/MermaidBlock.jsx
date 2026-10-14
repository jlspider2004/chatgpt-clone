import { useEffect, useId, useRef, useState } from 'react'

let mermaidModulePromise = null

function loadMermaid() {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid').then((mod) => {
      mod.default.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'system-ui, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
      })
      return mod.default
    })
  }
  return mermaidModulePromise
}

function isLikelyCompleteChart(source) {
  const s = source.trim()
  if (s.length < 12) return false
  return /flowchart|graph\s|sequenceDiagram|classDiagram|-->|---/.test(s)
}

export default function MermaidBlock({ chart }) {
  const containerRef = useRef(null)
  const reactId = useId().replace(/:/g, '')
  const [error, setError] = useState('')
  const [rendering, setRendering] = useState(true)

  useEffect(() => {
    let cancelled = false
    const source = chart.trim()

    if (!isLikelyCompleteChart(source)) {
      setRendering(false)
      setError('')
      return undefined
    }

    setRendering(true)
    const timer = setTimeout(() => {
      ;(async () => {
        try {
          const mermaid = await loadMermaid()
          if (cancelled) return
          const { svg } = await mermaid.render(`kuailv-mmd-${reactId}-${Date.now()}`, source)
          if (!cancelled && containerRef.current) {
            containerRef.current.innerHTML = svg
            setError('')
          }
        } catch {
          if (!cancelled) {
            setError('流程图渲染失败，请查看下方 Mermaid 源码。')
            if (containerRef.current) containerRef.current.innerHTML = ''
          }
        } finally {
          if (!cancelled) setRendering(false)
        }
      })()
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [chart, reactId])

  return (
    <div className="mermaid-wrap">
      {rendering && <p className="mermaid-pending">正在渲染流程图…</p>}
      {error && <p className="mermaid-error">{error}</p>}
      <div className="mermaid-block" ref={containerRef} />
    </div>
  )
}
