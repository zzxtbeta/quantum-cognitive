# 前端覆盖规则

作用域：`quantum-engine-frontend/`

请在阅读仓库根目录 `AGENTS.md` 后再使用本文件。

## 边界分层

- `src/App.tsx`：路由入口
- `src/pages/`：用户工作流页面
- `src/api/`：前端 API 适配层与 SSE 传输层
- `src/hooks/`：状态和工作流逻辑
- `src/components/`：复用组件
- `src/contexts/`：全局上下文提供者

## 按任务阅读

如果是页面或路由改动：

1. `src/App.tsx`
2. 对应 `src/pages/`
3. 相关 hook 和 API 适配器
4. 依赖的复用组件

如果是 Deep Chat 改动：

1. `src/pages/Chat.tsx`
2. `src/hooks/useChat.ts`
3. `src/api/chat.ts`
4. 相关组件

如果是 Tool Logs 改动：

1. `src/pages/ToolLogs.tsx`
2. `src/api/toolLogs.ts`
3. 相关类型定义

## 本目录约束

- 前端优先展示系统状态，而不只是美化聊天窗口
- Deep 工作流应尽量显式呈现：规划、执行、验证、产物、失败
- 流式 UI 要能承受部分事件丢失、断连和重复事件
- 后端新增 deep 事件类型时，不要悄悄吞掉，要明确接入或明确忽略
- 能拆成小面板的信息，不要全部挤回一个聊天气泡里

