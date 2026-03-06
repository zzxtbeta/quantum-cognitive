"""量子赛道新闻/市场情报工具 — 基于 Tavily 实时搜索"""
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
        logger.warning("tavily-python 未安装，新闻工具不可用")
        return None


def search_quantum_news(
    query: str,
    topic: Literal["general", "news", "finance"] = "news",
    max_results: int = 8,
    days: int = 30,
) -> str:
    """
    搜索量子赛道最新资讯，包括技术发布、融资事件、政策动态、公司进展。

    Args:
        query: 搜索关键词，如 '量子计算融资' '量子芯片发布' '量子通信政策' '本源量子'
        topic: 搜索主题类型，'news'=新闻,'finance'=金融市场,'general'=通用
        max_results: 最多返回结果数，建议5-10
        days: 搜索最近N天的内容（1-365）

    Returns:
        新闻摘要列表 JSON，包含标题、URL、发布时间、摘要
    """
    client = _get_tavily_client()
    if not client:
        return "Tavily API Key 未配置，无法搜索实时新闻。请在 .env 中设置 TAVILY_API_KEY"
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
                    "content": r.get("content", "")[:300],
                    "score": round(r.get("score", 0), 3),
                }
                for r in result.get("results", [])
            ],
        }
        return json.dumps(simplified, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error("search_quantum_news 失败: %s", e)
        return f"Error: {e}"


def search_quantum_funding(company_or_topic: str, days: int = 180) -> str:
    """
    搜索量子赛道近期融资事件和投资动态，识别赛道热点。

    Args:
        company_or_topic: 公司名或赛道方向，如 '量子计算融资' '量子通信投资' 'IonQ' '本源量子'
        days: 搜索最近N天，建议90-365

    Returns:
        融资事件列表 JSON，包含公司、金额、轮次、投资方信息
    """
    query = f"{company_or_topic} 融资 投资 估值 量子"
    client = _get_tavily_client()
    if not client:
        return "Tavily API Key 未配置"
    try:
        result = client.search(
            query=query,
            max_results=6,
            topic="finance",
            include_answer=True,
            days=days,
        )
        return json.dumps({
            "summary": result.get("answer", ""),
            "events": [
                {
                    "title": r.get("title"),
                    "url": r.get("url"),
                    "date": r.get("published_date"),
                    "snippet": r.get("content", "")[:400],
                }
                for r in result.get("results", [])
            ],
        }, ensure_ascii=False, indent=2)
    except Exception as e:
        return f"Error: {e}"


def search_quantum_policy(topic: str = "量子科技政策", days: int = 365) -> str:
    """
    搜索量子赛道相关政策、战略规划和国家项目动态，判断政策导向。

    Args:
        topic: 政策主题，如 '量子科技政策' '量子通信标准' '量子产业发展规划'
        days: 搜索最近N天

    Returns:
        政策相关资讯 JSON
    """
    query = f"{topic} 政府 政策 规划 战略"
    client = _get_tavily_client()
    if not client:
        return "Tavily API Key 未配置"
    try:
        result = client.search(
            query=query,
            max_results=6,
            topic="general",
            include_answer=True,
            days=days,
        )
        return json.dumps({
            "policy_summary": result.get("answer", ""),
            "articles": [
                {
                    "title": r.get("title"),
                    "url": r.get("url"),
                    "date": r.get("published_date"),
                    "snippet": r.get("content", "")[:400],
                }
                for r in result.get("results", [])
            ],
        }, ensure_ascii=False, indent=2)
    except Exception as e:
        return f"Error: {e}"


def search_quantum_companies(query: str = "量子科技公司", days: int = 180) -> str:
    """
    搜索量子赛道相关公司动态，包括产品发布、合作、市场布局信息。

    Args:
        query: 搜索词，如 '量子计算公司' '本源量子' 'Google量子' 'IBM量子' 'IonQ'
        days: 最近N天

    Returns:
        公司/竞争情报 JSON
    """
    client = _get_tavily_client()
    if not client:
        return "Tavily API Key 未配置"
    try:
        result = client.search(
            query=query,
            max_results=8,
            topic="general",
            include_answer=True,
            days=days,
        )
        return json.dumps({
            "overview": result.get("answer", ""),
            "news_items": [
                {
                    "title": r.get("title"),
                    "url": r.get("url"),
                    "date": r.get("published_date"),
                    "snippet": r.get("content", "")[:350],
                }
                for r in result.get("results", [])
            ],
        }, ensure_ascii=False, indent=2)
    except Exception as e:
        return f"Error: {e}"


# ── 量子新闻数据库工具（新增） ────────────────────────────────────────────


def _news_headers() -> dict:
    from core.config import settings
    return {"X-API-Key": settings.quantum_api_key, "Accept": "application/json"}


def _news_base_url() -> str:
    from core.config import settings
    return settings.quantum_api_base_url.rstrip("/")


def query_news_db(
    keyword: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    source: Optional[str] = None,
    sort_by: Literal["published_at", "importance_score"] = "published_at",
    page: int = 1,
    page_size: int = 20,
) -> str:
    """
    从量子新闻数据库中检索新闻（结构化过滤）。优先使用此工具，覆盖中文量子赛道资讯。

    适合场景：
    - 查询某个时间段的新闻（用 start_date/end_date）
    - 按公众号来源筛选（用 source，如 '量子大观' '华夏时报'）
    - 按关键词检索标题内容（用 keyword）
    - 翻页获取更多（用 page=2,3,...）

    Args:
        keyword: 关键词，匹配标题/内容/技术方向（如 '本源量子' '量子纠错' '融资'）
        start_date: 起始日期，格式 yyyy-mm-dd（如 '2025-01-01'）
        end_date: 截止日期，格式 yyyy-mm-dd（如 '2025-12-31'）
        source: 公众号名称模糊匹配（如 '量子' '华夏时报'）
        sort_by: 排序方式 'published_at'（最新）或 'importance_score'（最重要）
        page: 页码，从 1 开始
        page_size: 每页条数，最大 100，建议 20-50

    Returns:
        新闻列表 JSON，含 title/source/published_at/source_url/summary/tech_direction/event_type
    """
    import httpx
    params: dict = {"sort_by": sort_by, "page": page, "page_size": page_size}
    if keyword:
        params["keyword"] = keyword
    if start_date:
        params["start_date"] = start_date
    if end_date:
        params["end_date"] = end_date
    if source:
        params["source"] = source
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
    通过自然语言语义向量检索量子新闻数据库，找到语义最相关的新闻。

    适合场景：
    - 关键词不确定、想找"相关"内容时（如 '量子计算商业化进展'）
    - 查询抽象概念或事件（如 '国内量子公司IPO动态'）
    - keyword 过滤结果太少时，用语义补充

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
