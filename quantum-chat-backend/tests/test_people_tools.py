import json

from dagent.tools import people_tools


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def test_search_institutions_returns_compact_summaries(monkeypatch):
    captured = {}

    def fake_get(url, params, headers, timeout):
        captured["url"] = url
        captured["params"] = params
        captured["headers"] = headers
        captured["timeout"] = timeout
        return _FakeResponse(
            {
                "total": 1,
                "items": [
                    {
                        "institution_id": 4,
                        "display_name": "北京量子信息科学研究院",
                        "standardized_name": "北京量子信息科学研究院",
                        "institution_type": "research_institute",
                        "institution_type_label": "研究所",
                        "country": "中国",
                        "region": "北京",
                        "member_count": 12,
                        "paper_count": 34,
                        "extra": "ignored",
                    }
                ],
            }
        )

    monkeypatch.setattr(people_tools.httpx, "get", fake_get)

    payload = people_tools.search_institutions(
        keyword="量子",
        institution_type="research_institute",
        country="中国",
        page=2,
        page_size=5,
    )
    parsed = json.loads(payload)

    assert captured["url"].endswith("/api/institutions/search")
    assert captured["params"] == {
        "page": 2,
        "page_size": 5,
        "keyword": "量子",
        "institution_type": "research_institute",
        "country": "中国",
    }
    assert parsed["total"] == 1
    assert parsed["items"][0]["display_name"] == "北京量子信息科学研究院"
    assert "extra" not in parsed["items"][0]


def test_search_researchers_requires_filter():
    payload = people_tools.search_researchers()

    assert "requires at least one of institution or name" in payload


def test_search_researchers_simplifies_people_response(monkeypatch):
    def fake_get(url, params, headers, timeout):
        return _FakeResponse(
            {
                "total": 1,
                "items": [
                    {
                        "name": "潘建伟",
                        "name_en": "Jian-Wei Pan",
                        "position": "教授",
                        "department": "物理学院",
                        "email": "test@example.com",
                        "research_areas": ["量子信息"],
                        "introduction": "A" * 500,
                        "current_institution": {
                            "standardized_name": "中国科学技术大学",
                        },
                    }
                ],
            }
        )

    monkeypatch.setattr(people_tools.httpx, "get", fake_get)

    payload = people_tools.search_researchers(
        institution=["中国科学技术大学", "USTC"],
        page_size=10,
    )
    parsed = json.loads(payload)

    assert parsed["total"] == 1
    assert parsed["items"][0]["institution"] == "中国科学技术大学"
    assert len(parsed["items"][0]["introduction_snippet"]) == 400
