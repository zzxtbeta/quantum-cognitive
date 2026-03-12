import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // 数据 API：开发环境代理到后端的 /data 路由
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      // Chat SSE 流式接口
      '/chat-api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/chat-api/, ''),
      },
    },
  },
})
