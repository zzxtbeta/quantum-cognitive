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
