import json

from dagent.tools import papers_tools


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def test_semantic_search_papers_uses_small_default_top_k(monkeypatch):
    captured = {}

    def fake_post(url, json, headers, timeout):
        captured["url"] = url
        captured["json"] = json
        return _FakeResponse({"data": [{"title": "Quantum OS"}]})

    monkeypatch.setattr(papers_tools.httpx, "post", fake_post)
    monkeypatch.setattr(papers_tools, "_papers_method", lambda: "POST")

    payload = papers_tools.semantic_search_papers("quantum operating system")
    parsed = json.loads(payload)

    assert captured["url"].endswith(("/api/papers/search", "/api/papers"))
    assert captured["json"] == {"query": "quantum operating system", "top_k": 5}
    assert parsed["data"][0]["title"] == "Quantum OS"


def test_fetch_domain_tree_uses_default_no_filter_call(monkeypatch):
    captured = {}

    def fake_get(url, params, headers, timeout):
        captured["url"] = url
        captured["params"] = params
        return _FakeResponse(
            [
                {
                    "id": 1,
                    "name": "量子领域",
                    "level": "domain",
                    "parent_id": None,
                    "paper_count": 1200,
                    "children": [],
                }
            ]
        )

    monkeypatch.setattr(papers_tools.httpx, "get", fake_get)

    payload = papers_tools.fetch_domain_tree()
    parsed = json.loads(payload)

    assert captured["url"].endswith("/api/domains")
    assert captured["params"] == {"min_paper_count": 0}
    assert parsed["items"][0]["name"] == "量子领域"
