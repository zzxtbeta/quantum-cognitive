"""量子论文数据工具 — 调用量子引擎后端 API"""
from __future__ import annotations

import json
import logging

import httpx

logger = logging.getLogger(__name__)


def _headers() -> dict:
    from core.config import settings
    return {"X-API-Key": settings.quantum_api_key, "Content-Type": "application/json"}


def _base_url() -> str:
    from core.config import settings
    # 兼容两种配置：
    # 1) base 已包含 /api（推荐）
    # 2) base 不含 /api（历史配置）
    base = settings.quantum_api_base_url.rstrip("/")
    return base if base.endswith("/api") else f"{base}/api"


def _papers_search_path() -> str:
    from core.config import settings
    path = (settings.quantum_api_papers_search_path or "/papers/search").strip()
    return path if path.startswith("/") else f"/{path}"


def _papers_method() -> str:
    from core.config import settings
    method = (settings.quantum_api_papers_search_method or "POST").strip().upper()
    return method if method in {"GET", "POST"} else "POST"


def semantic_search_papers(query: str, top_k: int = 10) -> str:
    """
    通过语义向量检索量子赛道顶刊顶会论文数据库，返回语义最相关的论文列表。
    支持中英文跨语言检索（中文 query 可自动匹配英文论文）。

    Args:
        query: 自然语言查询，中英文均可
               中文示例：'超导量子比特纠错' '量子通信密钥分发' '量子计算商业化'
               英文示例：'surface code error correction' 'quantum advantage superconducting'
        top_k: 返回论文数量，1-20，默认 10

    Returns:
        论文列表 JSON。data 数组中每条含：
        id, paper_id, title, abstract,
        authors（列表，每项含 name/affiliation）,
        year（发表年份，整数；无精确日期字段）,
        doi, venue_name, arxiv_id,
        domain_ids（领域 ID 数组），score（相关性分数，越高越相关）

        链接构造规则：
        - doi 非空 → https://doi.org/{doi}（优先）
        - doi 为空但 arxiv_id 非空 → https://arxiv.org/abs/{arxiv_id}
        - 两者均为空 → 仅列 venue_name + year，不构造任何链接
    """
    if not query.strip():
        return "Error: query 不能为空"
    try:
        method = _papers_method()
        if method == "GET":
            from core.config import settings
            params = {
                "query": query,
                "page": 1,
                "page_size": top_k,
                "sort_by": settings.quantum_api_papers_sort_by,
                "sort_order": settings.quantum_api_papers_sort_order,
                "include_stats": str(settings.quantum_api_papers_include_stats).lower(),
            }
            resp = httpx.get(
                f"{_base_url()}{_papers_search_path()}",
                params=params,
                headers={"X-API-Key": _headers()["X-API-Key"]},
                timeout=30,
            )
        else:
            resp = httpx.post(
                f"{_base_url()}{_papers_search_path()}",
                json={"query": query, "top_k": top_k},
                headers=_headers(),
                timeout=30,
            )
        resp.raise_for_status()
        data = resp.json()
        return json.dumps(data, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error("semantic_search_papers 失败: %s", e)
        return json.dumps({"error": str(e), "data": []}, ensure_ascii=False)


