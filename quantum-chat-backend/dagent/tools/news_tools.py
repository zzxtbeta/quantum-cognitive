"""量子赛道新闻/市场情报工具"""
from __future__ import annotations

import json
import logging
import os
from typing import Literal, Optional

logger = logging.getLogger(__name__)


def _get_tavily_client():
    from core.config import settings
    api_key = settings.tavily_api_key or os.environ.get("TAVILY_API_KEY", "")
    if not api_key:
        return None
    os.environ.setdefault("TAVILY_API_KEY", api_key)
    try:
        from tavily import TavilyClient
        return TavilyClient(api_key=api_key)
    except ImportError:
        logger.warning("tavily-python 未安装，网络搜索工具不可用")
        return None


def search_web(
    query: str,
    topic: Literal["general", "news", "finance"] = "news",
    days: int = 30,
    max_results: int = 8,
) -> str:
    """
    实时互联网搜索，获取量子赛道最新动态（新闻、融资、政策、公司进展等）。

    适合场景：
    - 查询最近发生的事件（1-365 天内）
    - 获取带真实 URL 的可验证来源
    - 交叉验证内部 DB 中关键数据（融资金额、政策预算）的真实性
    - DB 中找不到的内容补充

    Args:
        query: 自然语言查询，越具体越好，如 '本源量子2025融资' '中国量子通信政策2025'
               融资事件：'[公司名] 融资 2025'；政策：'量子科技政策 2025'；最新进展：'[公司/主题] 最新'
        topic: 'news'=新闻（默认）'finance'=金融/融资事件 'general'=通用政策/公司信息
        days: 搜索最近 N 天内容 (1-365)，新闻查近 30 天，融资/政策查近 180 天
        max_results: 最多返回条数 (1-10)，默认 8

    Returns:
        搜索结果 JSON，含 answer 摘要汇总 + results 列表（title/url/published_date/content/score）
    """
    client = _get_tavily_client()
    if not client:
        return "Tavily API Key 未配置，无法搜索实时内容。请在 .env 中设置 TAVILY_API_KEY"
    try:
        result = client.search(
            query=query,
            max_results=max_results,
            topic=topic,
            include_answer=True,
            days=days,
        )
        simplified = {
            "answer": result.get("answer", ""),
            "results": [
                {
                    "title": r.get("title"),
                    "url": r.get("url"),
                    "published_date": r.get("published_date"),
                    "content": r.get("content", "")[:400],
                    "score": round(r.get("score", 0), 3),
                }
                for r in result.get("results", [])
            ],
        }
        return json.dumps(simplified, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error("search_web 失败: %s", e)
        return f"Error: {e}"


# ── 量子新闻内部数据库工具 ────────────────────────────────────────────


def _news_headers() -> dict:
    from core.config import settings
    return {"X-API-Key": settings.quantum_api_key, "Accept": "application/json"}


def _news_base_url() -> str:
    from core.config import settings
    return settings.quantum_api_base_url.rstrip("/")


def query_news_db(
    source: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> str:
    """
    按来源公众号从量子新闻数据库检索新闻（仅用于来源专项查询）。

    ⚠️ 使用限制：
    - 本工具仅适用于用户明确指定来源的场景，如 '查量子大观的新闻' '华夏时报的报道'
    - 通用关键词查询、语义搜索 → 请改用 semantic_search_news

    Args:
        source: 来源公众号名称，模糊匹配（如 '量子大观' '华夏时报' '科技日报'），必填
        start_date: 起始日期，格式 yyyy-mm-dd（如 '2025-01-01'）
        end_date: 截止日期，格式 yyyy-mm-dd（如 '2025-12-31'）
        page: 页码，从 1 开始
        page_size: 每页条数，建议 20-50

    Returns:
        新闻列表 JSON，含 title/source/published_at/source_url/summary/tech_direction/event_type
    """
    import httpx
    if not source:
        return "Error: query_news_db 必须提供 source 参数（来源公众号名称）。通用查询请使用 semantic_search_news"
    params: dict = {"page": page, "page_size": page_size, "source": source}
    if start_date:
        params["start_date"] = start_date
    if end_date:
        params["end_date"] = end_date
    try:
        resp = httpx.get(
            f"{_news_base_url()}/api/news",
            params=params,
            headers=_news_headers(),
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get("data", [])
        simplified = [
            {
                "id": item.get("id"),
                "title": item.get("title"),
                "source": item.get("source"),
                "published_at": item.get("published_at"),
                "source_url": item.get("source_url"),
                "summary": item.get("summary"),
                "tech_direction": item.get("tech_direction"),
                "event_type": item.get("event_type"),
                "emotion": item.get("emotion"),
                "mentioned_entities": item.get("mentioned_entities"),
            }
            for item in items
            # 过滤掉明显的SEO垃圾条目（标题以引号开头的推广内容）
            if item.get("title") and not item.get("title", "").startswith('"')
        ]
        return json.dumps(
            {"total": data.get("total", len(simplified)), "page": page, "news": simplified},
            ensure_ascii=False, indent=2,
        )
    except Exception as e:
        logger.error("query_news_db 失败: %s", e)
        return f"Error: {e}"


def semantic_search_news(query: str, top_k: int = 8) -> str:
    """
    通过语义向量检索量子新闻数据库，找到语义最相关的新闻。
    这是新闻数据库的**主要检索工具**，适用于大多数查询场景。

    适合场景：
    - 按关键词/主题查询（如 '本源量子融资' '量子纠错最新进展'）
    - 概念性查询（如 '国内量子公司IPO动态'）
    - 所有非来源专项查询（来源专项查询用 query_news_db）

    Args:
        query: 自然语言查询，越具体越好（如 '本源量子IPO上市动态' '量子纠错最新突破'）
        top_k: 返回条数，1–20，默认 8

    Returns:
        语义最相关的新闻列表 JSON，含 title/source/published_at/source_url/score
    """
    import httpx
    if not query.strip():
        return "Error: query 不能为空"
    try:
        resp = httpx.post(
            f"{_news_base_url()}/api/news/search",
            json={"query": query, "top_k": top_k},
            headers={**_news_headers(), "Content-Type": "application/json"},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get("data", [])
        simplified = [
            {
                "gold_news_id": item.get("gold_news_id"),
                "title": item.get("title"),
                "source": item.get("source"),
                "published_at": item.get("published_at"),
                "source_url": item.get("source_url"),
                "summary": item.get("summary"),
                "tech_direction": item.get("tech_direction"),
                "event_type": item.get("event_type"),
                "relevance_score": round(item.get("score", 0), 4),
            }
            for item in items
        ]
        return json.dumps(
            {"query": query, "top_k": top_k, "results": simplified},
            ensure_ascii=False, indent=2,
        )
    except Exception as e:
        logger.error("semantic_search_news 失败: %s", e)
        return f"Error: {e}"
