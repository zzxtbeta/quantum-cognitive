from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx


def _load_env_from_file(env_path: Path) -> None:
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def _normalize_base_url(raw: str) -> str:
    base = raw.rstrip("/")
    return base if base.endswith("/api") else f"{base}/api"


def _brief(obj: Any, max_len: int = 220) -> str:
    text = json.dumps(obj, ensure_ascii=False)
    return text if len(text) <= max_len else text[:max_len] + "..."


def _env_path(name: str, default: str) -> str:
    raw = (os.getenv(name) or default).strip()
    return raw if raw.startswith("/") else f"/{raw}"


def test_papers(
    client: httpx.Client,
    base_url: str,
    headers: dict[str, str],
    papers_search_path: str,
    papers_method: str,
    papers_sort_by: str,
    papers_sort_order: str,
    papers_include_stats: str,
) -> tuple[bool, str]:
    if papers_method == "GET":
        r = client.get(
            f"{base_url}{papers_search_path}",
            headers={"X-API-Key": headers["X-API-Key"]},
            params={
                "query": "超导量子比特纠错",
                "page": 1,
                "page_size": 2,
                "sort_by": papers_sort_by,
                "sort_order": papers_sort_order,
                "include_stats": papers_include_stats,
            },
        )
    else:
        payload = {"query": "超导量子比特纠错", "top_k": 2}
        r = client.post(f"{base_url}{papers_search_path}", headers=headers, json=payload)
    r.raise_for_status()
    data = r.json()
    sample = (data.get("data") or [{}])[0]
    return True, f"status={r.status_code}, sample={_brief({'title': sample.get('title'), 'doi': sample.get('doi'), 'arxiv_id': sample.get('arxiv_id')})}"


def test_people(client: httpx.Client, base_url: str, headers: dict[str, str], people_search_path: str) -> tuple[bool, str]:
    r = client.get(
        f"{base_url}{people_search_path}",
        headers={"X-API-Key": headers["X-API-Key"]},
        params={"name": "潘建伟", "page_size": 2},
    )
    r.raise_for_status()
    data = r.json()
    sample = (data.get("items") or [{}])[0]
    return True, f"status={r.status_code}, sample={_brief({'name': sample.get('name'), 'institution': (sample.get('current_institution') or {}).get('standardized_name')})}"


def test_news(client: httpx.Client, base_url: str, headers: dict[str, str], news_search_path: str) -> tuple[bool, str]:
    payload = {"query": "本源量子融资", "top_k": 2}
    r = client.post(f"{base_url}{news_search_path}", headers=headers, json=payload)
    r.raise_for_status()
    data = r.json()
    sample = (data.get("data") or [{}])[0]
    return True, f"status={r.status_code}, sample={_brief({'title': sample.get('title'), 'source': sample.get('source'), 'source_url': sample.get('source_url')})}"


def run() -> int:
    root = Path(__file__).resolve().parent
    _load_env_from_file(root / ".env")

    base_raw = os.getenv("QUANTUM_API_BASE_URL", "")
    api_key = os.getenv("QUANTUM_API_KEY", "")

    if not base_raw or not api_key:
        print("[ERROR] 缺少 QUANTUM_API_BASE_URL 或 QUANTUM_API_KEY")
        return 2

    base_url = _normalize_base_url(base_raw)
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
    papers_search_path = _env_path("QUANTUM_API_PAPERS_SEARCH_PATH", "/papers/search")
    papers_method = (os.getenv("QUANTUM_API_PAPERS_SEARCH_METHOD") or "POST").strip().upper()
    papers_method = papers_method if papers_method in {"GET", "POST"} else "POST"
    papers_sort_by = (os.getenv("QUANTUM_API_PAPERS_SORT_BY") or "year").strip()
    papers_sort_order = (os.getenv("QUANTUM_API_PAPERS_SORT_ORDER") or "desc").strip()
    papers_include_stats = (os.getenv("QUANTUM_API_PAPERS_INCLUDE_STATS") or "false").strip().lower()
    people_search_path = _env_path("QUANTUM_API_PEOPLE_SEARCH_PATH", "/people/search")
    news_search_path = _env_path("QUANTUM_API_NEWS_SEARCH_PATH", "/news/search")

    print(f"[INFO] base_url = {base_url}")
    print(
        "[INFO] paths = "
        f"papers_search={papers_search_path}, "
        f"people_search={people_search_path}, "
        f"news_search={news_search_path}"
    )
    print(
        "[INFO] papers_mode = "
        f"method={papers_method}, sort_by={papers_sort_by}, "
        f"sort_order={papers_sort_order}, include_stats={papers_include_stats}"
    )

    tests = [
        (
            "papers/search",
            lambda c, b, h: test_papers(
                c,
                b,
                h,
                papers_search_path,
                papers_method,
                papers_sort_by,
                papers_sort_order,
                papers_include_stats,
            ),
        ),
        ("people/search", lambda c, b, h: test_people(c, b, h, people_search_path)),
        ("news/search", lambda c, b, h: test_news(c, b, h, news_search_path)),
    ]

    failed = 0
    with httpx.Client(timeout=25) as client:
        for name, fn in tests:
            try:
                ok, detail = fn(client, base_url, headers)
                print(f"[PASS] {name}: {detail}")
                if not ok:
                    failed += 1
            except Exception as e:
                failed += 1
                print(f"[FAIL] {name}: {type(e).__name__}: {e}")

    print("-" * 72)
    print(f"[SUMMARY] total={len(tests)}, failed={failed}, success={len(tests) - failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(run())
