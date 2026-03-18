"""People and institution tools backed by the private Quantum API."""
from __future__ import annotations

import json
import logging
from typing import Any, Optional, Union

import httpx

logger = logging.getLogger(__name__)


def _headers() -> dict[str, str]:
    from core.config import settings

    return {"X-API-Key": settings.quantum_api_key}


def _base_url() -> str:
    from core.config import settings

    base = settings.quantum_api_base_url.rstrip("/")
    return base if base.endswith("/api") else f"{base}/api"


def _normalized_path(value: str, default: str) -> str:
    path = (value or default).strip()
    return path if path.startswith("/") else f"/{path}"


def _people_search_path() -> str:
    from core.config import settings

    return _normalized_path(settings.quantum_api_people_search_path, "/people/search")


def _institutions_search_path() -> str:
    from core.config import settings

    return _normalized_path(
        settings.quantum_api_institutions_search_path,
        "/institutions/search",
    )


def _get_json(path: str, params: dict[str, Any]) -> dict[str, Any]:
    response = httpx.get(
        f"{_base_url()}{path}",
        params=params,
        headers=_headers(),
        timeout=15,
    )
    response.raise_for_status()
    payload = response.json()
    return payload if isinstance(payload, dict) else {"items": payload}


def search_institutions(
    keyword: str = "",
    institution_type: str = "",
    country: str = "",
    page: int = 1,
    page_size: int = 20,
) -> str:
    """Search compact institution summaries from the private Gold layer."""
    params: dict[str, Any] = {"page": page, "page_size": page_size}

    try:
        data = _get_json(_institutions_search_path(), params)
        items = data.get("items", [])
        total = data.get("total", len(items))
        simplified = [
            {
                "institution_id": item.get("institution_id"),
                "display_name": item.get("display_name"),
                "standardized_name": item.get("standardized_name"),
                "institution_type": item.get("institution_type"),
                "institution_type_label": item.get("institution_type_label"),
                "country": item.get("country"),
                "region": item.get("region"),
                "member_count": item.get("member_count"),
                "paper_count": item.get("paper_count"),
            }
            for item in items
        ]
        return json.dumps(
            {
                "total": total,
                "page": page,
                "page_size": page_size,
                "items": simplified,
            },
            ensure_ascii=False,
            indent=2,
        )
    except Exception as exc:
        logger.error("search_institutions failed: %s", exc)
        return json.dumps({"error": str(exc), "items": []}, ensure_ascii=False)


def search_researchers(
    institution: Optional[Union[str, list[str]]] = None,
    name: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> str:
    """Search researchers by institution aliases or exact person name."""
    if not institution and not name:
        return (
            "Error: search_researchers requires at least one of institution or name. "
            "Call search_institutions first when the institution coverage is unclear."
        )

    params: dict[str, Any] = {"page": page, "page_size": page_size}
    if institution:
        params["institution"] = institution if isinstance(institution, list) else [institution]
    if name:
        params["name"] = name

    try:
        data = _get_json(_people_search_path(), params)
        items = data.get("items", [])
        total = data.get("total", len(items))
        simplified = []
        for row in items:
            institution_obj = row.get("current_institution") or {}
            institution_name = None
            if isinstance(institution_obj, dict):
                institution_name = (
                    institution_obj.get("standardized_name")
                    or institution_obj.get("name_cn")
                    or institution_obj.get("name_en")
                    or institution_obj.get("name")
                )
            simplified.append(
                {
                    "name": row.get("name"),
                    "name_en": row.get("name_en"),
                    "institution": institution_name,
                    "position": row.get("position"),
                    "department": row.get("department"),
                    "email": row.get("email"),
                    "research_areas": row.get("research_areas", []),
                    "introduction_snippet": (row.get("introduction") or "")[:400],
                }
            )

        return json.dumps(
            {
                "total": total,
                "page": page,
                "page_size": page_size,
                "items": simplified,
            },
            ensure_ascii=False,
            indent=2,
        )
    except Exception as exc:
        logger.error("search_researchers failed: %s", exc)
        return json.dumps({"error": str(exc), "items": []}, ensure_ascii=False)
