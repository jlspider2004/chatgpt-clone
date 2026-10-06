import { DEFAULT_MODEL, FALLBACK_MODELS, SYSTEM_PROMPT, TITLE_MODEL } from '../config/kuailv'
import { parseOrchestratorTrace, parseToolCallDelta } from './parseTrace'

const NON_STREAMING_MODELS = new Set(['supermind-agent-v1'])

function mergeModels(apiModels) {
  const byId = new Map(FALLBACK_MODELS.map((item) => [item.id, item]))

  for (const item of apiModels) {
    const existing = byId.get(item.id)
    byId.set(item.id, {
      id: item.id,
      label: existing?.label || item.label || item.id,
      description: item.description || existing?.description || '',
    })
  }

  if (!byId.has(DEFAULT_MODEL)) {
    const fallback = FALLBACK_MODELS.find((item) => item.id === DEFAULT_MODEL)
    if (fallback) byId.set(DEFAULT_MODEL, fallback)
  }

  return [...byId.values()].sort((a, b) => {
    if (a.id === DEFAULT_MODEL) return -1
    if (b.id === DEFAULT_MODEL) return 1
    return 0
  })
}

export async function fetchModels() {
  try {
    const response = await fetch('/api/models')
    if (!response.ok) throw new Error('models fetch failed')
    const data = await response.json()
    const models = (data.data ?? [])
      .map((item) => ({
        id: item.id,
        label: item.id,
        description: item.description || item.owned_by || '',
      }))
      .filter((item) => item.id)
    return models.length ? mergeModels(models) : FALLBACK_MODELS
  } catch {
    return FALLBACK_MODELS
  }
}

function buildMessages(messages) {
  return [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
}

function supportsStreaming(model) {
  return !NON_STREAMING_MODELS.has(model)
}

function isStreamingUnsupportedError(errorText) {
  return /streaming not supported/i.test(errorText)
}

async function requestCompletion(messages, model, stream) {
  return fetch('/api/chat/completions?debug=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: buildMessages(messages),
      stream,
    }),
  })
}

function parseSseBlock(block, state) {
  const lines = block.split('\n')
  let eventData = ''

  for (const line of lines) {
    if (line.startsWith('data:')) {
      eventData += line.slice(5).trim()
    }
  }

  if (!eventData || eventData === '[DONE]') return

  let parsed
  try {
    parsed = JSON.parse(eventData)
  } catch {
    return
  }

  if (parsed.orchestrator_trace) {
    state.trace = parsed.orchestrator_trace
  }

  const choice = parsed.choices?.[0]
  const delta = choice?.delta

  if (delta?.content) {
    state.content += delta.content
    state.events.push({ type: 'delta', content: delta.content, fullContent: state.content })
  }

  if (delta?.tool_calls?.length) {
    for (const toolCall of delta.tool_calls) {
      const idx = toolCall.index ?? 0
      if (!state.toolCalls[idx]) {
        state.toolCalls[idx] = { function: { name: '', arguments: '' } }
      }
      if (toolCall.id) state.toolCalls[idx].id = toolCall.id
      if (toolCall.function?.name) state.toolCalls[idx].function.name = toolCall.function.name
      if (toolCall.function?.arguments) {
        state.toolCalls[idx].function.arguments += toolCall.function.arguments
      }

      const activity = parseToolCallDelta(state.toolCalls[idx])
      if (activity) {
        state.events.push({ type: 'activity', activity })
      }
    }
  }

  if (choice?.message?.content) {
    state.content = choice.message.content
  }
}

async function* yieldJsonCompletion(data) {
  const content = data.choices?.[0]?.message?.content || ''
  if (data.orchestrator_trace) {
    for (const activity of parseOrchestratorTrace(data.orchestrator_trace)) {
      yield { type: 'activity', activity }
    }
  }
  yield { type: 'activity', activity: { text: '正在生成回答…', status: 'running' } }
  if (content) {
    yield { type: 'delta', content, fullContent: content }
  }
  yield { type: 'done', content, trace: data.orchestrator_trace ?? null }
}

export async function* streamChat(messages, model) {
  yield { type: 'activity', activity: { text: '正在理解您的问题…', status: 'running' } }
  yield { type: 'activity', activity: { text: `正在调用 ${model} 模型…`, status: 'running' } }

  if (!supportsStreaming(model)) {
    yield {
      type: 'activity',
      activity: { text: 'Agent 正在搜索与推理，请稍候…', status: 'running' },
    }
  }

  let useStream = supportsStreaming(model)
  let response = await requestCompletion(messages, model, useStream)

  if (!response.ok) {
    const errorText = await response.text()
    if (useStream && isStreamingUnsupportedError(errorText)) {
      useStream = false
      yield {
        type: 'activity',
        activity: { text: '该模型不支持流式输出，切换为完整响应模式…', status: 'running' },
      }
      response = await requestCompletion(messages, model, false)
      if (!response.ok) {
        const retryError = await response.text()
        throw new Error(retryError || `Request failed (${response.status})`)
      }
    } else {
      throw new Error(errorText || `Request failed (${response.status})`)
    }
  }

  const contentType = response.headers.get('content-type') || ''
  if (!useStream || !contentType.includes('text/event-stream')) {
    const data = await response.json()
    yield* yieldJsonCompletion(data)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const state = {
    content: '',
    trace: null,
    toolCalls: [],
    events: [],
    gotFirstToken: false,
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''

    for (const part of parts) {
      const beforeLen = state.content.length
      parseSseBlock(part, state)

      if (!state.gotFirstToken && state.content.length > beforeLen) {
        state.gotFirstToken = true
        state.events.push({
          type: 'activity',
          activity: { text: '正在生成回答…', status: 'running' },
        })
      }

      for (const event of state.events) {
        yield event
      }
      state.events = []
    }
  }

  if (buffer.trim()) {
    parseSseBlock(buffer, state)
    for (const event of state.events) {
      yield event
    }
  }

  if (state.trace) {
    for (const activity of parseOrchestratorTrace(state.trace)) {
      yield { type: 'activity', activity }
    }
  }

  yield {
    type: 'done',
    content: state.content,
    trace: state.trace,
  }
}

export async function sendChat(messages, model) {
  let content = ''
  for await (const event of streamChat(messages, model)) {
    if (event.type === 'done') {
      content = event.content
    }
  }
  return content
}

export async function generateTitle(userMessage, assistantMessage) {
  try {
    const response = await fetch('/api/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: TITLE_MODEL,
        messages: [
          {
            role: 'system',
            content:
              '根据对话内容生成一个简短的中文标题，不超过15个字，不要引号、不要标点结尾。只返回标题本身。',
          },
          { role: 'user', content: userMessage },
          { role: 'assistant', content: assistantMessage.slice(0, 300) },
        ],
        max_tokens: 40,
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const title = data.choices?.[0]?.message?.content?.trim()
    return title?.replace(/^["'「『]|["'」』]$/g, '') || null
  } catch {
    return null
  }
}
