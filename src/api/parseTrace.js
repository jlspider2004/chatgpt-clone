const TOOL_LABELS = {
  web_search: '联网搜索',
  search: '搜索',
  fetch_url: '读取网页',
  url_fetch: '读取网页',
  extract_url: '提取网页内容',
  handoff: '切换模型',
  tavily_search: '搜索资料',
}

export function formatToolName(name) {
  if (!name) return '工具'
  return TOOL_LABELS[name] || name.replace(/_/g, ' ')
}

function pushUnique(steps, step) {
  const key = `${step.text}|${step.status}`
  if (!steps.some((item) => `${item.text}|${item.status}` === key)) {
    steps.push(step)
  }
}

function collectFromObject(node, steps, seen) {
  if (!node || typeof node !== 'object') return
  if (seen.has(node)) return
  seen.add(node)

  if (Array.isArray(node)) {
    node.forEach((item) => collectFromObject(item, steps, seen))
    return
  }

  const tool =
    node.tool ||
    node.tool_name ||
    node.function?.name ||
    node.function_name ||
    node.name

  const action = node.type || node.action || node.step || node.event
  const query =
    node.search_query ||
    node.query ||
    node.keyword ||
    (Array.isArray(node.keywords) ? node.keywords.join('、') : node.keywords)

  if (query && (tool?.includes('search') || action?.includes('search') || node.keywords)) {
    pushUnique(steps, { text: `正在搜索：${query}`, status: 'done' })
  }

  if (node.url && (tool?.includes('fetch') || tool?.includes('url') || action?.includes('fetch'))) {
    const shortUrl = String(node.url).length > 60 ? `${String(node.url).slice(0, 57)}…` : node.url
    pushUnique(steps, { text: `正在读取：${shortUrl}`, status: 'done' })
  }

  if (tool && !String(tool).includes('search')) {
    pushUnique(steps, { text: `正在调用：${formatToolName(tool)}`, status: 'done' })
  }

  if (node.model && action === 'handoff') {
    pushUnique(steps, { text: `正在切换至模型 ${node.model}`, status: 'done' })
  }

  Object.values(node).forEach((value) => collectFromObject(value, steps, seen))
}

export function parseOrchestratorTrace(trace) {
  const steps = []
  collectFromObject(trace, steps, new Set())
  return steps
}

export function parseToolCallDelta(toolCall) {
  const name = toolCall.function?.name
  if (!name) return null

  let argsText = toolCall.function?.arguments || ''
  try {
    const args = JSON.parse(argsText)
    if (args.query) return { text: `正在搜索：${args.query}`, status: 'running' }
    if (args.keywords) {
      const keywords = Array.isArray(args.keywords) ? args.keywords.join('、') : args.keywords
      return { text: `正在搜索：${keywords}`, status: 'running' }
    }
    if (args.url) {
      const shortUrl = args.url.length > 60 ? `${args.url.slice(0, 57)}…` : args.url
      return { text: `正在读取：${shortUrl}`, status: 'running' }
    }
  } catch {
    // arguments may be incomplete while streaming
  }

  return { text: `正在调用：${formatToolName(name)}`, status: 'running' }
}
