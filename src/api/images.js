import { parseApiError } from './parseError'

/**
 * @param {string} prompt
 * @param {{ size?: string, model?: string }} [options]
 * @returns {Promise<{ src: string, revisedPrompt?: string }>}
 */
export async function generateImage(prompt, options = {}) {
  const response = await fetch('/api/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      model: options.model || 'gpt-image-1.5',
      n: 1,
      size: options.size || '1024x1024',
      response_format: 'b64_json',
    }),
  })

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
