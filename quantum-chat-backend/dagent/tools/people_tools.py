"""量子人才/团队数据工具 — 调用量子引擎 People API"""
from __future__ import annotations

import json
import logging
from typing import List, Optional, Union

import httpx

logger = logging.getLogger(__name__)


def _headers() -> dict:
    from core.config import settings
    return {"X-API-Key": settings.quantum_api_key}


def _base_url() -> str:
    from core.config import settings
    return settings.quantum_api_base_url.rstrip("/")


def search_researchers(
    institution: Optional[Union[str, List[str]]] = None,
    name: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> str:
    """
    查询量子赛道研究人员信息。支持两种模式（二选一）：

    **模式 A — 按机构查询**：institution=["..."] → 返回匹配机构的所有量子研究人员
    **模式 B — 按姓名查询**：name="王浩华" → 返回该人员详细信息

    ⚠️ 约束：
    - name 字段每次只传一个人名；需查多人时请并行发起多次独立调用
    - institution 与 name 不建议同时传（逻辑 AND，会过度限制结果）

    Args:
        institution: 机构名称。支持单个字符串或字符串列表，列表内多个关键词之间为 OR 关系。
            强烈建议同时传入全称/缩写/英文名，防止数据库充分匹配。
            示例：['中国科学技术大学', '中科大', 'USTC']
                  ['清华大学', 'THU', 'Tsinghua']
                  ['北京量子信息科学研究院']
        name: 研究人员姓名，中英文均可，每次仅传一人（如 '王浩华' 'Pan Jianwei'）
        page: 页码，从 1 开始
        page_size: 每页条数，默认 20，最大 100

    Returns:
        研究人员列表 JSON：{"total": N, "page": P, "page_size": S, "items": [...]}
        每条 item 含：name, name_en, institution, position, department,
        email, research_areas, introduction_snippet（前400字）
    """
    if not institution and not name:
        return (
            "Error: 必须提供 institution 或 name 其中一个参数。"
            "若两者均不传，后端 API 不报错但会返回全量 490+ 条无关数据，"
            "请先明确查询目标后再调用。"
        )
    params: dict = {"page": page, "page_size": page_size}
    if institution:
        # 支持单字符串和列表两种形式，httpx 会将列表传成多个相同名参数（OR 逻辑）
        params["institution"] = institution if isinstance(institution, list) else [institution]
    if name:
        params["name"] = name
    try:
        resp = httpx.get(
            f"{_base_url()}/people/search",
            params=params,
            headers=_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get("items", []) if isinstance(data, dict) else data
        total = data.get("total", len(items)) if isinstance(data, dict) else len(items)
        simplified = []
        for r in items:
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
                "introduction_snippet": (r.get("introduction") or "")[:400],
            })
        return json.dumps(
            {"total": total, "page": page, "page_size": page_size, "items": simplified},
            ensure_ascii=False, indent=2,
        )
    except Exception as e:
        logger.error("search_researchers 失败: %s", e)
        return json.dumps({"error": str(e), "items": []}, ensure_ascii=False)
