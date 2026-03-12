"""研究成果持久化工具 — 所有类别统一写入 Knowledge Layer 数据库"""
from __future__ import annotations

import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def save_research_artifact(
    filename: str,
    content: str,
    category: str = "general",
    agent_name: str = "unknown",
    overwrite: bool = False,
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

    safe_title = "".join(c if c.isalnum() or c in "-_. " else "_" for c in filename)
    safe_title = safe_title.strip().replace("  ", " ")

    try:
        record = save_knowledge(
            agent_name=agent_name,
            category=category,
            title=safe_title or filename,
            content=content,
            metadata={"original_filename": filename},
        )
        logger.info("[%s] 成果已写入 Knowledge DB: id=%s category=%s (%d chars)",
                    agent_name, record["id"], category, len(content))
        return json.dumps({
            "status": "saved",
            "knowledge_id": record["id"],
            "agent": agent_name,
            "category": category,
            "title": record["title"],
            "size_chars": len(content),
            "note": "成果已存入 Knowledge Layer，可在知识库页面查看和下载",
        }, ensure_ascii=False)
    except Exception as e:
        logger.error("save_research_artifact 写入 Knowledge DB 失败: %s", e)
        return json.dumps({"status": "error", "error": str(e)}, ensure_ascii=False)
