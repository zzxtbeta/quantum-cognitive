"""研究成果缓存工具 — 将中间分析结果持久化为 Markdown 文件"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# 缓存目录（相对于后端根目录）
_CACHE_DIR = Path(__file__).parent.parent.parent / "research-artifacts"


def _ensure_cache_dir() -> Path:
    """确保缓存目录存在，按日期组织"""
    today = datetime.now().strftime("%Y-%m-%d")
    daily_dir = _CACHE_DIR / today
    daily_dir.mkdir(parents=True, exist_ok=True)
    return daily_dir


def save_research_artifact(
    filename: str,
    content: str,
    category: str = "general",
    agent_name: str = "unknown",
    overwrite: bool = False,
) -> str:
    """
    记录研究成果元数据（内容已由工具调用日志系统持久化，无需额外写入磁盘）。
    每个子Agent在完成分析后调用此工具，触发日志记录。

    Args:
        filename: 成果名称，如 'quantum-computing-paper-analysis' '中国量子人才图谱'
        content: Markdown 格式的分析内容（由工具日志系统自动捕获完整内容）
        category: 分类标签，如 'paper-analysis' 'people-intel' 'market-intel' 'investment-report'
        agent_name: 产出此成果的 Agent 名称，如 'paper-researcher' 'people-intel' 'news-market'
        overwrite: 保留参数，兼容旧调用（已无实际效果）

    Returns:
        成功确认 JSON（内容已由工具日志系统持久化，可在工具日志界面查看完整报告）
    """
    safe_name = "".join(c if c.isalnum() or c in "-_. " else "_" for c in filename)
    safe_name = safe_name.strip().replace(" ", "-")
    ref_name = f"{category}-{safe_name}-{datetime.now().strftime('%H%M%S')}.md"

    logger.info("[%s] 研究成果已记录到工具日志: %s (%d chars)", agent_name, ref_name, len(content))

    return json.dumps({
        "status": "logged",
        "ref_name": ref_name,
        "agent": agent_name,
        "category": category,
        "size_chars": len(content),
        "note": "内容已由工具调用日志系统持久化，可在工具日志界面查询完整报告",
    }, ensure_ascii=False)


def list_research_artifacts(
    category: Optional[str] = None,
    date: Optional[str] = None,
    limit: int = 20,
) -> str:
    """
    列出已保存的研究成果文件，供后续分析复用。

    Args:
        category: 过滤分类，如 'paper-analysis' 'people-intel' 'market-intel'
        date: 日期过滤，格式 'YYYY-MM-DD'，默认今天
        limit: 返回数量上限

    Returns:
        文件列表 JSON，含路径、分类、大小、创建时间
    """
    try:
        if date:
            dirs = [_CACHE_DIR / date] if (_CACHE_DIR / date).exists() else []
        else:
            dirs = sorted(_CACHE_DIR.iterdir(), reverse=True)[:7] if _CACHE_DIR.exists() else []

        files = []
        for d in dirs:
            if not d.is_dir():
                continue
            for f in sorted(d.iterdir(), reverse=True):
                if not f.suffix == ".md":
                    continue
                if category and not f.name.startswith(category):
                    continue
                files.append({
                    "path": str(f),
                    "filename": f.name,
                    "date": d.name,
                    "size_bytes": f.stat().st_size,
                    "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                })
                if len(files) >= limit:
                    break
            if len(files) >= limit:
                break

        return json.dumps({
            "total": len(files),
            "artifacts": files,
        }, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error("list_research_artifacts 失败: %s", e)
        return json.dumps({"error": str(e), "artifacts": []}, ensure_ascii=False)


def read_research_artifact(filepath: str) -> str:
    """
    读取已保存的研究成果文件内容，用于在新对话中复用历史分析。

    Args:
        filepath: 文件完整路径（从 list_research_artifacts 返回的 path 字段）

    Returns:
        文件内容字符串，或错误信息
    """
    try:
        content = Path(filepath).read_text(encoding="utf-8")
        return json.dumps({
            "path": filepath,
            "content": content,
        }, ensure_ascii=False)
    except Exception as e:
        logger.error("read_research_artifact 失败: %s", e)
        return json.dumps({"error": str(e)}, ensure_ascii=False)
