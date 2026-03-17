"""News, funding, and web-search tools used by the research agents."""
from __future__ import annotations

import concurrent.futures
import importlib
import json
import logging
import os
from datetime import date, timedelta
from typing import Literal, Optional

import httpx

logger = logging.getLogger(__name__)

_TOPIC = Literal["general", "news", "finance"]
_TIME_RANGE = Literal["day", "week", "month", "year", "d", "w", "m", "y"]


def _resolve_tavily_api_key() -> str:
    from core.config import settings

    api_key = (settings.tavily_api_key or os.environ.get("TAVILY_API_KEY", "")).strip()
    if api_key:
        os.environ.setdefault("TAVILY_API_KEY", api_key)
    return api_key


def _get_tavily_client() -> tuple[object | None, str | None]:
    api_key = _resolve_tavily_api_key()
    if not api_key:
        return None, "missing_api_key"

    try:
        tavily_module = importlib.import_module("tavily")
        tavily_client = getattr(tavily_module, "TavilyClient")
        return tavily_client(api_key=api_key), None
    except ImportError:
        logger.warning("tavily-python package is not installed; Tavily web search is unavailable")
        return None, "missing_package"
    except Exception as exc:
        logger.exception("failed to initialize Tavily client: %s", exc)
        return None, f"init_error:{exc}"


def _search_web_unavailable_message(error_code: str | None) -> str:
    if error_code == "missing_api_key":
        return "Tavily API Key 未配置，无法搜索实时内容。请在 .env 中设置 TAVILY_API_KEY"
    if error_code == "missing_package":
        return "Tavily 搜索依赖未安装，无法搜索实时内容。请在后端环境中安装 tavily-python"
    if error_code and error_code.startswith("init_error:"):
        return f"Tavily 初始化失败：{error_code.split(':', 1)[1]}"
    return "Tavily 搜索当前不可用，请检查后端配置"


def search_web(
    query: str,
    topic: _TOPIC = "news",
    days: Optional[int] = 30,
    max_results: int = 8,
    time_range: Optional[_TIME_RANGE] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search_depth: Literal["basic", "advanced"] = "basic",
    include_answer: bool = False,
) -> str:
    """Search the open web via Tavily and return a compact JSON payload."""
    client, client_error = _get_tavily_client()
    if client is None:
        return _search_web_unavailable_message(client_error)

    params = {
        "query": query,
        "max_results": max(1, min(max_results, 20)),
        "topic": topic,
        "search_depth": search_depth,
        "include_answer": include_answer,
    }
    if time_range:
        params["time_range"] = time_range
    else:
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        if days is not None and topic == "news" and not start_date and not end_date:
            params["days"] = max(1, days)

    try:
        try:
            result = client.search(**params)
        except TypeError:
            fallback = {
                "query": query,
                "max_results": max(1, min(max_results, 10)),
                "topic": topic,
                "include_answer": include_answer,
            }
            if days is not None and topic == "news":
                fallback["days"] = max(1, days)
            result = client.search(**fallback)
        simplified = {
            "answer": result.get("answer", ""),
            "results": [
                {
                    "title": row.get("title"),
                    "url": row.get("url"),
                    "published_date": row.get("published_date"),
                    "content": row.get("content", "")[:400],
                    "score": round(row.get("score", 0), 3),
                }
                for row in result.get("results", [])
            ],
        }
        return json.dumps(simplified, ensure_ascii=False, indent=2)
    except Exception as exc:
        logger.error("search_web failed: %s", exc)
        return f"Error: {exc}"


def search_web_batch(
    queries: list[str],
    topic: _TOPIC = "news",
    days: Optional[int] = 30,
    max_results: int = 5,
    time_range: Optional[_TIME_RANGE] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search_depth: Literal["basic", "advanced"] = "basic",
) -> str:
    """Run several Tavily searches in parallel and group the results by query."""
    cleaned_queries = [query.strip() for query in queries if query and query.strip()]
    if not cleaned_queries:
        return "Error: queries 不能为空"

    limited_queries = cleaned_queries[:6]
    workers = min(len(limited_queries), 4)

    def _run(single_query: str) -> dict:
        payload = search_web(
            query=single_query,
            topic=topic,
            days=days,
            max_results=max_results,
            time_range=time_range,
            start_date=start_date,
            end_date=end_date,
            search_depth=search_depth,
            include_answer=False,
        )
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            parsed = {"error": payload, "results": []}
        return {"query": single_query, **parsed}

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        grouped = list(executor.map(_run, limited_queries))

    return json.dumps({"topic": topic, "queries": grouped}, ensure_ascii=False, indent=2)


def recent_date_window(days_back: int = 90) -> str:
    """Return a recent date window JSON string for precise search filtering."""
    days_back = max(1, days_back)
    end = date.today()
    start = end - timedelta(days=days_back)
    return json.dumps(
        {"start_date": start.isoformat(), "end_date": end.isoformat(), "days_back": days_back},
        ensure_ascii=False,
    )


def _news_headers() -> dict:
    from core.config import settings

    return {"X-API-Key": settings.quantum_api_key, "Accept": "application/json"}


def _news_base_url() -> str:
    from core.config import settings

    base = settings.quantum_api_base_url.rstrip("/")
    return base if base.endswith("/api") else f"{base}/api"


def _news_path() -> str:
    from core.config import settings

    path = (settings.quantum_api_news_path or "/news").strip()
    return path if path.startswith("/") else f"/{path}"


def _news_search_path() -> str:
    from core.config import settings

    path = (settings.quantum_api_news_search_path or "/news/search").strip()
    return path if path.startswith("/") else f"/{path}"


def query_news_db(
    source: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> str:
    """Query the private news database by structured filters."""
    if not source:
        return "Error: query_news_db 需要 source 参数；语义检索请使用 semantic_search_news"

    params: dict[str, object] = {"page": page, "page_size": page_size, "source": source}
    if start_date:
        params["start_date"] = start_date
    if end_date:
        params["end_date"] = end_date

    try:
        response = httpx.get(
            f"{_news_base_url()}{_news_path()}",
            params=params,
            headers=_news_headers(),
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
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
            if item.get("title") and not item.get("title", "").startswith('"')
        ]
        return json.dumps(
            {"total": data.get("total", len(simplified)), "page": page, "news": simplified},
            ensure_ascii=False,
            indent=2,
        )
    except Exception as exc:
        logger.error("query_news_db failed: %s", exc)
        return f"Error: {exc}"


def semantic_search_news(query: str, top_k: int = 8) -> str:
    """Run semantic search over the private news database."""
    if not query.strip():
        return "Error: query 不能为空"

    try:
        response = httpx.post(
            f"{_news_base_url()}{_news_search_path()}",
            json={"query": query, "top_k": top_k},
            headers={**_news_headers(), "Content-Type": "application/json"},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
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
            ensure_ascii=False,
            indent=2,
        )
    except Exception as exc:
        logger.error("semantic_search_news failed: %s", exc)
        return f"Error: {exc}"
