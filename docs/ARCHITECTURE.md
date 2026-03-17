# 架构说明

## 系统总览

这个仓库目前有两个主要运行面：

- `quantum-engine-frontend/`：面向用户的前端研究工作台
- `quantum-chat-backend/`：提供 chat、deep research、skills、记忆、知识沉淀的后端

## 关键边界

### 1. 前端壳层

关键文件：

- `quantum-engine-frontend/src/App.tsx`
- `quantum-engine-frontend/src/components/Layout.tsx`
- `quantum-engine-frontend/src/contexts/`

职责：

- 路由组织
- 页面承载
- 全局布局与上下文提供

### 2. 前端研究工作台

关键文件：

- `quantum-engine-frontend/src/pages/Chat.tsx`
- `quantum-engine-frontend/src/hooks/useChat.ts`
- `quantum-engine-frontend/src/api/chat.ts`
- `quantum-engine-frontend/src/pages/ToolLogs.tsx`

职责：

- 深度研究交互
- 流式状态展示
- 会话历史
- 工具调用审计

### 3. 后端应用壳层

关键文件：

- `quantum-chat-backend/main.py`
- `quantum-chat-backend/core/config.py`

职责：

- 进程启动
- 生命周期
- 全局异常
- 总路由挂载

### 4. 轻量对话代理

关键文件：

- `quantum-chat-backend/agent/graph.py`
- `quantum-chat-backend/agent/tools.py`
- `quantum-chat-backend/api/chat.py`

职责：

- 单路径、低上下文的快速问答
- 不需要深编排时的轻量执行

### 5. 深度研究编排器

关键文件：

- `quantum-chat-backend/dagent/orchestrator.py`
- `quantum-chat-backend/dagent/subagents/`
- `quantum-chat-backend/dagent/tools/`
- `quantum-chat-backend/api/deep_research.py`

职责：

- 规划与委派
- 子代理协作
- 流式状态事件
- 可沉淀研究产物

### 6. 记忆与知识层

关键文件：

- `quantum-chat-backend/core/knowledge_store.py`
- `quantum-chat-backend/core/tool_log.py`
- `quantum-chat-backend/deep_memory.db`
- `quantum-chat-backend/memory.db`

职责：

- 会话记忆
- 工具与模型调用日志
- 研究产物与知识条目

### 7. 技能层

关键文件：

- `quantum-chat-backend/skills/*/SKILL.md`
- `quantum-chat-backend/api/skills.py`

职责：

- 领域技能
- 技能参考资料
- 技能评估样例

## 推荐依赖流向

建议依赖方向保持为：

1. 前端页面
2. 前端 hook / API 适配器
3. 后端 API 路由
4. agent 或 orchestrator
5. 工具、记忆、存储

不要反向穿透。

## 模式边界

### chat 模式

适用于：

- 单工具或单路径即可完成
- 不需要持久化研究产物
- 用户要快速回答，不要完整研究流程

### deep 模式

适用于：

- 任务需要多步规划
- 需要子代理专业分工
- 需要可追踪过程与研究沉淀

## 当前架构重点

当前最重要的不是继续加模型能力，而是把已有系统做成：

- 上下文受控
- 边界清晰
- 状态可观测
- 结果可验证
- 产物可复用

