"""研究成果持久化工具 — 所有类别统一写入 Knowledge Layer 数据库"""
from __future__ import annotations

import contextvars
import json
import logging
from datetime import date
import re
from typing import Optional

from core.report_postprocess import sanitize_report_markdown

logger = logging.getLogger(__name__)

_REQUEST_THREAD_ID: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "knowledge_thread_id", default=None
)
_REQUEST_TURN_ID: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "knowledge_turn_id", default=None
)
_REQUEST_TOPIC: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "knowledge_request_topic", default=None
)

_DEFAULT_AGENT_BY_CATEGORY = {
    "paper-analysis": "paper-researcher",
    "people-intel": "people-intel",
    "market-intel": "news-market",
    "investment-report": "quantum-orchestrator",
}

_DEFAULT_TITLE_BY_CATEGORY = {
    "paper-analysis": "论文分析报告",
    "people-intel": "人才情报报告",
    "market-intel": "市场情报报告",
    "investment-report": "综合投资研究报告",
}


def _normalize_topic_key(topic: str | None) -> str | None:
    if not topic:
        return None
    cleaned = " ".join(topic.strip().split())
    if not cleaned:
        return None
    slug = re.sub(r"[^0-9A-Za-z\u4e00-\u9fff]+", "-", cleaned).strip("-")
    return slug[:120] or None


def set_knowledge_request_context(
    thread_id: Optional[str],
    turn_id: Optional[str],
    topic: Optional[str] = None,
) -> tuple[contextvars.Token, contextvars.Token, contextvars.Token]:
    return (
        _REQUEST_THREAD_ID.set(thread_id),
        _REQUEST_TURN_ID.set(turn_id),
        _REQUEST_TOPIC.set(topic),
    )


def reset_knowledge_request_context(
    tokens: tuple[contextvars.Token, contextvars.Token, contextvars.Token]
) -> None:
    thread_token, turn_token, topic_token = tokens
    _REQUEST_THREAD_ID.reset(thread_token)
    _REQUEST_TURN_ID.reset(turn_token)
    _REQUEST_TOPIC.reset(topic_token)


def _canonical_agent_name(category: str, agent_name: Optional[str]) -> str:
    cleaned = (agent_name or "").strip()
    if not cleaned or cleaned == "unknown":
        return _DEFAULT_AGENT_BY_CATEGORY.get(category, "unknown")
    return cleaned


def _canonical_title(filename: str, category: str) -> str:
    cleaned = " ".join((filename or "").strip().split())
    return cleaned or _DEFAULT_TITLE_BY_CATEGORY.get(category, "研究成果")


def _derive_report_title(message: str, content: str) -> str:
    heading_match = re.search(r"^##\s+(.+)$", content, re.MULTILINE)
    if heading_match:
        heading = heading_match.group(1).strip()
        if heading and heading not in {"综合判断", "执行摘要"}:
            return heading[:120]
    if message.strip():
        return message.strip()[:120]
    return _DEFAULT_TITLE_BY_CATEGORY["investment-report"]


def persist_final_report_if_missing(
    *,
    message: str,
    content: str,
    thread_id: Optional[str],
    turn_id: Optional[str],
) -> Optional[dict]:
    from core.knowledge_store import find_knowledge_item, save_knowledge

    if not _looks_like_substantive_report(content):
        return None

    existing = find_knowledge_item(
        category="investment-report",
        thread_id=thread_id,
        turn_id=turn_id,
    )
    if existing:
        return existing

    normalized_content = sanitize_report_markdown(content, date.today().strftime("%Y-%m-%d"))
    title = _derive_report_title(message, normalized_content)
    record = save_knowledge(
        agent_name=_DEFAULT_AGENT_BY_CATEGORY["investment-report"],
        category="investment-report",
        title=title,
        content=normalized_content,
        thread_id=thread_id,
        turn_id=turn_id,
        metadata={
            "original_filename": title,
            "persisted_by": "api-finalizer",
            "research_topic": message.strip() or title,
            "topic_key": _normalize_topic_key(message.strip() or title),
        },
    )
    logger.info(
        "[%s] 最终综合报告已自动写入 Knowledge DB: id=%s thread=%s turn=%s",
        _DEFAULT_AGENT_BY_CATEGORY["investment-report"],
        record["id"],
        thread_id,
        turn_id,
    )
    return record


def _looks_like_substantive_report(content: str) -> bool:
    if len(content.strip()) < 1200:
        return False
    heading_count = len(re.findall(r"^##\s+", content, flags=re.MULTILINE))
    return heading_count >= 3


def save_research_artifact(
    filename: str,
    content: str,
    category: str = "general",
    agent_name: str = "unknown",
    overwrite: bool = False,
    thread_id: Optional[str] = None,
    turn_id: Optional[str] = None,
) -> str:
    """
    保存研究成果到 Knowledge Layer 数据库。

    所有类别统一入库，前端可按 category 筛选展示，并支持下载。

    Args:
        filename: 成果标题，如 '量子计算云平台分析'
        content: Markdown 格式的分析内容
        category: 分类标签：paper-analysis / people-intel / market-intel / investment-report / general
        agent_name: 产出此成果的 Agent 名称
        overwrite: 保留参数，DB 模式下不使用

    Returns:
        成功确认 JSON，含 knowledge_id
    """
    from core.knowledge_store import save_knowledge

    canonical_agent = _canonical_agent_name(category, agent_name)
    canonical_title = _canonical_title(filename, category)
    safe_title = "".join(c if c.isalnum() or c in "-_. " else "_" for c in canonical_title)
    safe_title = safe_title.strip().replace("  ", " ")
    normalized_content = (
        sanitize_report_markdown(content, date.today().strftime("%Y-%m-%d"))
        if category == "investment-report"
        else content
    )
    effective_thread_id = thread_id if thread_id is not None else _REQUEST_THREAD_ID.get()
    effective_turn_id = turn_id if turn_id is not None else _REQUEST_TURN_ID.get()
    effective_topic = _REQUEST_TOPIC.get()

    try:
        record = save_knowledge(
            agent_name=canonical_agent,
            category=category,
            title=safe_title or canonical_title,
            content=normalized_content,
            thread_id=effective_thread_id,
            turn_id=effective_turn_id,
            metadata={
                "original_filename": canonical_title,
                "research_topic": effective_topic or canonical_title,
                "topic_key": _normalize_topic_key(effective_topic or canonical_title),
            },
        )
        logger.info("[%s] 成果已写入 Knowledge DB: id=%s category=%s (%d chars)",
                    canonical_agent, record["id"], category, len(normalized_content))
        return json.dumps({
            "status": "saved",
            "knowledge_id": record["id"],
            "agent": canonical_agent,
            "category": category,
            "title": record["title"],
            "size_chars": len(normalized_content),
            "note": "成果已存入 Knowledge Layer，可在知识库页面查看和下载",
        }, ensure_ascii=False)
    except Exception as e:
        logger.error("save_research_artifact 写入 Knowledge DB 失败: %s", e)
        return json.dumps({"status": "error", "error": str(e)}, ensure_ascii=False)
