# 量子认知引擎 — ECS 傻瓜部署教程

> **目标**：把前端 + 后端部署到阿里云 ECS，浏览器访问 `http://YOUR_IP:3080` 即可用。
> 
> **前提**：ECS 上已有其他服务（本文档会避开常用端口），只占用 **8003**（后端）和 **3080**（前端）。

---

## 第一步：准备 ECS 服务器

### 1.1 开放安全组端口

登录阿里云控制台 → 云服务器 ECS → 你的实例 → 安全组 → 管理规则 → 添加入方向规则：

| 协议 | 端口范围 | 授权对象 | 说明 |
|------|----------|----------|------|
| TCP | 8003/8003 | 0.0.0.0/0 | 后端 API（可选，调试用） |
| TCP | 3080/3080 | 0.0.0.0/0 | 前端网页访问 |

> 如果只想通过浏览器使用，只需开 3080。8003 仅在用 Postman 等工具直接调后端时需要。

### 1.2 安装 Docker

SSH 进入 ECS，执行以下命令（适用于 Ubuntu / Debian / CentOS）：

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 退出并重新登录使 docker 权限生效
exit
# 重新 SSH 进来

# 验证
docker --version
docker compose version
```

> **CentOS 用户**：`curl -fsSL https://get.docker.com | sh` 同样适用。

### 1.3 配置 Docker 镜像加速（中国大陆必须做）

国内 ECS 默认无法访问 Docker Hub，需配置镜像源，否则 `docker compose up --build` 会超时报错。

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com",
    "https://mirror.baidubce.com",
    "https://ccr.ccs.tencentyun.com"
  ]
}
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker

# 验证（能看到 Registry Mirrors 列表即正常）
docker info | grep -A 5 "Registry Mirrors"
```

---

## 第二步：部署代码

### 2.1 克隆仓库

```bash
cd /home   # 或者你喜欢的目录

git clone https://github.com/你的用户名/你的仓库名.git quantum
cd quantum
```

> 如果仓库是私有的，需要先配置 SSH Key 或使用 Personal Access Token。

### 2.2 创建环境变量文件

```bash
# 复制模板
cp .env.example .env

# 编辑（填入你的真实值）
nano .env
```

`.env` 文件内容说明：

```bash
# 阿里云 DashScope API Key（必填）
# 登录 https://dashscope.aliyun.com/ 创建
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Tavily 搜索 API Key（可选，不填则无网络搜索功能）
TAVILY_API_KEY=

# 你的 ECS 公网 IP（必填，例如 47.110.123.45）
ECS_IP=47.110.123.45
```

保存退出：`Ctrl+O` → `Enter` → `Ctrl+X`

> ⚠️ `.env` 文件包含 API Key，**已加入 .gitignore**，绝对不会被提交到 GitHub。  
> ⚠️ **不要** 把真实的 API Key 写进 `.env.example` 或其他可提交文件。

### 2.3 启动服务

```bash
# 首次部署（构建镜像 + 启动容器）
docker compose up -d --build
```

> 第一次会拉取 Node.js 和 Python 镜像、安装依赖，大约需要 **3~8 分钟**，取决于 ECS 带宽。
> 之后每次更新只重建变化的层，会快很多。

等待完成后，检查状态：

```bash
docker compose ps
```

正常输出 ↓：

```
NAME               STATUS          PORTS
quantum-backend    Up (healthy)    0.0.0.0:8003->8003/tcp
quantum-frontend   Up              0.0.0.0:3080->80/tcp
```

### 2.4 访问网站

打开浏览器，访问：
```
http://你的ECS公网IP:3080
```

---

## 第三步：日常使用

### 查看日志

```bash
# 同时查看前后端日志
docker compose logs -f

# 只看后端
docker compose logs -f backend

# 只看前端（通常只有 Nginx 访问日志）
docker compose logs -f frontend
```

### 重启服务

```bash
docker compose restart
```

### 停止服务

```bash
docker compose down
```

> `docker compose down` **不会**删除数据卷，对话记忆和 Skill 仍然保留。

---

## 第四步：代码更新（核心流程）

**每次 GitHub 推送新代码后**，在 ECS 上执行：

```bash
cd /home/quantum   # 进入项目目录

./deploy.sh
```

> 这个脚本会自动：
> 1. `git pull` 拉取最新代码  
> 2. `docker compose build` 只重建有变化的镜像  
> 3. `docker compose up -d` 滚动更新容器

**如果碰到权限问题**（`Permission denied`）：

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 常见问题

### Q：容器起来了但网页打不开？

1. 检查 ECS 安全组是否已开放 3080 端口
2. 检查容器是否健康：`docker compose ps`
3. 查看后端日志找报错：`docker compose logs backend | tail -50`

### Q：AI 不回复 / 报 API 错误？

1. 检查 `.env` 中的 `DASHSCOPE_API_KEY` 是否正确
2. 让配置生效：`docker compose up -d`（会重读 `.env`）

### Q：更新代码后功能没变化？

可能是浏览器缓存了旧的 JS 文件，强制刷新：
- Windows/Linux: `Ctrl+Shift+R`  
- Mac: `Cmd+Shift+R`

### Q：想彻底重装（清除所有数据）？

```bash
# ⚠️ 危险操作！会删除所有对话记忆和 Skill
docker compose down -v
docker compose up -d --build
```

### Q：如何修改前端 API 地址指向不同后端？

在 `quantum-engine/nginx.conf` 中修改 `proxy_pass` 地址，然后重新构建前端：

```bash
docker compose build frontend
docker compose up -d frontend
```

---

## 目录结构（供参考）

```
项目根目录/
├── docker-compose.yml        # Docker 编排配置
├── .env                      # 你的 API Key（不进 Git）
├── .env.example              # 环境变量模板
├── deploy.sh                 # 一键更新脚本
│
├── quantum-chat-backend/     # Python FastAPI 后端
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── main.py
│   ├── requirements.txt
│   └── agent/
│       └── skills/           # 用户创建的 Skill（通过 volume 持久化）
│
└── quantum-engine/           # React 前端
    ├── Dockerfile
    ├── .dockerignore
    ├── nginx.conf            # Nginx 配置（含反向代理规则）
    └── src/
```

---

## 端口说明

| 端口 | 用途 | 说明 |
|------|------|------|
| **3080** | 前端网页 | 浏览器访问这个端口 |
| **8003** | 后端 API | 仅在容器内部网络中使用，外部可选开放 |

> 前端的 `/api/...` 和 `/chat-api/...` 请求由 **Nginx 在服务器端转发**，  
> **不需要**浏览器直接访问后端端口，API Key 也不会暴露给用户。
