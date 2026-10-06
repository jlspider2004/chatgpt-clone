const GATEWAY_STATUSES = new Set([404, 502, 503, 504])

function formatJsonDetail(data) {
  const detail = data.detail ?? data.error?.message ?? data.message
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === 'string' ? item : item.msg || JSON.stringify(item)))
      .join('；')
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail)
  return ''
}

function parseHtmlTitle(raw) {
  const match = raw.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match?.[1]?.replace(/\s+/g, ' ').trim() || ''
}

function gatewayMessage(status) {
  if (status === 404) {
    return '服务正在部署或暂时下线，请等 1–2 分钟后刷新页面重试。'
  }
  if (status === 504) {
    return '请求超时，模型可能还在处理。可换用「DeepSeek V4.1 Flash」后重试，或稍后再试。'
  }
  return '服务暂时不可用，可能是网关超时或后端繁忙。可换用「DeepSeek V4.1 Flash」后重试，或稍后再试。'
}

export async function parseApiError(response) {
  const status = response.status
  const contentType = response.headers.get('content-type') || ''
  let raw = ''

  try {
    raw = await response.text()
  } catch {
    raw = ''
  }

  if (contentType.includes('application/json') || raw.trim().startsWith('{')) {
    try {
      const message = formatJsonDetail(JSON.parse(raw))
      if (message) return message
    } catch {
      // fall through
    }
  }

  if (/<!doctype html|<html[\s>]/i.test(raw)) {
    const title = parseHtmlTitle(raw)
    if (GATEWAY_STATUSES.has(status)) {
      return title ? `${title} ${gatewayMessage(status)}` : gatewayMessage(status)
    }
    return title || `请求失败 (${status})`
  }

  const trimmed = raw.trim()
  if (trimmed.length > 280) {
    return GATEWAY_STATUSES.has(status)
      ? gatewayMessage(status)
      : `请求失败 (${status})，服务器返回异常内容。请稍后重试。`
  }

  return trimmed || `请求失败 (${status})`
}
