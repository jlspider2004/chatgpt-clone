import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = process.env.PORT || 8000
const token = process.env.AI_BUILDER_TOKEN

if (!token) {
  console.warn('Warning: AI_BUILDER_TOKEN is not set.')
}

app.use(
  '/api',
  createProxyMiddleware({
    target: 'https://space.ai-builders.com/backend/v1',
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
    proxyTimeout: 120000,
    timeout: 120000,
    on: {
      proxyReq: (proxyReq) => {
        if (token) {
          proxyReq.setHeader('Authorization', `Bearer ${token}`)
        }
      },
      proxyRes: (proxyRes) => {
        if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
          proxyRes.headers['cache-control'] = 'no-cache, no-transform'
          proxyRes.headers['x-accel-buffering'] = 'no'
        }
      },
      error: (err, _req, res) => {
        console.error('API proxy error:', err.message)
        if (!res.headersSent) {
          res.status(502).json({
            error: { message: '后端连接失败，请检查网络后重试。' },
          })
        }
      },
    },
  }),
)

app.use(express.static(path.join(__dirname, 'dist')))
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`)
})
