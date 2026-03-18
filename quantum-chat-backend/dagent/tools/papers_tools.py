"""Paper and domain-map tools backed by the private Quantum API."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


def _headers() -> dict[str, str]:
    from core.config import settings

    return {
        "X-API-Key": settings.quantum_api_key,
        "Content-Type": "application/json",
    }


def _base_url() -> str:
    from core.config import settings

    base = settings.quantum_api_base_url.rstrip("/")
    return base if base.endswith("/api") else f"{base}/api"


def _normalized_path(value: str, default: str) -> str:
    path = (value or default).strip()
    return path if path.startswith("/") else f"/{path}"


def _papers_search_path() -> str:
    from core.config import settings

    return _normalized_path(settings.quantum_api_papers_search_path, "/papers/search")


def _papers_method() -> str:
    from core.config import settings

    method = (settings.quantum_api_papers_search_method or "POST").strip().upper()
    return method if method in {"GET", "POST"} else "POST"


def _domains_path() -> str:
    from core.config import settings

    return _normalized_path(getattr(settings, "quantum_api_domains_path", "/domains"), "/domains")


def semantic_search_papers(query: str, top_k: int = 5) -> str:
    """Search quantum papers with a small default top_k to reduce context pollution."""
    if not query.strip():
        return json.dumps({"error": "query is required", "data": []}, ensure_ascii=False)

    try:
        method = _papers_method()
        if method == "GET":
            from core.config import settings

            response = httpx.get(
                f"{_base_url()}{_papers_search_path()}",
                params={
                    "query": query,
                    "page": 1,
                    "page_size": top_k,
                    "sort_by": settings.quantum_api_papers_sort_by,
                    "sort_order": settings.quantum_api_papers_sort_order,
                    "include_stats": str(settings.quantum_api_papers_include_stats).lower(),
                },
                headers={"X-API-Key": _headers()["X-API-Key"]},
                timeout=30,
            )
        else:
            response = httpx.post(
                f"{_base_url()}{_papers_search_path()}",
                json={"query": query, "top_k": top_k},
                headers=_headers(),
                timeout=30,
            )

        response.raise_for_status()
        return json.dumps(response.json(), ensure_ascii=False, indent=2)
    except Exception as exc:
        logger.error("semantic_search_papers failed: %s", exc)
        return json.dumps({"error": str(exc), "data": []}, ensure_ascii=False)


def fetch_domain_tree(min_paper_count: int = 0) -> str:
    """Fetch the hierarchical domain tree for track-map / knowledge-graph style questions."""
    try:
        response = httpx.get(
            f"{_base_url()}{_domains_path()}",
            params={"min_paper_count": min_paper_count},
            headers={"X-API-Key": _headers()["X-API-Key"]},
            timeout=20,
        )
        response.raise_for_status()
        payload: Any = response.json()
        items = payload if isinstance(payload, list) else []
        return json.dumps(
            {
                "items": items,
                "min_paper_count": min_paper_count,
            },
            ensure_ascii=False,
            indent=2,
        )
    except Exception as exc:
        logger.error("fetch_domain_tree failed: %s", exc)
        return json.dumps({"items": [], "error": str(exc)}, ensure_ascii=False)
