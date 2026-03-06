"""
deepagents 图构建与单例管理。

使用 create_deep_agent（基于 LangGraph 运行时）：
  - 模型：qwen3.5-plus via DashScope OpenAI-compatible endpoint
  - 记忆：AsyncSqliteSaver（按 thread_id 持久化，文件系统存储，支持 async）
  - 工具：agent/tools.py 中定义的工具
  - Skills：startup 时从 agent/skills/ 读取并注入 system prompt

对外暴露：
  get_agent()           — 同步获取（首次调用会阻塞初始化）
  init_agent()          — 异步初始化（在 FastAPI lifespan 中调用）
"""
from __future__ import annotations

import logging
import yaml
from pathlib import Path

from deepagents import create_deep_agent
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from core.config import settings
from .system_prompt import SYSTEM_PROMPT
from .tools import TOOLS

logger = logging.getLogger(__name__)

# skills 统一存放目录（项目根 skills/，按 scope 筛选 chat-agent 类）
_SKILLS_DIR = Path(__file__).parent.parent / "skills"

# ─── 全局单例 ──────────────────────────────────────────────────────────────────
_agent = None
_checkpointer = None  # 持有引用，防止 GC
_needs_reload: bool = False  # save_skill 后设为 True


# ─── LLM 工厂 ─────────────────────────────────────────────────────────────────

def _build_llm() -> ChatOpenAI:
    """构造指向 DashScope OpenAI-compatible 端点的 ChatOpenAI 实例。"""
    return ChatOpenAI(
        api_key=settings.dashscope_api_key,
        base_url=settings.llm_base_url,
        model=settings.llm_model,
        streaming=True,
        temperature=0.7,
    )


# ─── 初始化 ────────────────────────────────────────────────────────────────────

def _load_skills_into_prompt(base_prompt: str) -> str:
    """
    在启动时扫描 skills/ 目录，将技能索引（仅名称+描述，每条一行）注入 system prompt。

    完整 Skill 内容不再预加载——agent 在判断某个 Skill 与当前任务相关时，
    应主动调用 get_skill(name) 工具按需获取，避免将大量无关文本堆入 prompt。
    """
    if not _SKILLS_DIR.exists():
        return base_prompt

    skill_lines: list[str] = []
    for skill_dir in sorted(_SKILLS_DIR.iterdir()):
        if not skill_dir.is_dir():
            continue
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            continue
        content = skill_file.read_text(encoding="utf-8")
        # 使用 YAML 解析 frontmatter，只加载 scope=chat-agent 的 skills
        parts = content.split("---", 2)
        if len(parts) < 3:
            continue
        try:
            fm = yaml.safe_load(parts[1]) or {}
        except Exception:
            continue
        meta = fm.get("metadata") or {}
        # 兼容新格式（顶层 scope）和旧格式（metadata.scope）
        scope = fm.get("scope") or meta.get("scope", "chat-agent")
        desc = fm.get("description", "（无描述）")
        # deep-research 技能需要专用数据工具，附加提示
        scope_hint = "（需 Deep Research 模式获取完整数据）" if scope == "deep-research" else ""
        skill_lines.append(f"- **{skill_dir.name}**: {desc}{scope_hint}")

    if not skill_lines:
        return base_prompt

    skills_block = (
        "\n\n## 可用技能索引 (Skills)\n"
        "以下是当前已注册的技能列表。当你判断某个技能与当前任务相关时，"
        "调用 `get_skill(name)` 工具获取该技能的完整操作指南，"
        "再按照指南执行。无需提前加载所有技能。\n\n"
        + "\n".join(skill_lines)
    )
    logger.info("注入 %d 个 Skills 索引到 system prompt（按需加载模式）", len(skill_lines))
    return base_prompt + skills_block


async def init_agent() -> None:
    """
    异步初始化 agent 单例，应在 FastAPI lifespan startup 中调用。
    Skills 在此处从文件读入并内嵌到 system prompt，不使用 FilesystemBackend。
    """
    global _agent, _checkpointer

    if _agent is not None:
        return  # 已初始化

    logger.info(
        "初始化 deepagent | model=%s | db=%s",
        settings.llm_model,
        settings.sqlite_db_path,
    )

    import aiosqlite
    conn = await aiosqlite.connect(settings.sqlite_db_path)
    _checkpointer = AsyncSqliteSaver(conn)

    # 将 skills 文件内容内嵌到 system prompt——不展开 backend
    final_prompt = _load_skills_into_prompt(SYSTEM_PROMPT)

    _agent = create_deep_agent(
        model=_build_llm(),
        tools=TOOLS,
        system_prompt=final_prompt,
        checkpointer=_checkpointer,
        # 不传 backend：使用默认 StateBackend，避免 FilesystemMiddleware 阻塞事件循环
    )

    logger.info("deepagent 初始化完成：%s", type(_agent).__name__)


def mark_skills_dirty() -> None:
    """由 save_skill 工具调用：标记 skills 已变更，下次请求前自动重建 agent。"""
    global _needs_reload
    _needs_reload = True
    logger.info("Skills 已标记为脏，下次对话前将热重载")


async def ensure_fresh_agent() -> None:
    """
    若 mark_skills_dirty() 被调用过，则重建 agent（重新读取 skills 文件）。
    在 chat.py 每次请求开始时调用，耗时约 1 秒（SQLite 重连 + 图重建）。
    """
    global _agent, _checkpointer, _needs_reload
    if not _needs_reload:
        return
    logger.info("热重载 Skills：重建 agent...")
    _agent = None
    _checkpointer = None
    _needs_reload = False
    await init_agent()
    logger.info("Skills 热重载完成")


def get_agent():
    """
    获取已初始化的 agent 单例。
    必须在 init_agent() 之后调用（FastAPI lifespan 保证这一点）。
    """
    if _agent is None:
        raise RuntimeError("Agent 未初始化，请先调用 init_agent()")
    return _agent
