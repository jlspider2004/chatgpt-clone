import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const token = env.AI_BUILDER_TOKEN

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'https://space.ai-builders.com/backend/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      },
    },
  }
})
