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
    将研究过程中的中间分析结果保存为 Markdown 文件，便于复用和避免重复请求。
    每个子Agent在完成分析后都应调用此工具保存成果。

    Args:
        filename: 文件名（不含日期前缀和扩展名），如 'quantum-computing-paper-analysis'
                  '中国量子人才图谱' 'quantum-funding-2025'
        content: Markdown 格式的分析内容
        category: 分类标签，如 'paper-analysis' 'people-intel' 'market-intel' 'investment-report'
        agent_name: 产出此成果的 Agent 名称，如 'paper-researcher' 'people-intel' 'news-market'
        overwrite: 是否覆盖已有同名文件（默认追加时间戳）

    Returns:
        保存成功信息，含文件路径；或错误信息
    """
    try:
        cache_dir = _ensure_cache_dir()
        # 清理文件名中的特殊字符
        safe_name = "".join(c if c.isalnum() or c in "-_. " else "_" for c in filename)
        safe_name = safe_name.strip().replace(" ", "-")

        if not overwrite:
            timestamp = datetime.now().strftime("%H%M%S")
            full_name = f"{category}-{safe_name}-{timestamp}.md"
        else:
            full_name = f"{category}-{safe_name}.md"

        filepath = cache_dir / full_name

        # 写入文件（加上元数据头，标记产出 agent）
        header = f"""---
created: {datetime.now().isoformat()}
category: {category}
agent: {agent_name}
filename: {filename}
---

"""
        filepath.write_text(header + content, encoding="utf-8")
        logger.info("[%s] 已保存研究成果: %s", agent_name, filepath)

        return json.dumps({
            "status": "saved",
            "path": str(filepath),
            "filename": full_name,
            "agent": agent_name,
            "size_bytes": len(content),
        }, ensure_ascii=False)
    except Exception as e:
        logger.error("save_research_artifact 失败: %s", e)
        return json.dumps({"status": "error", "error": str(e)}, ensure_ascii=False)


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
