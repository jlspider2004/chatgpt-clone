import { parseApiError } from './parseError'

const LOGISTICS_TERMS = [  '快驴',
  '物流',
  '缺货',
  'FDC',
  '进向',
  '配送',
  '仓储',
  '提揽点',
  '仓绑',
  '抽点',
  '串仓',
  '下沉市场',
  '包裹化',
  '2.5分',
].join(',')

export async function transcribeAudio(blob, extension = 'webm') {
  const safeExt = extension.replace(/[^a-z0-9]/gi, '') || 'webm'
  const formData = new FormData()
  formData.append('audio_file', blob, `recording.${safeExt}`)
  formData.append('language', 'zh-CN')
  formData.append('terms', LOGISTICS_TERMS)

  const response = await fetch('/api/audio/transcriptions', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response))
  }

  const data = await response.json()
  return data.text?.trim() || ''
}
