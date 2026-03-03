# ── quantum-chat-backend Dockerfile ──────────────────────────
# 基础镜像：Python 3.11 精简版
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖（sqlite3 已内置于 Python）
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 先复制 requirements，利用 Docker 层缓存——
# 只有 requirements 变了才重新 pip install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制源码（不含 .env / memory.db / logs，见 .dockerignore）
COPY . .

# 创建运行时目录（数据/技能/日志通过 volume 挂载）
RUN mkdir -p /app/data /app/logs

EXPOSE 8003

# 健康检查：每 30s 检查一次 /health 接口
HEALTHCHECK --interval=30s --timeout=8s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8003/health || exit 1

CMD ["python", "main.py"]
