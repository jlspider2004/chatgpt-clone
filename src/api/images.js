import { parseApiError } from './parseError'

/**
 * @param {string} prompt
 * @param {{ size?: string, model?: string }} [options]
 * @returns {Promise<{ src: string, revisedPrompt?: string }>}
 */
const DEFAULT_TIMEOUT_MS = 120_000

export async function generateImage(prompt, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response
  try {
    response = await fetch('/api/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        prompt,
        model: options.model || 'gpt-image-1.5',
        n: 1,
        size: options.size || '1024x1024',
        // gpt-image-1.5 不接受 response_format（仅 legacy 模型支持）
      }),
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('配图生成超时（约 2 分钟），请稍后重试。出图时建议选用 DeepSeek，比 Supermind Agent 更快。')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response))
  }

  const data = await response.json()
  const item = data.data?.[0]
  if (!item) throw new Error('未返回图片数据')

  if (item.b64_json) {
    return {
      src: `data:image/png;base64,${item.b64_json}`,
      revisedPrompt: item.revised_prompt || undefined,
    }
  }
  if (item.url) {
    return { src: item.url, revisedPrompt: item.revised_prompt || undefined }
  }
  throw new Error('图片格式无法识别')
}
