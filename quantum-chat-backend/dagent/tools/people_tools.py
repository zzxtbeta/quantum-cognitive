"""量子人才/团队数据工具 — 调用量子引擎 People API 或读取本地 JSON"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# 本地 fallback：quantum-engine 前端静态 JSON
_LOCAL_PEOPLE_JSON = (
    Path(__file__).parent.parent.parent.parent
    / "quantum-engine"
    / "public"
    / "data"
    / "people.json"
)


def _headers() -> dict:
    from core.config import settings
    return {"X-API-Key": settings.quantum_api_key}


def _base_url() -> str:
    from core.config import settings
    return settings.quantum_api_base_url.rstrip("/")


def _load_local_people() -> list[dict]:
    """加载本地 people.json 作为 fallback"""
    try:
        if _LOCAL_PEOPLE_JSON.exists():
            with open(_LOCAL_PEOPLE_JSON, encoding="utf-8") as f:
                data = json.load(f)
                # 兼容数组或带 researchers 字段的对象
                if isinstance(data, list):
                    return data
                return data.get("researchers", data.get("data", []))
    except Exception as e:
        logger.warning("加载本地 people.json 失败: %s", e)
    return []


def search_researchers(
    query: Optional[str] = None,
    institution: Optional[str] = None,
    research_direction: Optional[str] = None,
    title_level: Optional[str] = None,
    data_source: Optional[str] = None,
    limit: int = 20,
) -> str:
    """
    搜索量子赛道关键研究人员和团队信息。

    Args:
        query: 关键词，可搜索姓名，如 '潘建伟' '朱晓波'
        institution: 机构关键词，支持逗号分隔多个（OR逻辑），
                     如 '中国科学技术大学' 或 '清华大学,中科大'
        research_direction: 研究方向关键词，如 '量子通信','超导','量子纠错'
        title_level: 职称过滤，如 '教授','研究员','博士后'
        data_source: 数据源，可选 'seed_data'（完整字段）或 'tianyancha'
        limit: 返回数量上限

    Returns:
        研究人员列表 JSON，包含姓名、机构、职称、研究方向、简介摘要
    """
    # 先尝试调用远程 API：/people/search
    try:
        # institution 支持数组参数（OR 逻辑），用 list of tuples 传递
        param_list: list = [
            ("page", 1),
            ("page_size", limit),
        ]
        if data_source:
            param_list.append(("data_source", data_source))
        if query:
            param_list.append(("name", query))
        if institution:
            for inst in [i.strip() for i in institution.split(",") if i.strip()]:
                param_list.append(("institution", inst))
        if research_direction:
            param_list.append(("research_area", research_direction))
        if title_level:
            param_list.append(("position", title_level))

        resp = httpx.get(
            f"{_base_url()}/people/search",
            params=param_list,
            headers=_headers(),
            timeout=15,
        )
        if resp.status_code == 200:
            data = resp.json()
            # /people/search 返回 {"items": [...], "total": N, ...}
            researchers = data.get("items", []) if isinstance(data, dict) else data
            total = data.get("total", len(researchers)) if isinstance(data, dict) else len(researchers)
            return _format_researchers(researchers[:limit], total=total)
    except Exception as e:
        logger.info("远程 /people/search 不可达，使用本地数据: %s", e)

    # Fallback: 本地 people.json
    all_people = _load_local_people()
    if not all_people:
        return "暂无人才数据，请检查 people.json 或后端 API 配置"

    filtered = _filter_people(all_people, query, institution, research_direction, title_level)
    return _format_researchers(filtered[:limit])


def _filter_people(
    people: list[dict],
    query: Optional[str],
    institution: Optional[str],
    research_direction: Optional[str],
    title_level: Optional[str],
) -> list[dict]:
    result = []
    for p in people:
        text = json.dumps(p, ensure_ascii=False).lower()
        if query and query.lower() not in text:
            continue
        if institution and institution.lower() not in text:
            continue
        if research_direction and research_direction.lower() not in text:
            continue
        if title_level:
            level = p.get("titleNormalized") or p.get("title_level", "")
            if title_level.lower() not in level.lower():
                continue
        result.append(p)
    return result


def _format_researchers(researchers: list[dict], total: Optional[int] = None) -> str:
    simplified = []
    for r in researchers:
        # current_institution 可能是 null 或对象
        inst_obj = r.get("current_institution") or {}
        inst_name = (
            inst_obj.get("standardized_name")
            or inst_obj.get("name_cn")
            or inst_obj.get("name_en")
            or inst_obj.get("name")
        ) if isinstance(inst_obj, dict) else None
        simplified.append({
            "name": r.get("name"),
            "name_en": r.get("name_en"),
            "institution": inst_name,
            "position": r.get("position"),
            "department": r.get("department"),
            "email": r.get("email"),
            "research_areas": r.get("research_areas", []),
            "paper_count": r.get("paper_count"),
            "h_index": r.get("h_index"),
            "introduction_snippet": (r.get("introduction") or "")[:200],
            "data_source": r.get("data_source"),
        })
    result: dict = {"researchers": simplified}
    if total is not None:
        result["total"] = total
    return json.dumps(result, ensure_ascii=False, indent=2)


def get_researcher_detail(name: str) -> str:
    """
    获取特定量子研究人员的详细信息，包含教育背景、代表论文、研究团队。

    Args:
        name: 研究人员姓名（中文或英文）

    Returns:
        研究人员完整档案 JSON
    """
    try:
        resp = httpx.get(
            f"{_base_url()}/people/search",
            params={"name": name, "data_source": "seed_data", "page": 1, "page_size": 3},
            headers=_headers(),
            timeout=15,
        )
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("items", []) if isinstance(data, dict) else data
            if items:
                return json.dumps(items[0], ensure_ascii=False, indent=2)
    except Exception as e:
        logger.info("远程 /people/search 详情不可达: %s", e)

    # Fallback: 本地搜索
    all_people = _load_local_people()
    filtered = _filter_people(all_people, name, None, None, None)
    if filtered:
        return json.dumps(filtered[0], ensure_ascii=False, indent=2)
    return f"未找到研究人员: {name}"


def get_institution_researchers(institution: str, limit: int = 10) -> str:
    """
    获取特定机构的核心量子研究团队列表，用于分析机构实力。

    Args:
        institution: 机构名称，如 '中国科学技术大学','清华大学','北京量子信息科学研究院','浙江大学'
        limit: 返回数量上限

    Returns:
        该机构研究人员列表 JSON
    """
    return search_researchers(institution=institution, limit=limit)
