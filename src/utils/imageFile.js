const MAX_EDGE = 1600
const JPEG_QUALITY = 0.82
const MAX_BYTES = 900_000

export const ACCEPT_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif'
export const MAX_ATTACHMENTS = 5

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('无法解析图片'))
    img.src = src
  })
}

async function compressDataUrl(dataUrl) {
  const img = await loadImage(dataUrl)
  let { width, height } = img
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  width = Math.round(width * scale)
  height = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)

  let quality = JPEG_QUALITY
  let out = canvas.toDataURL('image/jpeg', quality)
  while (out.length > MAX_BYTES * 1.37 && quality > 0.45) {
    quality -= 0.08
    out = canvas.toDataURL('image/jpeg', quality)
  }
  return out
}

/** @returns {Promise<{ src: string, name: string }>} */
export async function prepareImageAttachment(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('仅支持图片文件')
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('单张图片不能超过 12MB')
  }
  const raw = await readFileAsDataUrl(file)
  const src = file.type === 'image/gif' ? raw : await compressDataUrl(raw)
  return { src, name: file.name || 'image.jpg' }
}
