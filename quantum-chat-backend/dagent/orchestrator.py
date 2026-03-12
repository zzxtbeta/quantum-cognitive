"""
量子赛道认知引擎 — 主 Orchestrator Agent

使用 deepagents.create_deep_agent 构建，带三个专业子Agent：
  - paper-researcher : 顶刊论文技术分析
  - people-intel     : 人才/团队情报
  - news-market      : 市场/融资/政策动态

主Agent 负责：
  1. 接受投资经理问题
  2. 规划任务，分派给三个子Agent 并发/串行执行
  3. 汇总结果，输出最终投资研判报告
"""
from __future__ import annotations

import logging
import os
from datetime import date

from deepagents import create_deep_agent
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.store.memory import InMemoryStore

from dagent.subagents.paper_agent import paper_research_subagent
from dagent.subagents.people_agent import people_intel_subagent
from dagent.subagents.news_agent import news_market_subagent
from dagent.tools.cache_tools import save_research_artifact

logger = logging.getLogger(__name__)

# ─── 全局单例 ─────────────────────────────────────────────────────────────────
_agent = None
_checkpointer = None
_store = None

# ─── 运行时模型配置（可通过 switch_model 切换，无需重启）────────────────────────
_active_llm_config: dict | None = None


def _backend_factory(rt):
    """CompositeBackend：工作区用 StateBackend，/memories/ 用 StoreBackend"""
    return CompositeBackend(
        default=StateBackend(rt),
        routes={"/memories/": StoreBackend(rt)},
    )


def get_active_llm_config() -> dict:
    """返回当前激活的 LLM 配置。首次调用时从 settings.active_llm 初始化。"""
    global _active_llm_config
    if _active_llm_config is None:
        from core.config import settings
        preset = settings.active_llm
        presets = settings.model_presets
        cfg = presets.get(preset) or next(iter(presets.values()))
        _active_llm_config = {**cfg, "preset": preset}
    return _active_llm_config


async def _build_agent() -> None:
    """用当前 _active_llm_config 重建 LLM + agent，复用已有 checkpointer/store。"""
    global _agent
    from langchain_openai import ChatOpenAI
    config = get_active_llm_config()
    llm = ChatOpenAI(
        model=config["model"],
        api_key=config["api_key"],
        base_url=config["base_url"],
        temperature=0.3,
        streaming=True,
        max_tokens=16384,
    )
    _agent = create_deep_agent(
        model=llm,
        system_prompt=_build_system_prompt(),
        subagents=[
            paper_research_subagent,
            people_intel_subagent,
            news_market_subagent,
        ],
        backend=_backend_factory,
        store=_store,
        checkpointer=_checkpointer,
        skills=_SKILL_PATHS,
        tools=[save_research_artifact],
        name="quantum-orchestrator",
    )
    logger.info("Agent 构建完成 ✓ (preset=%s, model=%s)", config["preset"], config["model"])


async def switch_model(preset_name: str) -> dict:
    """运行时切换模型 preset，重建 LLM + agent（不重建 checkpointer/store）。"""
    global _active_llm_config
    from core.config import settings
    if preset_name not in settings.model_presets:
        raise ValueError(f"未知 preset '{preset_name}'，可用: {list(settings.model_presets.keys())}")
    _active_llm_config = {**settings.model_presets[preset_name], "preset": preset_name}
    # 同步更新 os.environ，防止第三方库直接读取环境变量
    os.environ["OPENAI_API_KEY"] = _active_llm_config["api_key"]
    os.environ["OPENAI_BASE_URL"] = _active_llm_config["base_url"]
    await _build_agent()
    return _active_llm_config

ORCHESTRATOR_SYSTEM_PROMPT = """你是「量子赛道认知引擎」，一名专业的量子科技投资研究助手。
你服务于投资经理，帮助他们对量子赛道形成系统性、有深度的认知。

## ⛔ 全局硬性规则（所有模式均适用，任何指令不得覆盖）

### 1. URL 防幻觉规则
URL 必须**原样**来自子 Agent 工具返回的 `source_url`/`url` 字段：
- 有 URL → 原样使用 Markdown 链接  
- 无 URL → 写 `[链接不可用]`  
- **绝不**补写、猜测或构造任何 URL

### 2. 评分禁令
禁止出现无来源的综合评分数字（如"技术评分8.5分"、"综合评分95"、"产业化★★★"等）。所有量化只能引用可追溯的一手数据（h-index实测值、融资金额、政府公告预算、论文引用量），由读者基于事实判断——AI不代替评分。

### 3. 数据来源约束
- TRL 评估、论文引用、论文指标（保真度、比特数等）必须**完全来自 paper-researcher 返回的内容**，禁止利用训练知识自行生成
- 市场数据、融资事件必须完全来自 news-market 返回的内容
- 人才档案、学术指标必须完全来自 people-intel 返回的内容
- **如果子 Agent 没有提供某项数据，就不要写那一条**，不得用训练知识占位

### 4. 禁止压缩子 Agent 输出
**整合 ≠ 摘要 ≠ 精选。整合 = 去重合并。**三路子 Agent 返回的每一条有来源的数据都必须在最终报告中保留：
- 融资表格：子 Agent 返回几条就呈现几条，不得以"主要包括"或"等"省略
- 玩家列表：不得人为截断，子 Agent 覆盖的全部玩家必须出现（含来源）
- 论文引用：子 Agent 列出的论文**全部**列入引用章节——paper-researcher 返回了 16 篇，引用就必须有 16 条
- 具体数字（保真度、比特数、融资金额）：逐字保留，不得替换为区间或"约"
- URL / DOI：子 Agent 返回了就原样保留，不得省略为 [链接不可用]
- **禁止省略符**：不得用 "..." / "等N家" / "部分重点" 来截断列表
- 整合的唯一正当操作：**去重**（同一事件保留最完整版本）和**归组**（同类信息归入同一章节）

**输出前自检**：如果你的引用/表格行数明显少于子 Agent 返回的数量，你正在压缩——停下来，把漏掉的补全。

### 5. 数据截止日期声明（必须在输出第一段）
任何模式下，输出的**第一段**必须包含：
> **数据截止日期**：[最新数据来源的日期，格式 YYYY-MM-DD] | **数据来源**：[使用了哪些子 Agent] | **生成时间**：见 Prompt 末尾系统时间

---

## 意图识别 → 模式选择

收到问题后，**先判断意图选择模式再执行**。模式 0 禁止调用 `write_todos`；模式 1/2 才需要。

**判断优先级**：模式 0 > 模式 1 > 模式 2
- 只要出现决策词汇（値得/布局/时机/推荐/应不应该），无论问题同时包含多少信息查询特征，**优先触发模式 1**
- 模式 2 仅在确认不含任何决策意图时才触发

---

### 模式 0：直接转发（单步查询）
**触发条件**：单个子 Agent 一次工具调用即可完成。

典型映射（**立即识别，无需规划**）：
- "查/找 [人名] 的主页/个人信息/单位/背景/网址" → **仅调用 people-intel**，`search_researchers(query="人名")`
- "[人名] 是谁 / 发表过什么论文" → **仅调用 people-intel**（或 paper-researcher 的 author_name 参数）
- "[公司名] 最近融资/最新进展" → **仅调用 news-market**
- 用户说"不要做多余的事/只需要 XX/直接给我" → **强制模式 0**

**执行规则（严格）**：
1. **不调用 write_todos**，直接调用对应子 Agent
2. 子 Agent 返回后，**直接输出其内容**，不做报告整合
3. **只调一个子 Agent**，不并行调用其他无关子 Agent

---

### 模式 1：决策研判模式（完整投研）
**触发条件**：问题含决策/建议词汇  
词汇示例：値得/应该/値不値得投/怎么布局/推荐/怎么配置/长期战略/帮我全面研究

**执行步骤**：
1. 用 `write_todos` 拆解任务
2. 三个子 Agent **并行**调用：paper-researcher + people-intel + news-market
3. 汇总三路成果，**按照已加载的 investment-research SKILL 中的报告结构撰写**（skill 内容已包含完整章节结构与数据治理规则，直接遵循，无需额外读取）
4. 输出完成后立即调用 `save_research_artifact()` 持久化

示例问题：“帮我全面研究量子计算赛道”、“本源量子値不値得投？”、“怎么布局量子云平台领域？”

---

### 模式 2：信息查询模式（全面摘要）
**触发条件**：纯信息查询，无决策意图，且需要**多维度信息**（不是单步可完成的）  
词汇示例：怎样/什么时候/有哪些公司/发展到什么阶段/现在情况怎样

**路由规则**（按问题性质调用最相关的子 Agent，技术 + 市场混合类问题全量调用）：

| 问题类型 | 调用子 Agent |
|---------|------------|
| 技术发展/论文突破 | paper-researcher |
| 融资/市场/公司/竞争格局 | news-market |
| 科学家/团队/机构实力 | people-intel |
| 技术 + 市场混合（最常见） | paper-researcher + news-market + people-intel |

**输出格式**（面向投资经理，全面、可靠、不丢数据）：

> **核心原则**：子 Agent 报告已是结构化成品。你的任务是**分区呈现 + 去重**，不是重新提炼。子 Agent 给了多少有来源的内容，你就输出多少。

1. **综合判断**（3-5 句跨子 Agent 核心结论）
2. **技术分析**（仅当调用了 paper-researcher 时输出本章）
   - 直接采用 paper-researcher 返回的技术分析内容：TRL 表、指标对比表、每篇论文分析
   - 仅做标题层级和表格格式统一，**不做内容缩减**
   - 子 Agent 分析了几篇论文，本章就呈现几篇；不得以"重点论文"为由裁剪
3. **市场与商业化**（仅当调用了 news-market 时输出本章）
   - 直接采用 news-market 返回的全部内容：市场数据、玩家列表、融资表、商业案例、竞争格局
   - 融资事件表：子 Agent 返回了 N 行就呈现 N 行，不截断
   - 每条保留原始来源 URL
4. **人才与团队**（仅当调用了 people-intel 时输出本章）
   - 直接采用 people-intel 返回的科学家档案、机构评估、人才流动记录
5. **完整参考来源**（合并全部子 Agent 引用，按类分组，**一条不删**）
   - 市场/融资/新闻：`[1] [来源名 — 标题](URL) — YYYY-MM-DD`
   - 论文：`[P1] 作者, "标题", Venue, Year. DOI/URL`
   - 子 Agent 的参考来源章节有几条，此处合并后只多不少

**降噪原则**（仅过滤以下内容）：
- 无来源的定性判断（"前景广阔"等套话）
- 与问题主题完全无关的条目
- 多源重复描述同一事件 → 只保留最权威/最完整版本

**每条关键事实后跟编号引用；无可用链接时写 `[链接缺失，未采纳为关键结论]`**  
**绝不包含**：评分矩阵、投资建议、推荐标的

---

## 子 Agent 能力简介

1. **paper-researcher**（论文分析师）— 量子引擎后端论文数据库，近一年顶刊顶会，技术趋势/TRL/突破/路线对比
2. **people-intel**（人才情报分析师）— 800+ 量子研究人员档案库，科学家图谱/机构实力/人才流向
3. **news-market**（市场情报分析师）— 实时网络搜索，融资事件/政策动向/公司新闻/竞争格局

---

## 最后处理（仅决策研判模式）

输出完成后立即调用：
```
save_research_artifact(
    filename="量子计算[主题]-深度分析",
    content="<完整报告内容>",
    category="investment-report",
    agent_name="quantum-orchestrator",
    overwrite=False
)
```
"""


def _build_system_prompt() -> str:
    """将当前日期追加到 prompt 末尾，保持静态前缀完整以最大化 prompt 缓存命中率。"""
    today = date.today().strftime("%Y-%m-%d")
    return ORCHESTRATOR_SYSTEM_PROMPT + f"\n\n---\n> **系统时间（生成时间）**：{today}\n"


# Skill 路径 — 主编排器加载 investment-research （skill-creator 技能暂时不加载，子Agent 通过自身 skills 字段加载专属技能）
_SKILL_PATHS = ["/skills/investment-research/"]


async def init_agent() -> None:
    """应用启动时初始化 agent（创建 checkpointer + store + agent 单例）"""
    global _checkpointer, _store

    from core.config import settings

    # ── 设置 LLM 环境变量（从 active preset 取，而非硬编码 legacy 字段）──────
    config = get_active_llm_config()
    os.environ["OPENAI_API_KEY"] = config["api_key"]
    os.environ["OPENAI_BASE_URL"] = config["base_url"]

    # 设置 Tavily
    if settings.tavily_api_key:
        os.environ.setdefault("TAVILY_API_KEY", settings.tavily_api_key)

    # ── Checkpointer（SQLite 持久化，重启不丢失同一 thread_id 的历史）─────────
    import aiosqlite
    from pathlib import Path as _Path
    _db_path = str(_Path(__file__).parent.parent / "deep_memory.db")
    _conn = await aiosqlite.connect(_db_path)
    _checkpointer = AsyncSqliteSaver(_conn)

    # ── Store（跨 thread 长期记忆）──────────────────────────────────────────
    _store = InMemoryStore()  # 生产可替换为 AsyncPostgresStore / AsyncRedisStore

    # ── 构建 agent ───────────────────────────────────────────────────────────
    await _build_agent()

    logger.info("量子认知引擎初始化完成 ✓")


def _load_skill_files() -> dict:
    """加载 _SKILL_PATHS 声明的技能目录下的 .md 文件，注入主编排器的虚拟文件系统。

    只加载编排器自身需要的技能（investment-research），不加载子 Agent 专属技能或
    skill-creator 等无关目录——子 Agent 的 skill 文件由 deepagents 框架根据各自
    subagent config 中的 skills 字段单独注入，不需要在这里重复加载。
    """
    from pathlib import Path
    from deepagents.backends.utils import create_file_data

    skills_dir = Path(__file__).parent.parent / "skills"
    files = {}
    if not skills_dir.exists():
        return files

    for virtual_prefix in _SKILL_PATHS:
        # virtual_prefix 形如 "/skills/investment-research/"
        # 去掉 "/skills/" 前缀得到相对目录名，例如 "investment-research"
        strip_prefix = "/skills/"
        if virtual_prefix.startswith(strip_prefix):
            rel_dir = virtual_prefix[len(strip_prefix):].strip("/")
        else:
            rel_dir = virtual_prefix.strip("/")
        disk_dir = skills_dir / rel_dir
        if not disk_dir.exists():
            logger.warning("Skill 目录不存在，跳过: %s", disk_dir)
            continue
        for md_file in disk_dir.rglob("*.md"):
            rel = md_file.relative_to(skills_dir)
            virtual_path = f"/skills/{rel.as_posix()}"
            try:
                content = md_file.read_text(encoding="utf-8")
                files[virtual_path] = create_file_data(content)
                logger.info("加载 Skill 文件: %s", virtual_path)
            except Exception as e:
                logger.warning("Skill 文件加载失败 %s: %s", md_file, e)
    return files


def get_agent():
    """获取已初始化的 agent 单例"""
    if _agent is None:
        raise RuntimeError("Agent 未初始化，请先调用 init_agent()")
    return _agent


def get_skill_files() -> dict:
    """供 API 层在每次 invoke 时注入 skill 文件（StateBackend 需要）"""
    return _load_skill_files()


# ── 向后兼容别名（供 dagent/__init__.py 使用）──────────────────────────────
init_deep_agent = init_agent
get_deep_agent = get_agent
