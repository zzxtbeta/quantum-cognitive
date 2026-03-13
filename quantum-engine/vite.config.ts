import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // 加载 .env 变量供 Vite 开发服务器读取
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        // 数据 API：直接代理到外部数据中台（必须在 /api 之前，路径更具体）
        '/api/data': {
          target: env.VITE_API_BASE_URL || 'https://www.gravaity.ai/datalake/api',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/data/, '/api'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('X-API-Key', env.VITE_API_KEY || '')
            })
          },
        },
        // Chat SSE 流式接口
        '/chat-api': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/chat-api/, ''),
        },
        // 其余后端 API（LLM / 健康检查等）
        '/api': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
