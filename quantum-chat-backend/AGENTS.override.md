# 后端覆盖规则

作用域：`quantum-chat-backend/`

请在阅读仓库根目录 `AGENTS.md` 后再使用本文件。

## 边界分层

- `main.py`：应用入口、生命周期、中间件、总路由
- `api/`：HTTP 合约与 SSE 事件出口
- `agent/`：轻量对话代理
- `dagent/`：深度研究编排器与子代理
- `core/`：配置、记忆、日志、知识存储
- `skills/`：技能与参考资料
- `tests/`：接口与代理验证

## 按任务阅读

如果是 API 改动：

1. `main.py`
2. 对应 `api/*.py`
3. 对应 `core/` 或 agent 层实现
4. 相关测试

如果是 deep 编排改动：

1. `dagent/orchestrator.py`
2. 对应子代理
3. 对应工具
4. `api/deep_research.py`
5. 相关测试或 eval

如果是 chat agent 改动：

1. `agent/graph.py`
2. `agent/tools.py`
3. `api/chat.py`
4. 相关测试

如果是 skill 改动：

1. 目标 `skills/<name>/SKILL.md`
2. 必要的 `references/` 或 `evals/`
3. `api/skills.py`
4. 加载该 skill 的 agent 或 orchestrator

## 本目录约束

- `chat` 与 `deep` 的职责要显式分离
- 新的内部接口优先返回结构化数据，而不是大段自由文本
- 新的持久化动作必须写清楚存到哪里、如何读取、失败怎么办
- 新的 SSE 事件必须保持形状稳定、便于前端处理和测试
- 成本高、风险高、外部依赖强的工具必须定义回退路径

