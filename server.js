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
    on: {
      proxyReq: (proxyReq) => {
        if (token) {
          proxyReq.setHeader('Authorization', `Bearer ${token}`)
        }
      },
    },
  }),
)

app.use(express.static(path.join(__dirname, 'dist')))
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
