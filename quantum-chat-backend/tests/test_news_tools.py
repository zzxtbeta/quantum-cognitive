import json

from dagent.tools import news_tools


class _FakeClient:
    def __init__(self):
        self.calls = []

    def search(self, **kwargs):
        self.calls.append(kwargs)
        return {
            "answer": "",
            "results": [
                {
                    "title": "Example",
                    "url": "https://example.com",
                    "published_date": "2026-03-17",
                    "content": "sample",
                    "score": 0.91,
                }
            ],
        }


def test_search_web_prefers_precise_date_filters(monkeypatch):
    client = _FakeClient()
    monkeypatch.setattr(news_tools, "_get_tavily_client", lambda: (client, None))

    payload = news_tools.search_web(
        query="quantum funding",
        topic="finance",
        days=365,
        start_date="2025-12-17",
        end_date="2026-03-17",
        include_answer=False,
    )

    parsed = json.loads(payload)

    assert parsed["results"][0]["url"] == "https://example.com"
    assert client.calls[0]["start_date"] == "2025-12-17"
    assert client.calls[0]["end_date"] == "2026-03-17"
    assert "days" not in client.calls[0]


def test_search_web_batch_groups_results_by_query(monkeypatch):
    monkeypatch.setattr(
        news_tools,
        "search_web",
        lambda query, **kwargs: json.dumps(
            {
                "answer": "",
                "results": [{"title": query, "url": f"https://example.com/{query}"}],
            },
            ensure_ascii=False,
        ),
    )

    payload = news_tools.search_web_batch(
        queries=["中文融资", "english funding"],
        topic="finance",
        start_date="2025-12-17",
        end_date="2026-03-17",
    )
    parsed = json.loads(payload)

    assert parsed["topic"] == "finance"
    assert len(parsed["queries"]) == 2
    assert parsed["queries"][0]["results"][0]["title"] in {"中文融资", "english funding"}


def test_search_web_reports_missing_package(monkeypatch):
    monkeypatch.setattr(news_tools, "_get_tavily_client", lambda: (None, "missing_package"))

    payload = news_tools.search_web(query="latest quantum funding")

    assert "tavily-python" in payload


def test_search_web_reports_missing_api_key(monkeypatch):
    monkeypatch.setattr(news_tools, "_get_tavily_client", lambda: (None, "missing_api_key"))

    payload = news_tools.search_web(query="latest quantum funding")

    assert "TAVILY_API_KEY" in payload


def test_recent_date_window_is_precise(monkeypatch):
    class _FakeDate:
        @staticmethod
        def today():
            class _Today:
                @staticmethod
                def isoformat():
                    return "2026-03-17"

                def __sub__(self, delta):
                    assert delta.days == 30

                    class _Earlier:
                        @staticmethod
                        def isoformat():
                            return "2026-02-15"

                    return _Earlier()

            return _Today()

    monkeypatch.setattr(news_tools, "date", _FakeDate)

    payload = news_tools.recent_date_window(days_back=30)
    parsed = json.loads(payload)

    assert parsed == {
        "start_date": "2026-02-15",
        "end_date": "2026-03-17",
        "days_back": 30,
    }


def test_fetch_latest_company_promotions_returns_compact_payload(monkeypatch):
    class _FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "source_object_id": "source-1",
                "source_processed_at": "2026-03-17T14:03:10Z",
                "total_companies": 1,
                "total_news_links": 2,
                "items": [
                    {
                        "company_id": 2281,
                        "name": "杭州珑枢科技有限公司",
                        "credit_code": "91330110MAK6XKT087",
                        "legal_person_name": "池得閤",
                        "promoted_at": "2026-03-17T14:26:53.789448",
                        "news_count": 1,
                        "news_items": [
                            {
                                "news_id": 4898,
                                "title": "剑桥大学博士在杭州兴起量子风暴",
                                "uri": "https://mp.weixin.qq.com/s/demo",
                                "website": "微信公众号湖畔自留田",
                                "rtm": "2026-01-19",
                            }
                        ],
                    }
                ],
            }

    monkeypatch.setattr(news_tools.httpx, "get", lambda *args, **kwargs: _FakeResponse())

    payload = news_tools.fetch_latest_company_promotions()
    parsed = json.loads(payload)

    assert parsed["total_companies"] == 1
    assert parsed["items"][0]["name"] == "杭州珑枢科技有限公司"
    assert parsed["items"][0]["news_items"][0]["uri"] == "https://mp.weixin.qq.com/s/demo"
