# Harness Engineering 蓝图

更新时间：2026-03-17

## 1. 目标

把当前项目从“前后端 + LLM/DeepAgent 功能”升级为“面向 agent 的可约束、可验证、可观测、可持续演进的工程系统”。

这份蓝图不是要推翻现有实现，而是基于当前仓库已经存在的能力继续往前推进：

- 前端已经有 Deep 模式、线程历史、Tool Logs 可视化
- 后端已经有 `deepagents` 编排、多子代理、skills、SQLite checkpoint、知识存储
- 项目已经有较多业务文档和技能文件，但缺少项目级 harness 入口、执行约束和统一验证闭环

## 2. 当前项目的真实基线

### 2.1 前端现状

前端位于 `quantum-engine/`，核心特征：

- 路由集中在 `quantum-engine/src/App.tsx`
- Deep 模式 Chat 页面在 `quantum-engine/src/pages/Chat.tsx`
- SSE 接入在 `quantum-engine/src/api/chat.ts`
- Tool Logs 可视化在 `quantum-engine/src/pages/ToolLogs.tsx`
- 已有较好的“代理执行过程可视化”基础

### 2.2 后端现状

后端位于 `quantum-chat-backend/`，实际存在两套 agent 运行模式：

- 普通 chat agent：`quantum-chat-backend/agent/graph.py`
- deep orchestrator：`quantum-chat-backend/dagent/orchestrator.py`

其中 deep orchestrator 已经用了 `deepagents.create_deep_agent(...)`，并具备：

- 子代理委派
- `write_todos` 驱动的复杂任务拆解
- SQLite checkpointer
- in-memory store
- skills 注入
- SSE 流式事件回传
- tool / llm 调用日志沉淀

### 2.3 已经具备的 harness 种子

从 harness engineering 视角看，这个项目其实已经有不少“半成品”：

- `skills/` 已经是技能系统雏形
- `api/deep_research.py` 已经是事件总线和观测层雏形
- `core/tool_log.py` + Tool Logs 页面已经是 trace/审计雏形
- `core/knowledge_store.py` 已经是研究产物沉淀雏形
- `docs/` 已经有业务知识，但缺乏 agent 可执行入口

### 2.4 当前关键缺口

当前最大的缺口不是模型能力，而是项目级 harness 缺位：

1. 缺少根级 `AGENTS.md`
2. 缺少统一的 repo contract
3. 缺少“任务 -> 计划 -> 执行 -> 验证 -> 沉淀”的固定闭环
4. chat agent 与 deep orchestrator 分裂，边界不够清晰
5. skill、docs、知识库之间缺少统一索引
6. 前端缺少 agent 计划态、验证态、失败态的可视化
7. 测试主要覆盖接口正确性，尚未覆盖代理行为质量
8. 记忆体系存在，但缺少分层策略和治理规则

## 3. 设计原则

### 3.1 人负责 steering，系统负责 execution

人不再直接规定每一步代码，而是规定：

- 任务边界
- 约束
- 允许使用的工具
- 验收标准
- 产物落点

### 3.2 把隐性知识改成显性知识

凡是只存在于脑子、聊天记录、口头约定里的规则，对 agent 都等于不存在。项目知识必须变成：

- 仓库内文档
- skills
- templates
- schema
- checklist

### 3.3 把“品味”编码成可执行规则

例如：

- 哪类任务必须走 deep 模式
- 哪些工具在什么条件下才能调用
- 研究报告必须包含哪些字段
- 哪些接口改动必须补测试
- 哪些结果必须写入 knowledge store

### 3.4 先强化闭环，再追求更强模型

优先级应当是：

1. 文档可读
2. 执行可观测
3. 结果可验证
4. 产物可沉淀
5. 然后才是更复杂的 agent autonomy

## 4. 目标蓝图

### 4.1 仓库顶层建议结构

建议在当前仓库逐步演进到下面的结构：

```text
/
  AGENTS.md
  docs/
    agent-playbook/
      product-map.md
      architecture-map.md
      backend-map.md
      frontend-map.md
      research-workflows.md
      verification-checklists.md
      failure-playbook.md
  harness/
    tasks/
    plans/
    evals/
    templates/
    reports/
  quantum-chat-backend/
  quantum-engine/
```

其中：

- `AGENTS.md` 负责“总规则 + 路由规则 + 目录索引”
- `docs/agent-playbook/` 负责“静态知识地图”
- `harness/tasks/` 负责任务定义
- `harness/plans/` 负责结构化执行计划
- `harness/evals/` 负责行为验证
- `harness/templates/` 负责报告、研究、PR、调研模板
- `harness/reports/` 负责落地产物

### 4.2 根级 AGENTS.md 应承担的职责

建议新增根级 `AGENTS.md`，内容不要太长，重点是“路由和约束”，不写成长手册。

应该包含：

1. 项目定位
2. 前端/后端/agent/skills/knowledge 的目录地图
3. 哪类任务优先看哪些文件
4. Deep 模式与普通 Chat 模式的边界
5. 允许修改范围与高风险区域
6. 交付要求
7. 验证要求
8. 产物沉淀要求

建议明确的路由规则：

- 前端页面改动：先读 `quantum-engine/src/App.tsx` 和对应 page/api/hook
- 后端接口改动：先读 `quantum-chat-backend/main.py` 和对应 `api/`
- deep orchestrator 改动：先读 `quantum-chat-backend/dagent/orchestrator.py`
- 普通 chat agent 改动：先读 `quantum-chat-backend/agent/graph.py`
- skill 改动：必须同步检查 `api/skills.py` 暴露结果
- 报告产物：优先写入 knowledge store 或 `harness/reports/`

### 4.3 文档分层

建议把项目知识拆成四层，而不是继续混在 `docs/` 里：

#### A. Steering 文档

给人和 agent 看“全局规则”：

- `AGENTS.md`
- `docs/agent-playbook/product-map.md`
- `docs/agent-playbook/architecture-map.md`

#### B. Execution 文档

给 agent 看“如何做具体工作”：

- `docs/agent-playbook/research-workflows.md`
- `docs/agent-playbook/verification-checklists.md`
- `docs/agent-playbook/failure-playbook.md`

#### C. Skill 文档

给 deepagents 在任务中按需加载：

- `quantum-chat-backend/skills/*/SKILL.md`

#### D. Artifact 文档

给系统沉淀结果：

- `core/knowledge_store.py` 管理的研究结果
- `harness/reports/*.md`

## 5. 针对当前项目的重点优化方向

### 5.1 统一两套 agent 叙事

当前后端里存在两套逻辑：

- `agent/graph.py` 更像轻量对话代理
- `dagent/orchestrator.py` 更像主力研究代理

建议明确：

- `chat` 模式负责轻问答、单步查询、快速探索
- `deep` 模式负责多步研究、调研、综合研判、产物沉淀

并在文档中固定判断标准：

- 单工具即可完成 -> `chat`
- 需要任务拆解 / 子代理 / 多源整合 -> `deep`
- 需要保存研究产物 -> `deep`

如果后续继续演进，建议中期收敛为“一套主 harness + 两种入口模式”，而不是两套风格各自生长。

### 5.2 把 skills 从“有”变成“可治理”

当前 `skills/` 已经很好，但治理层还不够强。建议给每个 skill 增加统一约束：

- 输入适用范围
- 输出格式契约
- 使用时机
- 依赖工具
- 失败回退策略
- eval 样例

建议每个 skill 目录统一包含：

```text
skill-name/
  SKILL.md
  references/
  evals/
  templates/
```

并把 `evals/evals.json` 真正纳入回归流程，而不是仅作为静态文件存在。

### 5.3 建立任务文件和计划文件

现在 deep agent 依赖运行时 `write_todos`，但缺少仓库外显的任务结构。

建议补两类文件：

#### `harness/tasks/*.md`

描述任务的：

- 目标
- 输入上下文
- 约束
- 预期产物
- 验收标准

#### `harness/plans/*.md`

描述执行过程的：

- 步骤分解
- 当前状态
- 风险点
- 已完成验证
- 剩余问题

意义是：

- 人能接管
- agent 能续跑
- 失败后能复盘

### 5.4 强化验证层，而不是只验证 API 通不通

当前测试主要验证：

- 接口能返回
- SSE 格式正确
- agent 可以初始化

这对 harness 来说还不够。建议新增三类验证：

#### A. Contract tests

验证：

- `chat` / `deep` 的返回事件结构稳定
- tool log 字段稳定
- knowledge item schema 稳定

#### B. Behavior evals

验证：

- 哪类问题会不会正确路由到 deep
- deep 是否会调用预期子代理
- 引用约束是否被遵守
- 是否存在幻觉 URL / 无来源评分

#### C. Artifact quality evals

验证：

- 报告结构是否完整
- 来源字段是否完整
- 是否保存了 research artifact
- tool log 与最终报告是否一致

### 5.5 补前端的“计划态”和“验证态”

当前前端已经能看到：

- token streaming
- 子代理启动
- 工具调用历史

下一步建议新增三个 UI 区块：

1. Plan 面板
2. Verification 面板
3. Artifact 面板

建议效果：

- Plan 面板：展示 `write_todos` 的状态流转
- Verification 面板：展示已完成的检查项、失败项、缺失项
- Artifact 面板：展示本轮是否写入 knowledge store / 报告文件

这会让 Deep 模式从“会动的聊天框”变成“可审计的研究工作台”。

### 5.6 建立项目级 memory policy

当前有三种信息存储倾向：

- thread memory
- tool logs
- knowledge artifacts

建议明确分层：

- 短期记忆：thread 内消息和 todos
- 中期记忆：tool logs、turns、运行上下文
- 长期记忆：knowledge store、研究报告、结构化知识

并明确规则：

- 临时搜索结果不要进入长期记忆
- 完整研究结论必须写入长期记忆
- 长期记忆必须有 category / title / source / time

### 5.7 建立失败治理机制

agent 项目最怕“能跑，但慢慢变脏”。建议提前定义失败策略：

- 子代理超时怎么办
- tool 无返回怎么办
- SSE 中断怎么办
- skill 更新后如何 reload
- 哪些错误只告警，哪些错误必须阻断输出

建议增加 `docs/agent-playbook/failure-playbook.md`，专门定义这些策略。

## 6. deepagents / LangChain 文档对当前项目的直接启发

结合 LangChain 官方文档，可以把当前项目的优化点理解得更清楚：

### 6.1 Deep Agents 本身就是 harness

官方把 `deepagents` 定位为一种 agent harness，而不是普通工具调用循环。

对这个项目的含义是：

- 你现在的重点不是“再包一层 agent”
- 而是把 `deepagents` 周边的约束、技能、观测、记忆、前端可视化补齐

### 6.2 harness 的核心能力要完整闭环

官方列出的核心能力包括：

- planning
- virtual filesystem
- subagents
- context management
- long-term memory
- human-in-the-loop
- skills

而当前项目已经覆盖其中一部分，最欠缺的是：

- 项目级 planning 外显化
- 明确的人在环审批点
- 统一 memory policy
- 技能治理与评估

### 6.3 子代理适合做上下文隔离，不适合所有事

官方强调 subagent 的价值是 context isolation 和 specialization。

这意味着你现在的三个子代理设计方向是对的，但需要继续约束：

- 每个子代理只负责自己最擅长的事实域
- 主代理不要重复做子代理已经能完成的工作
- 子代理输出应尽量结构化，避免主代理二次压缩时丢信息

### 6.4 可以引入 human-in-the-loop

官方 harness 能在工具调用前做 interrupt。

对当前项目很有价值的场景：

- 写知识库前确认 category 和 title
- 覆盖已有研究报告前确认 overwrite
- 调用昂贵外部搜索前确认
- 删除 thread / tool logs 前确认

这会让“深度研究”更接近研究工作流，而不是黑箱自动化。

## 7. 分阶段落地路线

### Phase 1：建立最小 harness 骨架

目标：让仓库具备清晰入口和工作方式。

建议动作：

1. 新增根级 `AGENTS.md`
2. 新增 `docs/agent-playbook/`
3. 新增 `harness/tasks/`、`harness/plans/`、`harness/reports/`
4. 固定 `chat` 与 `deep` 模式边界
5. 补一份项目术语表和目录地图

完成标志：

- 新人或 agent 进入仓库后知道先读什么
- 同一类任务不会走完全不同的实现路径

### Phase 2：把执行过程结构化

目标：让 deep 模式变成标准工作流。

建议动作：

1. 前端展示 todos / plan
2. 后端暴露 plan / turn / artifact 状态
3. 研究任务统一落一个 artifact
4. skill 使用过程可追踪
5. 失败路径有统一事件格式

完成标志：

- 用户能看到“为什么这样做”
- 研究任务有过程、有结果、有沉淀

### Phase 3：建立评估和治理

目标：防止系统越跑越脏。

建议动作：

1. 为关键技能建立 evals 回归
2. 建立 deep 路由评估集
3. 建立引用合规评估
4. 建立 artifact 质量评估
5. 建立知识库写入校验

完成标志：

- 改 prompt / skill / orchestrator 后能知道是否退化

### Phase 4：引入人在环和更强记忆

目标：提高安全性和长期复用能力。

建议动作：

1. 对关键工具启用 human-in-the-loop
2. 把长期记忆从简单 artifact 扩展为结构化知识层
3. 给研究主题建立持续更新机制
4. 建立跨线程研究脉络追踪

完成标志：

- agent 不只是“一次性回答”
- 而是“持续积累认知资产”

## 8. 优先级最高的五件事

如果你现在只想做最小但高收益的尝试，优先做这五件事：

1. 在仓库根目录新增 `AGENTS.md`
2. 新建 `docs/agent-playbook/architecture-map.md`
3. 新建 `harness/tasks/` 与 `harness/plans/`
4. 给 Deep 模式增加 todo/plan 可视化
5. 为 deep orchestrator 增加一组行为 evals

## 9. 我对这个项目的判断

这个项目很适合做 harness engineering 试验田，原因有三点：

1. 你已经有真实 agent 系统，而不是停留在聊天 demo
2. 你已经有 skills、日志、知识沉淀、子代理这些关键部件
3. 你的业务本身就是“研究与认知组织”，天然适合用 harness 方法做结构化增强

真正的机会不在于“让 agent 更像人”，而在于：

- 让知识对 agent 可见
- 让执行对人可见
- 让结果对系统可复用

如果这三件事做起来，这个项目会从“一个能用的深度研究应用”，升级成“一个持续积累认知资产的 agent operating system”。

