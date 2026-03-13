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


def test_papers(client: httpx.Client, base_url: str, headers: dict[str, str]) -> tuple[bool, str]:
    payload = {"query": "超导量子比特纠错", "top_k": 2}
    r = client.post(f"{base_url}/papers/search", headers=headers, json=payload)
    r.raise_for_status()
    data = r.json()
    sample = (data.get("data") or [{}])[0]
    return True, f"status={r.status_code}, sample={_brief({'title': sample.get('title'), 'doi': sample.get('doi'), 'arxiv_id': sample.get('arxiv_id')})}"


def test_people(client: httpx.Client, base_url: str, headers: dict[str, str]) -> tuple[bool, str]:
    r = client.get(
        f"{base_url}/people/search",
        headers={"X-API-Key": headers["X-API-Key"]},
        params={"name": "潘建伟", "page_size": 2},
    )
    r.raise_for_status()
    data = r.json()
    sample = (data.get("items") or [{}])[0]
    return True, f"status={r.status_code}, sample={_brief({'name': sample.get('name'), 'institution': (sample.get('current_institution') or {}).get('standardized_name')})}"


def test_news(client: httpx.Client, base_url: str, headers: dict[str, str]) -> tuple[bool, str]:
    payload = {"query": "本源量子融资", "top_k": 2}
    r = client.post(f"{base_url}/news/search", headers=headers, json=payload)
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

    print(f"[INFO] base_url = {base_url}")

    tests = [
        ("papers/search", test_papers),
        ("people/search", test_people),
        ("news/search", test_news),
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
