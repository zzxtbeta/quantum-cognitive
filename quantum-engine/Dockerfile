# ── Stage 1: 构建 React 应用 ──────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制 package.json，利用层缓存（只有依赖变了才重装）
COPY package*.json ./
RUN npm ci --registry=https://registry.npmmirror.com

# 复制源码
COPY . .

# Vite 构建时注入生产环境 API 路径（走 Nginx 反向代理）
# 这样 API Key 留在 Nginx 服务端，不暴露在前端 JS 中
ARG VITE_API_BASE_URL=/api
ARG VITE_CHAT_BASE_URL=/chat-api
RUN VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_CHAT_BASE_URL=$VITE_CHAT_BASE_URL \
    npm run build

# ── Stage 2: 用 Nginx 托管静态文件 ───────────────────────────
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 使用自定义 Nginx 配置（含反向代理规则）
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
