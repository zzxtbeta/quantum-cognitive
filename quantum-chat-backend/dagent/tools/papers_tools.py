"""量子论文数据工具 — 调用量子引擎后端 API"""
from __future__ import annotations

import json
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


def _headers() -> dict:
    from core.config import settings
    return {"X-API-Key": settings.quantum_api_key, "Content-Type": "application/json"}


def _base_url() -> str:
    from core.config import settings
    return settings.quantum_api_base_url.rstrip("/")


def _extract_text(field, depth: str = "summary") -> Optional[str]:
    """research_problem / tech_route 是 {detail, summary} 结构"""
    if isinstance(field, dict):
        if depth == "detail":
            return field.get("detail") or field.get("summary")
        return field.get("summary") or field.get("detail")
    return field


def _extract_contributions(field, depth: str = "summary", max_items: int = 3) -> list:
    """key_contributions 是 [{detail, summary}] 结构"""
    if isinstance(field, list):
        result = []
        for kc in field[:max_items]:
            if isinstance(kc, dict):
                if depth == "detail":
                    result.append(kc.get("detail") or kc.get("summary"))
                else:
                    result.append(kc.get("summary") or kc.get("detail"))
            else:
                result.append(str(kc))
        return result
    return []


def search_papers(
    query: Optional[str] = None,
    domain_ids: Optional[str] = None,
    time_range: Optional[str] = None,
    influence_score_min: Optional[int] = None,
    page: int = 1,
    page_size: int = 50,
    sort_by: str = "publish_date",
    sort_order: str = "desc",
    depth: str = "summary",
) -> str:
    """
    搜索量子赛道顶刊顶会论文列表，支持分页读取全量数据库（共约460篇）。

    Args:
        query: 关键词搜索（可选），如 '量子纠错' '超导量子比特'
        domain_ids: 领域ID列表，逗号分隔，如 '1,2,10'（OR逻辑）
        time_range: 时间范围，可选 '1y'/'6m'/'3m'/'1m'；不传则返回全量
        influence_score_min: 最低影响力分数（大多数论文该字段为null，建议不传）
        page: 页码，从1开始。全库460篇，page_size=50时共约9页
        page_size: 每页数量，最大200，建议50-100以平衡深度与context长度
        sort_by: 排序字段，'publish_date'（默认）/'influence_score'/'title'
        sort_order: 排序方向，'desc' 或 'asc'
        depth: 字段提取深度。'summary'=简洁摘要（默认），'detail'=完整技术描述

    Returns:
        论文列表 JSON，含 total/page/pages/papers/statistics。
        papers 每条含 title/authors/publish_date/influence_score/
        research_problem/tech_route/key_contributions/domains/metrics
    """
    params: dict = {
        "page": page,
        "page_size": page_size,
        "sort_by": sort_by,
        "sort_order": sort_order,
        "include_stats": "true",
    }
    if time_range:
        params["time_range"] = time_range
    if influence_score_min is not None:
        params["influence_score_min"] = influence_score_min
    if domain_ids:
        params["domain_ids"] = domain_ids
    if query:
        params["query"] = query

    try:
        resp = httpx.get(
            f"{_base_url()}/papers",
            params=params,
            headers=_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        papers = data.get("papers", [])
        stats = data.get("statistics", {})
        total = data.get("total", 0)
        # 计算分页信息
        pages = (total + page_size - 1) // page_size if page_size > 0 else 1

        simplified = []
        for p in papers:
            metrics = p.get("metrics")
            simplified.append({
                "title": p.get("title"),
                "authors": [a["name"] for a in p.get("authors", [])[:4]],
                "publish_date": p.get("publish_date"),
                "influence_score": p.get("influence_score"),
                "research_problem": _extract_text(p.get("research_problem"), depth),
                "tech_route": _extract_text(p.get("tech_route"), depth),
                "key_contributions": _extract_contributions(
                    p.get("key_contributions"), depth,
                    max_items=5 if depth == "detail" else 3
                ),
                "domains": [d["name"] for d in p.get("domains", [])],
                "metrics": (metrics[:5] if isinstance(metrics, list) else None),
            })
        return json.dumps({
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": pages,
            "depth": depth,
            "papers": simplified,
            "statistics": stats,
        }, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error("search_papers 失败: %s", e)
        return json.dumps({"error": str(e), "papers": [], "total": 0}, ensure_ascii=False)


def batch_scan_papers(
    domain_ids: Optional[str] = None,
    query: Optional[str] = None,
    pages_to_scan: int = 2,
    page_size: int = 60,
    depth: str = "detail",
) -> str:
    """
    批量扫描量子论文数据库，跨多页深度读取，适合系统性技术情报综合分析。
    总共可覆盖约460篇论文，建议对重点领域进行3-5页深度扫描。

    使用策略：
    - 先用 get_domain_tree 确认感兴趣的 domain_ids
    - 按赛道拆分：超导(domain_ids='1')、离子阱('2')、光子('3')、通信('5')等
    - 每次扫描一个赛道，pages_to_scan=3 可覆盖该赛道大部分论文
    - 将多次扫描结果综合分析

    Args:
        domain_ids: 领域ID，建议单领域扫描以保证深度，如 '1' '2' '1,2'
        query: 关键词过滤（可选），进一步聚焦
        pages_to_scan: 扫描页数，建议2-5页（每页60篇 × 3页 = 180篇）
        page_size: 每页论文数，建议50-80
        depth: 'detail' 提取完整技术描述（推荐），'summary' 提取摘要

    Returns:
        聚合结构，含 domain_summary（各领域核心成果统计）、
        tech_routes（技术路线分布）、key_papers（高影响力论文）、
        research_themes（研究主题聚类）、raw_papers（原始列表）
    """
    all_papers = []
    total = 0

    for page_num in range(1, pages_to_scan + 1):
        try:
            result_json = search_papers(
                domain_ids=domain_ids,
                query=query,
                page=page_num,
                page_size=page_size,
                sort_by="influence_score",
                sort_order="desc",
                depth=depth,
            )
            result = json.loads(result_json)
            if "error" in result:
                break
            total = result.get("total", 0)
            batch = result.get("papers", [])
            if not batch:
                break
            all_papers.extend(batch)
            logger.info("batch_scan_papers: page=%d, fetched=%d, total_so_far=%d",
                        page_num, len(batch), len(all_papers))
        except Exception as e:
            logger.error("batch_scan_papers page %d 失败: %s", page_num, e)
            break

    # 汇总分析
    tech_routes: dict[str, int] = {}
    research_themes: dict[str, int] = {}
    domain_count: dict[str, int] = {}

    for p in all_papers:
        # 统计领域分布
        for d in (p.get("domains") or []):
            domain_count[d] = domain_count.get(d, 0) + 1
        # 统计技术路线关键词
        tr = p.get("tech_route") or ""
        for kw in ["超导", "离子阱", "光子", "中性原子", "拓扑", "纠错", "QKD", "量子存储",
                   "表面码", "Kitaev", "硅量子点", "NV色心"]:
            if kw.lower() in tr.lower():
                tech_routes[kw] = tech_routes.get(kw, 0) + 1
        # 统计研究问题主题
        rp = p.get("research_problem") or ""
        for kw in ["相干时间", "保真度", "纠错", "量子体积", "逻辑量子比特",
                   "量子优势", "NISQ", "容错", "量子密钥", "量子中继"]:
            if kw.lower() in rp.lower():
                research_themes[kw] = research_themes.get(kw, 0) + 1

    # 筛选高影响力论文（前20）
    key_papers = sorted(
        [p for p in all_papers if p.get("influence_score")],
        key=lambda x: x.get("influence_score", 0),
        reverse=True,
    )[:20]

    return json.dumps({
        "scan_summary": {
            "total_in_db": total,
            "pages_scanned": pages_to_scan,
            "papers_fetched": len(all_papers),
            "domain_ids_scanned": domain_ids or "all",
        },
        "domain_distribution": dict(sorted(domain_count.items(), key=lambda x: -x[1])[:15]),
        "tech_route_keywords": dict(sorted(tech_routes.items(), key=lambda x: -x[1])),
        "research_themes": dict(sorted(research_themes.items(), key=lambda x: -x[1])),
        "key_papers_top20": key_papers,
        "all_papers_count": len(all_papers),
        "all_papers": all_papers,
    }, ensure_ascii=False, indent=2)


def analyze_quantum_theme(
    theme: str,
    domain_ids: str,
    max_papers: int = 80,
) -> str:
    """
    对指定量子研究主题进行深度分析，生成技术演进报告（含技术路线、关键突破、指标趋势）。
    建议配合 batch_scan_papers 使用以获取完整数据。

    Args:
        theme: 研究主题名称，如 '量子纠错' '量子通信' '量子传感'
        domain_ids: 相关领域IDs，逗号分隔，如 '1,2,10'
        max_papers: 分析论文数量上限，建议50-100

    Returns:
        结构化分析报告，包含技术路线、关键突破论文、性能指标演进、总结
    """
    try:
        # 使用 batch_scan_papers 获取更全面的数据
        pages = max(1, min(max_papers // 60, 5))
        scan_json = batch_scan_papers(
            domain_ids=domain_ids,
            pages_to_scan=pages,
            page_size=min(max_papers, 80),
            depth="detail",
        )
        scan_data = json.loads(scan_json)
        summary = scan_data.get("scan_summary", {})
        return json.dumps({
            "theme": theme,
            "total_papers_in_db": summary.get("total_in_db", 0),
            "papers_analyzed": summary.get("papers_fetched", 0),
            "tech_routes": scan_data.get("tech_route_keywords", {}),
            "research_themes": scan_data.get("research_themes", {}),
            "domain_distribution": scan_data.get("domain_distribution", {}),
            "key_papers": scan_data.get("key_papers_top20", [])[:15],
            "statistics": {},
        }, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error("analyze_quantum_theme 失败: %s", e)
        return json.dumps({"error": str(e), "theme": theme, "summary": "数据源暂时不可达，请基于已有上下文回答"}, ensure_ascii=False)


def get_domain_tree(level: Optional[str] = None) -> str:
    """
    获取量子赛道三层领域体系（domain→direction→technology），
    用于了解量子赛道的整体分类结构和各领域论文规模。

    Args:
        level: 只获取指定层级，可选 'domain','direction','technology'，为空则返回完整树

    Returns:
        领域层级树 JSON，包含ID、名称、层级、论文数量
    """
    params = {}
    if level:
        params["level"] = level
    try:
        resp = httpx.get(
            f"{_base_url()}/gold/domains",
            params=params,
            headers=_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        return json.dumps(resp.json(), ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error("get_domain_tree 失败: %s", e)
        return json.dumps({"error": str(e), "domains": []}, ensure_ascii=False)
