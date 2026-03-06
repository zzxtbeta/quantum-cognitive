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

from deepagents import create_deep_agent
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.store.memory import InMemoryStore

from dagent.subagents.paper_agent import paper_research_subagent
from dagent.subagents.people_agent import people_intel_subagent
from dagent.subagents.news_agent import news_market_subagent

logger = logging.getLogger(__name__)

# ─── 全局单例 ─────────────────────────────────────────────────────────────────
_agent = None
_checkpointer = None
_store = None

ORCHESTRATOR_SYSTEM_PROMPT = """你是「量子赛道认知引擎」，一名专业的量子科技投资研究助手。
你服务于投资经理，帮助他们对量子赛道形成系统性、有深度的认知。

## 你的工作方式

你拥有三个专业子Agent，通过 task() 工具调用它们：

1. **paper-researcher**（论文分析师）
   → 负责：技术趋势、顶刊论文研究前沿、技术突破、技术路线成熟度
   → 数据来源：量子引擎后端论文数据库（近一年顶刊顶会）

2. **people-intel**（人才情报分析师）
   → 负责：核心科学家图谱、机构实力、人才流向
   → 数据来源：800+位量子研究人员档案库

3. **news-market**（市场情报分析师）
   → 负责：融资事件、政策动向、公司新闻、竞争格局
   → 数据来源：实时网络搜索

## 工作原则

- **主动拆解**：收到问题后，先用 write_todos 拆解任务，明确哪些子Agent并行
- **全面研判时三个子Agent并行调用**：同时发出三个 task() 调用，不要串行等待
- **按需调度**：简单问题无需调用所有子Agent；根据问题性质决定
- **保留细节**：综合子Agent报告时，保留所有具体数字、表格、人名、公司名，不要压缩

## 输出规范（全面研判时）

最终报告要求：
- **字数**: 最终报告不少于2500字，每个章节必须有实质内容
- **数据驱动**: 每个结论必须附具体数字（保真度%、融资金额、h-index、量子比特数等）
- **表格优先**: 技术路线对比、融资事件、机构实力对比、投资评分均用 Markdown 表格
- **来源标注**: 每条市场数据注明来源或时效
- **不要精简**: 子Agent提供了详细数据，就应当在最终报告中完整呈现，不要因为"整洁"而丢失信息

最终输出必须包含：
1. **执行摘要**（核心结论3-4句）
2. **技术研判**（TRL对比表、关键突破列表含具体数字、未来12个月预判）
3. **人才洞察**（核心科学家表含h-index、机构排名表、产业化信号）
4. **市场信号**（融资事件完整表格、政策数字、竞争格局、市场规模）
5. **综合投资建议**（评分矩阵、重点标的、风险提示、行动建议）

对于简单问题，直接回答即可，无需调用所有子Agent。"""

# Skill 路径 — 主编排器只加载编排层技能；各子Agent通过自身 skills 字段加载专属技能
_SKILL_PATHS = ["/skills/quantum-investment-analysis/"]


async def init_agent() -> None:
    """应用启动时初始化 agent（创建 checkpointer + store + agent 单例）"""
    global _agent, _checkpointer, _store

    from core.config import settings

    # ── 设置 LLM API Key ────────────────────────────────────────────────────
    os.environ.setdefault("OPENAI_API_KEY", settings.dashscope_api_key)
    os.environ.setdefault("OPENAI_BASE_URL", settings.llm_base_url)

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

    # ── CompositeBackend：工作区用 State，/memories/ 用 Store ────────────────
    def _backend_factory(rt):
        return CompositeBackend(
            default=StateBackend(rt),
            routes={
                "/memories/": StoreBackend(rt),
            },
        )

    # ── 读取 skill 文件，注入 StateBackend ──────────────────────────────────
    skill_files = _load_skill_files()

    # ── 构建 LLM 配置 ────────────────────────────────────────────────────────
    from langchain_openai import ChatOpenAI
    llm = ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.dashscope_api_key,
        base_url=settings.llm_base_url,
        temperature=0.3,
        streaming=True,
    )

    # ── 创建主 DeepAgent ─────────────────────────────────────────────────────
    _agent = create_deep_agent(
        model=llm,
        system_prompt=ORCHESTRATOR_SYSTEM_PROMPT,
        subagents=[
            paper_research_subagent,
            people_intel_subagent,
            news_market_subagent,
        ],
        backend=_backend_factory,
        store=_store,
        checkpointer=_checkpointer,
        skills=_SKILL_PATHS,
        name="quantum-orchestrator",
    )

    logger.info("量子认知引擎初始化完成 ✓ (model=%s)", settings.llm_model)


def _load_skill_files() -> dict:
    """加载 skills/ 目录下的 SKILL.md 文件，注入 StateBackend 的虚拟文件系统"""
    from pathlib import Path
    from deepagents.backends.utils import create_file_data

    skills_dir = Path(__file__).parent.parent / "skills"
    files = {}
    if skills_dir.exists():
        for md_file in skills_dir.rglob("*.md"):
            # 将所有 .md 文件（SKILL.md 和 references/*.md 等）加载到虚拟文件系统
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
