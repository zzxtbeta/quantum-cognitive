# AGENTS

最后更新：2026-03-17

这是一个中文量子研究与投资情报系统，包含：

- 前端工作台：`quantum-engine-frontend/`
- 后端服务：`quantum-chat-backend/`
- 轻量对话代理：`quantum-chat-backend/agent/`
- 深度研究编排器：`quantum-chat-backend/dagent/`
- 技能系统：`quantum-chat-backend/skills/`
- Harness 运行资料：`harness/`
- 项目控制面文档：`docs/`

## 工作总原则

使用“渐进式披露”，不要一上来加载整个仓库。

推荐读取顺序：

1. 本文件
2. `docs/ARCHITECTURE.md`
3. `docs/DESIGN.md`
4. 与任务最相关的 `AGENTS.override.md`
5. 精确到具体实现文件
6. 必要时再读取 skill 的 `references/`、历史报告或运行资料

目标是：在正确时机拿到正确粒度的信息，而不是一次吃下所有上下文。

## 快速路由

如果任务与前端页面、路由、SSE 渲染、聊天工作台、工具日志有关：

- 先读 `quantum-engine-frontend/AGENTS.override.md`
- 再看 `quantum-engine-frontend/src/App.tsx`
- 再进入对应的 `src/pages/`、`src/api/`、`src/hooks/`、`src/components/`

如果任务与后端 API、启动流程、配置、请求链路有关：

- 先读 `quantum-chat-backend/AGENTS.override.md`
- 再看 `quantum-chat-backend/main.py`
- 再看相关 `api/` 文件

如果任务与深度研究、子代理、记忆、研究产物有关：

- 先读 `quantum-chat-backend/AGENTS.override.md`
- 再看 `quantum-chat-backend/dagent/orchestrator.py`
- 再看 `quantum-chat-backend/dagent/subagents/`
- 再看 `quantum-chat-backend/dagent/tools/`
- 最后看 `quantum-chat-backend/api/deep_research.py`

如果任务与轻量 chat agent 有关：

- 先看 `quantum-chat-backend/agent/graph.py`
- 再看 `quantum-chat-backend/agent/tools.py`
- 再看 `quantum-chat-backend/api/chat.py`

如果任务与 skills 有关：

- 先看目标 `quantum-chat-backend/skills/<skill-name>/SKILL.md`
- 只在必要时打开 `references/` 或 `evals/`
- 同时检查 `quantum-chat-backend/api/skills.py` 如何暴露它

## 模式边界

- `chat` 模式：单路径、低上下文、快速回答
- `deep` 模式：多步研究、子代理协作、可审计过程、可沉淀产物

不要随意混淆两种模式。任何改变模式边界的修改，都要同步更新文档和验证规则。

## 文档控制面

`docs/` 中每份文档只回答一个问题：

- `ARCHITECTURE.md`：东西放在哪里，依赖怎么流动
- `DESIGN.md`：系统应该如何工作
- `PLANS.md`：当前阶段先做什么
- `PRODUCT_SENSE.md`：产品为什么这样设计
- `QUALITY_SCORE.md`：如何判断改动和输出是好的
- `RELIABILITY.md`：如何保证复杂任务下仍然可靠
- `SECURITY.md`：什么事绝对不能做
- `ENTROPY_MANAGEMENT.md`：如何防止 Harness 自身腐化
- `HARNESS_ENGINEERING_BLUEPRINT.md`：更长线的总体蓝图

## Harness 运行资料

`harness/` 不是说明文档区，而是运行期和治理期的落点：

- `harness/rules/COMMON_RULES.md`：跨项目可迁移的通用规则
- `harness/rules/ERROR_PATTERNS.md`：新错误类型与对应防错约束
- `harness/tasks/`：任务定义
- `harness/plans/`：执行计划
- `harness/reports/`：阶段性产物和研究报告

原则：

- 通用经验放 `harness/rules/`
- 项目专有规则放 `docs/`
- 临时运行资料不要反向污染总说明文档

## 好改动的标准

好的改动会让系统更容易被人和 Agent 理解：

- 边界更清晰
- 上下文更节制
- 观测更完整
- 约束更明确
- 失败更可恢复
- 产物更可复用

## 熵管理规则

Harness 本身也会腐化，所以必须主动治理：

- 文档一旦变长，就拆分，不要把所有规则塞进一个文件
- 新约束必须写到固定位置，不要临时插在无关文档里
- 新错误类型先记录，再抽象成规则
- 过时规则要删除，不要只追加不清理
- 如果两个文件表达了同一件事，必须明确哪个是主事实来源

## 修改时的同步要求

改动完成前，检查是否还需要同步：

- `docs/` 中的控制面文档
- 对应目录下的 `AGENTS.override.md`
- `harness/rules/ERROR_PATTERNS.md`
- 测试或 eval
- 可靠性或安全性说明

