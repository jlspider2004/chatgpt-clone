/** @typedef {{ src: string, name?: string }} UserImage */

export const VISION_MODEL_IDS = [
  'kimi-k2.5',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gpt-5',
]

export const DEFAULT_VISION_MODEL = 'kimi-k2.5'

const IMAGE_GEN_START = '<!-- kuailv-image-gen -->'
const IMAGE_GEN_END = '<!-- /kuailv-image-gen -->'

export function getMessageText(message) {
  if (!message) return ''
  if (typeof message.content === 'string') return message.content
  if (Array.isArray(message.content)) {
    return message.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n')
  }
  return ''
}

export function getMessageImages(message) {
  if (!message) return []
  if (Array.isArray(message.images) && message.images.length) return message.images
  if (Array.isArray(message.content)) {
    return message.content
      .filter((part) => part.type === 'image_url' && part.image_url?.url)
      .map((part) => ({ src: part.image_url.url }))
  }
  return []
}

/** Build stored user message from text + optional image data URLs. */
export function buildUserMessage(text, images = []) {
  const trimmed = text.trim()
  const imgs = images.filter((item) => item?.src)

  if (!imgs.length) {
    return { role: 'user', content: trimmed }
  }

  const parts = []
  if (trimmed) parts.push({ type: 'text', text: trimmed })
  for (const img of imgs) {
    parts.push({ type: 'image_url', image_url: { url: img.src } })
  }

  return {
    role: 'user',
    content: parts,
    images: imgs.map(({ src, name }) => ({ src, name })),
  }
}

export function messageHasImages(message) {
  return getMessageImages(message).length > 0
}

export function conversationHasUserImages(messages) {
  return messages.some((m) => m.role === 'user' && messageHasImages(m))
}

export function resolveChatModel(messages, selectedModel) {
  if (!conversationHasUserImages(messages)) return selectedModel
  if (VISION_MODEL_IDS.includes(selectedModel)) return selectedModel
  return DEFAULT_VISION_MODEL
}

/** OpenAI-compatible messages for /chat/completions (excludes system). */
export function serializeMessagesForApi(messages) {
  return messages.map((message) => {
    if (message.role === 'assistant') {
      return { role: 'assistant', content: message.content || '' }
    }
    if (message.role === 'user') {
      const text = getMessageText(message)
      const images = getMessageImages(message)
      if (!images.length) {
        return { role: 'user', content: text }
      }
      const content = []
      const prompt =
        text ||
        '请仔细查看用户上传的图片，识别其中的文字、表格、图表与业务信息，并结合快驴物流场景给出专业解读。'
      content.push({ type: 'text', text: prompt })
      for (const img of images) {
        content.push({ type: 'image_url', image_url: { url: img.src } })
      }
      return { role: 'user', content }
    }
    return message
  })
}

export function parseImageGenDirective(content) {
  if (!content || typeof content !== 'string') return null
  const start = content.indexOf(IMAGE_GEN_START)
  if (start < 0) return null
  const end = content.indexOf(IMAGE_GEN_END, start)
  const jsonBlock =
    end >= 0
      ? content.slice(start + IMAGE_GEN_START.length, end).trim()
      : content.slice(start + IMAGE_GEN_START.length).trim()
  try {
    const parsed = JSON.parse(jsonBlock)
    if (parsed?.prompt && typeof parsed.prompt === 'string') {
      return {
        prompt: parsed.prompt.trim(),
        size: parsed.size || '1024x1024',
      }
    }
  } catch {
    return null
  }
  return null
}

export function stripImageGenDirective(content) {
  if (!content || typeof content !== 'string') return content || ''
  const start = content.indexOf(IMAGE_GEN_START)
  if (start < 0) return content
  const end = content.indexOf(IMAGE_GEN_END, start)
  if (end >= 0) {
    return (content.slice(0, start) + content.slice(end + IMAGE_GEN_END.length)).trim()
  }
  return content.slice(0, start).trim()
}

export function userWantsGeneratedImage(text) {
  if (!text) return false
  return /生成图|画一[张幅]|示意图|流程图|信息图|架构图|配图|出图|做成图/i.test(text)
}
